import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { DataService } from './data.service';

import { BehaviorSubject } from 'rxjs';
import * as D3 from 'd3';

import { LocationElement, FolderElement } from '../models';
import { product } from '../resources/util';
import * as git from '../resources/git';
import { ElementService } from './element.service';
import { Collection } from '../models/collection';

@Injectable()
export class GitService implements Resolve<any> {
  private collectionSubject: BehaviorSubject<Collection>;

  constructor(private elementService: ElementService, private db: DataService) {}

  async resolve(route: ActivatedRouteSnapshot) {
    this.collectionSubject = (<any>route.parent.data).job.collectionSubject;

    let job = this.collectionSubject.getValue();

    let gitdb = this.elementService.gitdb;
    let repo = this.elementService.repo;
    let db = this.db;

    let ref = await git.readRef(repo, job.shortname);

    if (ref) {
      let commit = await git.loadHashAs(repo, 'commit', ref);

      console.log('commit', commit);

      //let tree = await git.loadHashAs(repo, 'tree', commit.tree);

      let currentTree = await this.buildTree(job);
      console.log('tree', commit.tree, 'current', currentTree);
      return;
    }

    let treeHash = await this.buildTree(job);

    console.log('treeHash', treeHash);

    let commit = {
      author: {
        name: job.owner.username,
        email: job.owner.email
      },
      tree: treeHash,
      message: 'first'
    };
    let commitHash = await git.saveToHash(repo, 'commit', commit);

    await git.updateRef(repo, job.shortname, commitHash);
  }

  async buildTree(job) {
    let db = this.db;
    let repo = this.elementService.repo;

    // get root folders + descendants
    let rootFolders = await Promise.all(job.orderedFolders.map(id => db.folderElements.get({ id })));
    for(let i = 0, folder; folder = rootFolders[i], i < rootFolders.length; i++) {
      await this.elementService.resolveChildren(folder);
    }
    let rootFolderNodes = rootFolders.map(f => D3.hierarchy(f));

    // get locations based on intersection of folder types
    let locationIds = product(rootFolderNodes.map(rn => rn.descendants().map((n:any) => n.data.id)));
    let keyName = job.folders.order.length > 1 ? '[' + job.folders.order.map((n, i) => 'folder' + i).join('+') + ']' : 'folder0';
    let locations = (await Promise.all(locationIds.map(pair => db.locationElements.get({ [keyName] : pair })))).filter(l => !!l);


    // get children of those locations
    let rootChildren = (await Promise.all(locations.map((loc:any) => db.childElements.where('id').anyOf(loc.children).toArray()))).reduce((a, b) => a.concat(b), []);
    let childrenIds = rootChildren.map(c => c.id);
    let refIds = rootChildren.map(child => child.ref).filter((ref, i, arr) => !!ref && arr.indexOf(ref) == i);

    // get components of root children
    let rootComponents = await db.componentElements.where('id').anyOf(refIds).toArray();
    // TODO: get all descendant components and child elements
    let rootComponentNodes = (await Promise.all(rootComponents.map(this.elementService.resolveComponentChildren.bind(this.elementService)))).map((c:any) => D3.hierarchy(c, (n) => n.data ? n.data.children : n.children));

    // find unused child + component elements
    let unusedComponents = await db.componentElements.where({ collection: job.id }).filter(component => refIds.indexOf(component.id) == -1).toArray();
    if (unusedComponents.length) {
      console.warn('some components for this collection are unused');
    }
    let unusedChildren = await db.childElements.where({ collection: job.id }).filter(component => childrenIds.indexOf(component.id) == -1).toArray();

    // ready folder elements
    let folders = rootFolderNodes.map(n => n.descendants()).reduce((a, b) => a.concat(b)).map((n: any) => {
      let data = n.data
      data.children = data.children.map((child: any) => typeof child === 'string' ? child : child.id);
      if(!data.children.every(c => typeof c === 'string' && c !== '')) throw new Error('disfigured children!');
      return data;
    });
    let usedFolderIds = folders.map(f => f.id);

    // unused folders should error (only folders without parents should be roots)
    let unusedFolders = await db.folderElements.where({ collection: job.id }).filter(folder => usedFolderIds.indexOf(folder.id) == -1).toArray();
    if (unusedFolders.length) {
      console.warn('some folders for this collection are unused!');
    }

    // save unused components
    let components = rootComponents.map(c => c.clean()).concat(unusedComponents);
    // save unused children
    let children = rootChildren.map(c => c.clean()).concat(unusedChildren);

    /*
     * {
     *   'job.json' : ...
     *   'locations/' : ...
     *   'components/' : ...
     *   'folders/' : ...
     *   'children/' : ...
     * }
     */
    let baseTree = {};
    let jobText = JSON.stringify(job.clean());
    let jobHash = await git.saveToHash(repo, 'blob', jobText);
    baseTree['job.json'] = { hash: jobHash, mode: git.gitModes.file };
    // save folder tree
    let folderTree = {};
    for(let i = 0; i < folders.length; i++) {
      let folder = folders[i];
      let text = JSON.stringify(folder.clean());
      let hash = await git.saveToHash(repo, 'blob', text);
      folderTree[folder.id + '.json'] = { hash, mode: git.gitModes.file };
    }
    let folderHash = await git.saveToHash(repo, 'tree', folderTree);
    baseTree['folders'] = { hash: folderHash, mode: git.gitModes.tree };
    let locationTree = {};
    for(let i = 0; i < locations.length; i++) {
      let location: any = locations[i];
      let text = JSON.stringify(location.clean());
      let hash = await git.saveToHash(repo, 'blob', text);
      locationTree[location.id + '.json'] = { hash, mode: git.gitModes.file };
    }
    let locationHash = await git.saveToHash(repo, 'tree', locationTree);
    baseTree['locations'] = { hash: locationHash, mode: git.gitModes.tree };
    let componentTree = {};
    for(let i = 0; i < components.length; i++) {
      let component = components[i];
      let text = JSON.stringify(component.clean());
      let hash = await git.saveToHash(repo, 'blob', text);
      componentTree[component.id + '.json'] = { hash, mode: git.gitModes.file };
    }
    let componentHash = await git.saveToHash(repo, 'tree', componentTree);
    baseTree['components'] = { hash: componentHash, mode: git.gitModes.tree };
    let childTree = {};
    for(let i = 0; i < children.length; i++) {
      let child = children[i];
      let text = JSON.stringify(child.clean());
      let hash = await git.saveToHash(repo, 'blob', text);
      childTree[child.id + '.json'] = { hash, mode: git.gitModes.file };
    }
    let childHash = await git.saveToHash(repo, 'tree', childTree);
    baseTree['children'] = { hash: childHash, mode: git.gitModes.tree };
    let baseHash = await git.saveToHash(repo, 'tree', baseTree);

    // update job to latest tree state
    job.hash = baseHash;

    return baseHash;
  }
}
