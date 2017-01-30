import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

import {
  Subject,
  Observable,
  Subscription,
  BehaviorSubject,
  ReplaySubject
} from 'rxjs';

import {
  Repo,
  Commit,
  gitModes,
  createGitRepo,
  saveToHash,
  updateRef,
  loadHashAs,
  folderHashFromArray,
  readRef
} from '../resources/git';

import { product, initObjectStore } from '../resources/util';

// import { diff } from 'deep-diff';

import {
  ComponentElement,
  LocationElement,
  FolderElement,
  ChildElement,
  User,
  Collection,
  NestConfig
} from '../models';

import {
  DB_VERSION,
  DB_NAME,
  STORES,
  retrieveAllRecordsAs,
  retrieveRecordAs,
  saveRecordAs,
  saveRecordAsSubject,
  countRecords,
  retrieveRecordArray,
  retrieveUniqueId,
  removeRecord,
  removeRecordAs,
  retrieveRecordsInAs,
  retrieveRecordsAsWith
} from '../resources/indexedDB';

import { HierarchyNode, Nest } from 'd3';
import * as D3 from 'd3';

import { DataService } from './data.service';

import { ValidationError, NotImplementedError } from '../models/errors';

function applyMethod(method, val, test) {
  if(['includes', 'startsWith', 'endsWith'].indexOf(method) !== -1) {
    return (<any>String.prototype[method]).call(test, val);
  } else if (method === 'lessThan') {
    return !isNaN(test) && Number(test) < val;
  } else if (method === 'greaterThan') {
    return !isNaN(test) && Number(test) > val;
  } else if (method === 'equal') {
    return !isNaN(test) && Number(test) == val;
  } else {
    return true;
  }
}

/* useful
indexedDB.webkitGetDatabaseNames().onsuccess = (res) =>\
{console.log([].slice.call(res.target.result).forEach((e) => {indexedDB.deleteDatabase(e)}))}
*/

@Injectable()
export class ElementService implements Resolve<any> {
  repo: Repo;
  gitdb: IDBDatabase;
  prevDb: IDBDatabase;

  public isReady: BehaviorSubject<boolean> = new BehaviorSubject(false);

  public jobMap: any;
  public loaded: any = {};

  private _jobs: BehaviorSubject<Collection[]> = new BehaviorSubject([]);
  public jobs: Observable<Collection[]> = this._jobs.asObservable();
  public jobsSubject: BehaviorSubject<BehaviorSubject<Collection>[]>;

  private updateSubject: Subject<BehaviorSubject<any>[]> = new Subject(); // array of loaded elements
  private updateSubjectSub: Subscription;

  constructor(private db: DataService) { }

  // int db
  resolve(): Promise<any>|boolean {
    if (this.prevDb == null || this.gitdb == null) {
      return Promise.all([
        <any>initObjectStore(DB_NAME, DB_VERSION, STORES), // w/ <any> hack
        createGitRepo()
      ]).then(([store, {repo, gitdb}]) => {
        this.prevDb = store;
        this.repo = repo;
        this.gitdb = gitdb;
        this.isReady.next(true);
        this.init();
        return { store, repo };
      });
    } else {
      return Promise.resolve({ store: this.prevDb, repo: this.repo });
    }
  }

  /* return BehaviorSubject */
  // create job
  // create component
  // create child
  // create folder
  // load job
  // load component
  // load child
  // load folder
  /* Git */
  // save job
  //   add hash property to job/folder/location/child/component
  // load save
  init() {
    if(this.updateSubjectSub) throw new Error('already initialized');
    this.updateSubjectSub = this.updateSubject.switchMap(elements => {
      // if updateSubjct updated before finishing save bad things happen
      return Observable.never();
    }).subscribe();
  }

  getJobs(): Promise<Collection[]> {
    let db = this.db;
    return db.collections.toArray();
  }

  getJobStats(job) {
    console.log('job', job);
    let db = this.db;
    return Observable.create(subscriber => {
      db.transaction('r', db.componentElements, db.childElements, db.folderElements, () => {
        let res = {};
        return Promise.all([
          db.componentElements.where('collection').equals(job.id).count().then(n => subscriber.next(Object.assign(res, { components: n}))),
          db.childElements.where('collection').equals(job.id).count().then(n => subscriber.next(Object.assign(res, { children: n}))),
          db.folderElements.where('collection').equals(job.id).count().then(n => subscriber.next(Object.assign(res, { folders: n})))
        ]).then(() => subscriber.complete());
      });
    });
  }

  loadElement(_class, id?: string) {
    if ([LocationElement, ChildElement, ComponentElement, FolderElement, Collection].some(cnstr => _class instanceof cnstr)) {
      let id = _class.id;
      if (id in this.loaded) {
        return Promise.resolve(this.loaded[id]);
      }
      this.loaded[id] = new BehaviorSubject(_class);
      this.updateLoaded();
      return Promise.resolve(this.loaded[id]);

    } else {
      if (id in this.loaded) {
        return Promise.resolve(this.loaded[id]);
      }
      return retrieveRecordAs(this.prevDb, _class, id).then(result => {
        if (result == null) {
          throw new Error('element with that id (' + id + ') does not exist');
        }
        if(!(result instanceof _class)) throw new Error('invalid load');
        this.loaded[id] = new BehaviorSubject(result);
        this.updateLoaded();
        return this.loaded[id];
      });
    }
  }

  retrieveElement(_class, id: string|number) {
    return retrieveRecordAs(this.prevDb, _class, id);
  }

  loadJob(id: string): Promise<BehaviorSubject<Collection>> {
    if (id in this.loaded) {
      return Promise.resolve(this.loaded[id]);
    }
    let db = this.db;
    return db.collections.get({shortname: id}).then(job => {
      if (job !== null) {
        return job;
      }
      return db.collections.get({id}).then(job => {
        if (job == null) {
          throw new Error('there is no job with that id');
        }
        return job;
      });
    }).then(job => {
      this.loaded[job.id] = new BehaviorSubject(job);
      this.updateLoaded();
      return this.loaded[job.id];
    });
  }

  updateLoaded() {
    this.updateSubject.next(Object.keys(this.loaded).map(key => this.loaded[key]));
  }

  retrieveJob(id: string): Promise<Collection> {
    return retrieveRecordAs(this.prevDb, Collection, id).then(job => {
      if (job == null) { // check shortname too.  perhaps ugly
        return retrieveRecordAs(this.prevDb, Collection, id, 'shortname');
      }
      return job;
    });
  }

  retrieveAllLocations(job) {
    return retrieveAllRecordsAs(this.prevDb, LocationElement, IDBKeyRange.only(job.id), 'job');
  }

  retrieveComponent(id: string|number): Promise<ComponentElement> {
    return retrieveRecordAs(this.prevDb, ComponentElement, id);
  }

  retrieveChildElement(id: string|number): Promise<ChildElement> {
    return retrieveRecordAs(this.prevDb, ChildElement, id);
  }

  retrieveChildrenIn(ids: (string|number)[]): Promise<ChildElement[]> {
    return ids.length ? retrieveRecordsInAs(this.prevDb, ChildElement, ids) : Promise.resolve([]);
  }

  retrieveComponentsIn(ids: (string|number)[], prev={}): Promise<ComponentElement[]> {
    return ids.length ? retrieveRecordsInAs(this.prevDb, ComponentElement, ids).then((components:ComponentElement[]) => {
      let parents = {};
      components.forEach(component => Array.isArray(component.children) ? (<string[]>component.children).forEach(c => parents[c] = null) : null);
      return this.retrieveChildrenIn(Object.keys(parents)).then(arr => {
        arr.forEach(c => parents[c.id] = c);
        components.forEach(c => c.children = (<(string|number)[]>c.children).map(_c => typeof _c === 'string' ? parents[_c] : _c));
        return components;
      })
    }) : Promise.resolve([]);
  }

  retrieveLocationsWith(job:Collection, folderName:string, id:string) {
    let i = job.folders.order.indexOf(folderName);
    if(i == -1) throw new ValidationError('invalid folder name ' + folderName);

    let index = i == 0 ? 'folder1' : 'folder2';
    return retrieveAllRecordsAs(this.prevDb, LocationElement, IDBKeyRange.only(id), index);
  }

  retrieveLocation(id: string[]): Promise<LocationElement> {
    return retrieveRecordAs(this.prevDb, LocationElement, id, 'folders');
  }

  retrieveCollectionComponents(collection: Collection, limit?:number): Promise<ComponentElement[]> {
    return retrieveAllRecordsAs(this.prevDb, ComponentElement, IDBKeyRange.only(collection.id), 'job', limit);
  }

  createLocation(job, loc, children:(string|number)[] = []): Promise<LocationElement> {
    let folders = job.folders.order.map(name => loc[name] || job.folders.roots[name]);

    let _location = new LocationElement(
      undefined, // name
      undefined, // description
      job.id,
      children,
      folders
    );
    return saveRecordAs(this.prevDb, _location).then((locationId) => {
      _location.id = locationId;
      return _location;
    });
  }

  retrieveLocationOrCreate(job, folders, children = []): Promise<LocationElement> {
    return this.retrieveLocation(folders).then(loc => {
      if(loc) return loc;
      let ob = {};
      job.folders.order.forEach((name, i) => ob[name] = folders[i]);
      return this.createLocation(job, ob, children);
    });
  }

  createChildElement(
    job: Collection,
    componentId: string|number|ComponentElement,
    loc?,
    name?: string,
    description?: string,
    qty = 1 
  ): Promise<ChildElement> {
    let db = this.db;

    return db.transaction('rw', db.componentElements, db.childElements, async() => {
      let component;
      if (typeof componentId === 'string') {
        component = await this.retrieveComponent(componentId);
      } else if (component instanceof ComponentElement) {
        component = componentId;
      }
      if (component == null) {
        throw new ValidationError('cannot create child if component does not exist');
      }

      let child = new ChildElement(
        name || component.name,
        description || component.description,
        job.id,
        component.id,
        qty
      );

      child.id = await db.childElements.add(child);

      if (loc === undefined) {
        return child;

      }

      let folders = job.folders.order.map(name => loc[name] || job.folders.roots[name]);
      console.log('folders', folders)

      let location = await db.locationElements.get({folders: folders});
      if (location == null) {
        location = new LocationElement(
          undefined, // name
          undefined, // description
          job.id,
          [child.id],
          folders
        );
        location.id = await db.locationElements.add(location)

      } else {
        (<(string|number)[]>location.children).push(child.id);
        await db.locationElements.put(location.clean());
      }

      return child;
    });
  }

  createComponent(job, name, description, parentId?): Promise<ComponentElement> {
    let component = new (<any>ComponentElement)(
      name,
      description,
      Math.ceil(Math.random()*100000)/100, // sell
      Math.ceil(Math.random()*10000)/100,  // buy
      job.id, // job id
      [] // children
    );
    return Promise.all([
      saveRecordAs(this.prevDb, component),
      parentId ? retrieveRecordAs(this.prevDb, ComponentElement, parentId) : Promise.resolve(null)
    ]).then(([componentId, par]: [string, any]) => {
      component.id = componentId;
      if (par) {
        par.children = par.children || [];
        par.children.push(componentId);
        return saveRecordAs(this.prevDb, par);
      }
    }).then(() => {
      return component;
    });
  }

  createFolder(job, _type, name, description = '(no description)', children = [], parentId?): Promise<FolderElement> {
    let folder = new FolderElement(name, description, _type, job.id, children);

    let db = this.db;
    return db.transaction('rw', db.folderElements, async() => {
      folder.id = await db.folderElements.add(folder);

      if (parentId === undefined) {
        return folder;
      }

      let parentFolder = await db.folderElements.get(parentId);

      if(parentFolder == null) {
        throw new Error('parent folder with that id "'+parentId+'" does not exist');
      }

      parentFolder.children.push(folder.id);

      await db.folderElements.put(parentFolder.clean());

      return folder;
    });
  }

  createExampleElements(collection, n=4) {
    let arr = Array.from(Array(n).keys()); // array of length n;
    let db = this.db;

    return db.transaction('rw', db.folderElements, db.componentElements, db.childElements, db.locationElements, async() => {
        let folderTypes = Object.keys(collection.folders.roots);
        let folders = arr.map(i => new FolderElement(
          ['Example Folder ', i, ' (', folderTypes[i % folderTypes.length], ')'].join(''),
          'description',
          folderTypes[i % folderTypes.length],
          collection.id
        ));

        let components = arr.map(i => new (<any>ComponentElement)(
          'Example Component ' + (i + 1),
          'description',
          (Math.random()*100000)/100, // sell
          (Math.random()*10000)/100,  // buy
          collection.id, // collection id
          [] // children
        ));

        await Promise.all([
          Promise.all(folders.map(folder => db.folderElements.add(folder).then(id => folder.id = id))),
          Promise.all(components.map(component => db.componentElements.add(component).then(id => component.id = id)))
        ]);

        for(let i = 0; i < folderTypes.length; i++) {
          let type = folderTypes[i];
          let rootId = collection.folders.roots[type];
          let children = folders.filter(f => f.type == type).map(f => f.id);
          await db.folderElements.update(rootId, { children });
        }

        let children = components.map(component => arr.map(i => new ChildElement(
          component.name + ' (ChildElement '+(i+1)+')',
          component.description + ' (ChildElement '+(i+1)+')',
          collection.id,
          component.id,
          Math.ceil(Math.random()*10) // qty 1 - 10
        ))).reduce((a, b)=>a.concat(b));

        await Promise.all(children.map(child => db.childElements.add(child).then(id => child.id = id)));

        let groups = product(collection.folders.order.map(t => folders.filter((f:any) => f.type === t).map(f => f.id)));
        let copy = children.map(c => c.id);
        let s = Math.ceil(copy.length/groups.length);

        let locations = groups.map((pair, i) => {
          return new LocationElement(undefined, undefined, collection.id, copy.splice(0, s), pair);
        });

        let locationIds = await Promise.all(locations.map(location => db.locationElements.add(location).then(id => location.id = id)));

        return { folders, locations, children, components };
      }
    ).catch(err => {
      console.error(err);
      throw err;
    });
  }

  createJob(
    owner: User,
    shortname: string,
    name = 'New Job',
    description = '(no description)',
    folderNames = ['phase', 'building'],
    exampleElements = true
  ): BehaviorSubject<Collection> {
    // by default remove non-alphanumerics and shorten to < 50
    shortname = shortname || name.replace(' ', '_').replace(/[^\w-]/gi, '').substring(0, 50);
    let folderDefinition = { order: folderNames };

    let job = new Collection(
      name,
      description,
      owner,
      shortname,
      folderDefinition,
      'job'
    );

    let bs = new BehaviorSubject(job);

    let db = this.db;
    db.transaction('rw', db.collections, db.folderElements, db.componentElements, db.childElements, db.locationElements, async() => {
      if (!shortname) {
        throw new ValidationError('invalid shortname');
      }
      if (shortname.length < 4) {
        throw new ValidationError('shortname must be at least 4 characters long');
      }

      job.id = await db.collections.add(job);

      // save root folders
      let folders = await Promise.all(folderNames.map(type => this.createFolder(job, type, 'root')));

      job.folders.roots = {};
      folders.forEach(folder => job.folders.roots[folder.type] = folder.id);
      bs.next(job);

      // create example elements if
      if (exampleElements) {
        let elements = await this.createExampleElements(job)
        console.log('elements', elements);
      }

      // save job with updated folder roots
      await db.collections.put(job.clean())
      let jobs = this.jobsSubject.getValue();
      this.jobsSubject.next(jobs.concat(bs));
      bs.next(job);

    }).catch((err) => {
      bs.error(err);
    });

    return bs;
  }

  retrieveElementChildren(root, array = []): Promise<any[]> {
    if (!root.children || root.children.length === 0) {
      return Promise.resolve(array);
    }
    return Promise.all(root.children.map(id => retrieveRecordAs(this.prevDb, root.constructor, id).then(child => {
      if (array.indexOf(child) === -1) {
        array.push(child);
      }
      return this.retrieveElementChildren(child, array);
    }))).then(() => {
      return array;
    });
  }

  compareTree(a, b?) {
  }

  saveGitTree(collection: Collection) {
    let baseObj = {};

    // toJSON may be extraneous when using stringify
    let createJobHash = saveToHash(this.repo, 'blob', JSON.stringify(collection.toJSON())).then(hash => {
      baseObj['job.json'] = { mode: gitModes.file, hash: hash };
    });

    // get root+descendant folders, save in folders/phase, folders/building
    let roots = collection.folders.roots;
    let createFoldersTree = Promise.all(Object.keys(roots).map(name => {
      return retrieveRecordAs(this.prevDb, FolderElement, roots[name]).then(folder => {
        return this.retrieveElementChildren(folder).then(children => {
          return children.concat(folder);
        });
      }).then(folders => {
        return folderHashFromArray(this.repo, folders).then(hash => {
          return [name, hash];
        });
      });
    })).then(folderTrees => {
      let folderObj = {};
      folderTrees.forEach(([name, hash]) => {
        folderObj[name + 's'] = { mode: gitModes.tree, hash: hash };
      });
      return saveToHash(this.repo, 'tree', folderObj);
    }).then(hash => {
      baseObj[FolderElement.store] = { mode: gitModes.tree, hash: hash };
    });

    // get locations, save in locations/.  should eventually identify empty/unused
    let createLocationsTree = retrieveAllRecordsAs(this.prevDb, LocationElement, IDBKeyRange.only(collection.id), 'job').then(locations => {
      return folderHashFromArray(this.repo, locations).then(hash => {
        baseObj[LocationElement.store] = { mode: gitModes.tree, hash: hash };
      });
    });

    // gets complicated when multiple commits (different version, same id) are in db
    // should only grab objects without commits.  modifying objects should remove commit attribute
    let createComponentsTree = this.retrieveCollectionComponents(collection).then(components => {
      return folderHashFromArray(this.repo, components).then(hash => {
        baseObj[ComponentElement.store] = { mode: gitModes.tree, hash: hash };
      });
    });

    // build tree
    return Promise.all([
      createJobHash,
      createFoldersTree,
      createLocationsTree,
      createComponentsTree
    ]).then(() => {
      // save tree
      return saveToHash(this.repo, 'tree', baseObj);
    });
  }

  saveJob(collection: Collection, message): Promise<{ job: Collection, commit: Commit }> {
    return this.saveGitTree(collection).then(tree => {
      // save commit
      let commitObj = {
        author: collection.owner,
        tree,
        message,
        parents: []
      };
      collection.hash = tree;
      if (collection.commit) {
        commitObj.parents.push(collection.commit);
      }
      return saveToHash(this.repo, 'commit', commitObj);
    }).then(hash => {
      // update ref
      collection.commit = hash;
      return Promise.all(<any>[
        loadHashAs(this.repo, 'commit', hash),
        saveRecordAs(this.prevDb, collection),
        updateRef(this.repo, collection.shortname, hash)
      ]).then(([commit]:[any]) => {
        return {
          commit,
          job: collection
        };
      });
    });
  }

  removeJob(id: string): Promise<any> {
    if (id in this.loaded) {
      return removeRecordAs(this.prevDb, this.loaded[id].getValue()).then(res => {
        let arr = this.jobsSubject.getValue();
        let i = arr.indexOf(this.loaded[id]);
        if (i > -1) {
          arr.splice(i, 1);
          this.jobsSubject.next(arr);
        }
        delete this.loaded[id];
        return res;
      });
    }
    // this should almost never happen
    return removeRecord(this.prevDb, Collection.store, id);
  }

  aboutJob(job: Collection): Observable<any> {
    // count components / children / folders
    // get git save state
    let about = {};

    return Observable.create(subscriber => {
      // should also search history
      let ref = job.shortname;
      let isHeadCommit = readRef(this.repo, ref).then(commitHash => commitHash === job.commit).then(val => {
        about['isHead'] = val;
        subscriber.next(about);
      });
      let componentCount = countRecords(this.prevDb, ComponentElement.store, job.id, 'job').then(val => {
        about['components'] = val;
        subscriber.next(about);
      });
      let folderCount = countRecords(this.prevDb, FolderElement.store, job.id, 'job').then(val => {
        about['folders'] = val;
        subscriber.next(about);
      });
      Promise.all([
        isHeadCommit,
        componentCount,
        folderCount,
      ]).then(() => {
        subscriber.complete();
      }).catch(err => {
        subscriber.error(err);
      });
    }).debounceTime(100);
  }

  async resolveChildren(root: FolderElement|ComponentElement|LocationElement) {
    if(!root.children || !root.children.length) return root;
    let db = this.db;
    let children: any[] = root.children;
    let store = (<any>root.constructor).store;
    let table = db[store]; // i.e. folderElements, childElements
    for(let i = 0; i < children.length; i++) {
      if(typeof children[i] === 'string') { // child may have already been replaced with instance
        let child = await table.get(children[i]);
        children.splice(i, 1, child);
        await this.resolveChildren(child); // recurse
      }
    }
    return root;
  }

  async resolveComponentChildren(root: ComponentElement) {
    if(!root.children || !root.children.length) return root;
    let db = this.db;
    let children: any[] = root.children;
    let table = db.childElements;
    for(let i = 0; i < children.length; i++) {
      if (typeof children[i] === 'string') {
        let child = await table.get({ id: <string>children[i] });
        if (typeof child.ref === 'string') {
          child.data = await db.componentElements.get({ id: child.ref });
          await this.resolveComponentChildren(child.data);
        }
        children.splice(i, 1, child);
      }
    }
    return root;
  }

  async resolveChildElements(job: Collection, root: FolderElement|ComponentElement|ChildElement, maxDepth = 10) {
    if(maxDepth < 1) return root;
    let db = this.db;
    if (root instanceof FolderElement) {
      // get folder children and children of locations matching folder
      if(root.children && root.children.length) {
        root.children = (await db.folderElements
          .where('id')
          .anyOf(root.children.filter(c => typeof c === 'string'))
          .toArray()).concat(root.children.filter(c => typeof c !== 'string'))
      }

      let i = job.folders.order.indexOf(root.type);
      if (i == -1) throw new Error('invalid folder type for this job');
      let keyName = 'folder' + i;
      let locs = await db.locationElements
        .where({ [keyName]: root.id })
        .filter(loc => !!loc.children && !!loc.children.length)
        .toArray();
      let childIds: string[] = locs.map(loc => <string[]>loc.children).reduce((a, b) => a.concat(b), []);

      let children = await db.childElements.where('id').anyOf(childIds).toArray();

      root.children.push(...children);
      await Promise.all(root.children.map(child => this.resolveChildElements(job, child, maxDepth - 1)));

    } else if (root instanceof ChildElement) {
      // resolve data ref
      root.data = await db.componentElements.get(<any>root.ref);
      await this.resolveChildElements(job, root.data, maxDepth-1);

    } else if (root instanceof ComponentElement) {
      if(root.children && root.children.length) {
        root.children = (await db.childElements
          .where('id')
          .anyOf((<any[]>root.children).filter(c => typeof c === 'string'))
          .toArray()).concat((<any[]>root.children).filter(c => typeof c !== 'string'))
        await Promise.all(root.children.map(child => this.resolveChildElements(job, child, maxDepth - 1)));
      }
    }
    return root;
  }

  retrieveChildren(root) {
    return Promise.all(root.children.filter(c => typeof c === 'string').map((id, i) => retrieveRecordAs(this.prevDb, root.constructor, id).then(child => {
      root.children.splice(i, 1, child);
      return this.retrieveChildren(child);
    }))).then(() => root);
  }

  // TODO: check for loop
  retrieveChildChildren(rootId:string|ChildElement) {
    return (typeof rootId === 'string' ? this.retrieveChildElement(rootId) : Promise.resolve(rootId)).then((root:ChildElement) => {
      return this.retrieveComponent(root.ref).then(component => {
        root.data = component;
        return Promise.all((root.data.children || []).map(this.retrieveChildChildren.bind(this))).then((res) => {
          root.data.children = res;
          return root;
        });
      });
    });
  }

  // move child to specified location string or obj
  moveChildElement(job:Collection, child:ChildElement, loc: string[]|string|LocationElement|ComponentElement) {
    if(!(child instanceof ChildElement)) throw new Error('invalid child');
    // assumes that both elements exist
    let getCurrentLocation = Promise.all([
      retrieveRecordsAsWith(this.prevDb, LocationElement,         child.id, 'children'),
      retrieveRecordsAsWith(this.prevDb, ComponentElement, child.id, 'children')
    ])
    let getNewLocation = (Array.isArray(loc) ? this.retrieveLocationOrCreate(job, loc) : typeof loc === 'string' ? this.retrieveElement(ComponentElement, loc) : Promise.resolve(loc));
    
    return Promise.all([getCurrentLocation, getNewLocation]).then(([[locs, comps], location]:[[any, any], any]) => {
      if (locs.length == 0 && comps.length == 0) {
        // currently in neither
      } else if (locs.length == 1 && comps.length == 0) {
        // remove child from location children
        console.log('currently in folder');
        let loc = locs[0];
        // if it's already in the right location, dont do anything
        if(loc.id == location.id) return;
        let i = loc.children.indexOf(child.id);
        if(i == -1) throw new Error('weird shit');
        loc.children.splice(i, 1);
        // save location without child
      } else if (locs.length == 0 && comps.length == 1) {
        // remove child from component children
        console.log('currently in component');
        let comp = comps[0];
        let i = comp.children.indexOf(child.id);
        if(i == -1) throw new Error('weird shit');
        comp.children.splice(i, 1);
        // save component without child
      } else {
        console.log('locs', locs);
        throw new ValidationError('invalid state - child in more than one location/component');
      }
      let old = locs.concat(comps);

      if (!(location instanceof LocationElement || location instanceof ComponentElement)) throw new Error('invalid/nonexistant location/component');
      if (location.collection !== child.collection) throw new NotImplementedError('unsupported - must be of the same job');

      location.children = location.children || [];
      (<(string|number)[]>location.children).push(child.id);
      return Promise.all(old.concat(location).map(el => saveRecordAs(this.prevDb, el)));

    });
  }

  addChildElement(job, to, what) {
    if(to.id == what.id) return Promise.resolve();
    if(what.collection !== '' && what.collection !== job.id) throw new NotImplementedError('unsupported - clone child from second job');

    let getChildElement, getParent, getLocation;
    if (to instanceof ChildElement) {
      getParent = this.retrieveElement(to.constructor, to.id).then((par: ChildElement) => {
        return retrieveRecordAs(this.prevDb, ComponentElement, par.ref).then((comp:ChildElement) => {
          par.data = comp;
          return par;
        });
      });
    }
    if (to instanceof ComponentElement) {
      getParent = this.retrieveElement(to.constructor, to.id);
    }
    if (to instanceof FolderElement) {
      let determineFolders = (what.id !== '' ? retrieveRecordsAsWith(this.prevDb, LocationElement, what.id, 'children') : Promise.resolve([])).then(locs => {
        if(locs.length === 1) {
          let folders = locs[0].folders.slice()
          folders[job.folders.order.indexOf(to.type)] = to.id;
          return folders;
        }
        let folders = job.folders.order.map(name => job.folders.roots[name]);
        folders[job.folders.order.indexOf(to.type)] = to.id;
        return folders;
      });

      // load/create location with root folders except 'to' folder 
      getLocation = determineFolders.then(folders => this.retrieveLocationOrCreate(job, folders));
    }
    if (what instanceof FolderElement) {
      getChildElement = what.id !== '' ? this.retrieveElement(what.constructor, what.id) : this.createFolder(job, what.type, what.name, what.description, what.children);
    }
    if (what instanceof ChildElement) {
      getChildElement = what.id !== '' ? this.retrieveElement(what.constructor, what.id) : this.createChildElement(job, what.ref, undefined, what.name, what.description, what.qty);

    }
    if (what instanceof ComponentElement) {
      getChildElement = (what.id !== '' ? this.retrieveElement(what.constructor, what.id) : this.createComponent(job, what.name, what.description)).then((component: ComponentElement) => {
        return this.createChildElement(job, component.id, undefined, component.name, component.description, 1);
      });
    }
    if ((what instanceof ChildElement || what instanceof ComponentElement) && to instanceof FolderElement) {
      return Promise.all([getChildElement, getLocation]).then(([child, loc]: [any, any]) =>
        this.moveChildElement(job, child, loc));

    } else if (what instanceof ChildElement && to instanceof ChildElement) {
      if(what.id === to.id) return Promise.resolve(); // do nothing
      return Promise.all([getChildElement, getParent]).then(([child, parent]: [ChildElement, ChildElement]) => {
        let component = parent.data;
        return this.moveChildElement(job, child, component);
      });

    } else if ((what instanceof ChildElement || what instanceof ComponentElement) && to instanceof ComponentElement) {
      if(what.id === to.id) return Promise.resolve(); // do nothing
      return Promise.all([getChildElement, getParent]).then(([child, parent]) => {
        return this.moveChildElement(job, child, parent);
      });

    } else if (what instanceof FolderElement && to instanceof FolderElement) {
      return getChildElement.then((child:any) => {
        return retrieveRecordsAsWith(this.prevDb, FolderElement, <any>child.id, 'children').then((folders:any) => {
          to.children = to.children || [];
          to.children.push(child.id);

          if(folders.length == 1) {
            folders[0].children.splice(folders[0].children.indexOf(<any>child.id), 1)

            return <any>Promise.all([
              saveRecordAs(this.prevDb, folders[0]),
              saveRecordAs(this.prevDb, to)
            ]);
          } else if (folders.length == 0) {
            return <any>saveRecordAs(this.prevDb, to)

          } else {
            throw new ValidationError('invalid state - child in more than one folder');

          }
        });
      });

    } else {
      // invalid drop
      throw new ValidationError('invalid parent child combination');

    }
  }

  retrieveAllChildren(job, rootFolder) {
    // load folder tree
    let getFolderTree = this.retrieveChildren(rootFolder).then(() => {
      return D3.hierarchy(rootFolder)
    })
    // load locations for each folder in tree
    let i = job.folders.order.indexOf(rootFolder.type);
    if (i == -1) throw new ValidationError('invalid folder type for this job "'+rootFolder.type+'"');
    let getLocations: Promise<LocationElement[]> = getFolderTree.then(node => {
      let folderIds = node.descendants().map(f => f.data.id);
      let keyName = 'folder' + i;
      return retrieveRecordsInAs(this.prevDb, LocationElement, folderIds, keyName);
    });
    // load children of those locations
    let childrenToFolder = {};
    let getChildren = getLocations.then((locations:LocationElement[]) => {
      locations.forEach(loc => (<string[]>loc.children).forEach(cid => childrenToFolder[cid] = loc.folders[i]));
      return retrieveRecordsInAs(this.prevDb, ChildElement, Object.keys(childrenToFolder));
    });
    // load tree for each child
    let getChildrenChildren = getChildren.then((children:ChildElement[]) => {
      return Promise.all(children.map(child => this.retrieveChildChildren(child))).then(() => {
        let folderToChildren = {};
        children.forEach(child => {
          let f = childrenToFolder[child.id];
          let a = folderToChildren[f];
          if (a) {
            a.push(child)
          } else {
            folderToChildren[f] = [child];
          }
        });
        return folderToChildren;
      });
    });
    // load whole tree
    return getChildrenChildren.then(ob => {
      let node = D3.hierarchy(rootFolder, (d) => {
        if (d instanceof FolderElement) {
          let more = ob[d.id] || [];
          return d.children.concat(more);
        } else if (d instanceof ChildElement) {
          return d.data ? d.data.children : [];
        } else if (d instanceof ComponentElement) {
          return d.children;
        } else {
          console.error('unexpected type for', d);
          throw new ValidationError('unexpected type');
        }
      });
      return node;
    })
  }

  getContext(child: ChildElement|FolderElement) {
    let db = this.db;
    if (child instanceof ChildElement) {
      return db.componentElements.get(<any>child.ref);
    } else if (child instanceof FolderElement) {
      return db.folderElements.get({ children: child.id});
    }
  }

  buildTree(job: Collection, root?:string|FolderElement) {
    return (typeof root === 'string' ? this.loadElement(FolderElement, root) : Promise.resolve(root)).then(folderSubject => {
      let folder = folderSubject.getValue();
      if(!(folder instanceof FolderElement)) throw new Error('invalid folder');
      if(folder.collection != job.id) throw new ValidationError('incompatible job/folder');
      return this.resolveChildren(folder);

    }).then(folder => {
      let node = D3.hierarchy(folder);
      return Promise.resolve(new BehaviorSubject(node));
    });
  }

  loadRootFolderNodes(folderIds): Promise<HierarchyNode<FolderElement>[]> {
    return Promise.all(folderIds.map(id => (typeof id === 'string' ? retrieveRecordAs(this.prevDb, FolderElement, id) : Promise.resolve(id)).then(this.retrieveChildren.bind(this)))).then(folders => folders.map(folder => D3.hierarchy(folder)));
  }
  
  loadChildrenAtRoot(nodes, filters=[]): Promise<any[]> {
    // get all combinations of locations
    let pairs = product(nodes.map(node => node.descendants().map((n:any) => n.data.id)));
    return Promise.all(pairs.map(pair => this.retrieveLocation(pair))).then((locations:any[]) => {
      // filter null locations (no children yet), get children at those locations
      let validLocs = locations.filter(l => l != null && l.children && l.children.length);
      let childIds = validLocs.map(l => l.children).reduce((a, b)=>a.concat(b));

      let map = {};
      validLocs.forEach(loc => {
        loc.children.forEach(id => map[id] = loc.folders);
      });

      return this.retrieveChildrenIn(childIds).then(children => {
        let components = {};
        children.forEach((child:any) => {
          child.folders = map[child.id];
          components[child.ref] = null
        });
        return this.retrieveComponentsIn(Object.keys(components)).then(compArr => {
          compArr.forEach((component:ComponentElement) => {
            components[component.id] = component;
          });
          return children.filter(child => {
            return filters.every(f => applyMethod(f.method, f.value, child[f.property]));
          }).map((child:ChildElement) => {
            child.data = components[child.ref];
            return D3.hierarchy(child, (d) => d.data ? d.data.children : []);
          });
        });
      });
    });
  }

  buildTreesSubject(jobSubject: BehaviorSubject<Collection>, configSubject: BehaviorSubject<NestConfig>) {
    return configSubject.withLatestFrom(jobSubject).switchMap(([config, job]) => {
      return this.buildTrees(job, config);
    });
  }

  async buildTrees(job: Collection, config: NestConfig) {
    let ids = config.folders.order.filter(n => config.folders.enabled[n]).map(n => config.folders.roots[n]||job.folders.roots[n]);
    let db = this.db;
    let nodes = await Promise.all(ids.map(async(id) => {
      let rootFolder = await db.folderElements.get(id);
      await this.resolveChildElements(job, rootFolder);
      return D3.hierarchy(rootFolder);
    }));

    return nodes;
  }

  buildNest(job: Collection, config: NestConfig) {
    let db = this.db;
    return db.transaction('r', db.folderElements, db.locationElements, db.childElements, db.componentElements, async() => {
      let rootIds = config.folders.order.map(name => config.folders.roots[name]||job.folders.roots[name]);
      let roots = await Promise.all(rootIds.map(id => db.folderElements.get(id)));
      if(roots.some(root => root == undefined)) throw new Error('one or more root folders missing');

      for(let i = 0; i < roots.length; i++) {
        let root = roots[i];
        await this.resolveChildren(root)
      }

      let nodes = roots.map(root => D3.hierarchy(root));

      // get all combinations of folders of type
      let pairs = product(nodes.map(node => node.descendants().map(n => n.data.id)));

      // key name like "[folder0+folder1]"
      let folders = job.folders.order;
      let keyName = folders.length > 1 ? ('[' + folders.map((n, _i) => 'folder' + _i).join('+') + ']') : 'folder' + 0;

      // get locations at those intersections
      let locations = (<any[]>(await Promise.all(pairs.map(pair =>
        db.locationElements.where({ [keyName] : pair.length > 1 ? pair : pair[0] }).toArray())))).reduce((a, b) => a.concat(b), []);

      // resolve children for each location, assign 'folders' property for nest
      let children = (<any[]>(await Promise.all(locations.map(location =>
        db.childElements.where('id').anyOf(location.children).filter(child => {
          return config.component.filters.filter(f => f.type === 'property').every(f => {
            switch (f.type) {
              case 'property':
                let prop = f.property;
                if (child[prop] === undefined) {
                  return false;
                }
                // TODO: replace these with dexie methods
                switch (f.method) {
                  case 'startsWith':
                    return child[prop].startsWith(f.value);
                  case 'includes':
                    return child[prop].includes(f.value);
                  case 'endsWith':
                    return child[prop].endsWith(f.value);
                  case 'greaterThan':
                    if (isNaN(f.value)) return false;
                    return Number(f.value) < Number(child[prop]);
                  case 'lessThan':
                    if (isNaN(f.value)) return false;
                    return Number(f.value) > Number(child[prop]);
                  case 'equal':
                    if (isNaN(f.value)) return false;
                    return Number(f.value) == Number(child[prop]);
                  default:
                    return true;
                }
              default:
                return true;
            }
          });
        }).toArray().then(_children =>
          _children.map(child =>
            Object.assign(child, { folders: location.folders})
          )
       )
      )))).reduce((a, b) => a.concat(b), []);

      // load referenced component
      for(let i = 0; i < children.length; i++) {
        let child = children[i];
        child.data = await db.componentElements.get(child.ref);
        children[i] = D3.hierarchy(child, (n) => n.data.children);
      }

      let keys = nodes.filter(n => config.folders.enabled[n.data.type]);
      return { keys, entries: children, config };
    });
  }

  buildNestSubject(_collection: BehaviorSubject<Collection>, _config: BehaviorSubject<NestConfig>) {
    return _config.withLatestFrom(_collection).switchMap(([config, collection]) => {
      return this.buildNest(collection, config);
    });
  }
}
