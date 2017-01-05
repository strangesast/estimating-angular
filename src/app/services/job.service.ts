import { Injectable } from '@angular/core';

import {
  CanActivate,
  Router,
  Resolve,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';

import {
  BehaviorSubject,
  Subscription,
  Observable,
  Subject
} from 'rxjs';

import { ComponentElement, FolderElement, User, Collection, Location, TreeConfig } from '../models/classes';

import { ElementService } from './element.service';

import {
  hierarchy,
  treemap,
  HierarchyNode
} from 'd3-hierarchy';
import { nest } from 'd3-collection';

import * as D3 from 'd3';

import { diff } from 'deep-diff';


class TreeNode {
  data: any;
  children?: TreeNode[];
  depth: number;
  height: number;
  parent: TreeNode|null;
}

const initOptions = {
  enabled: {
    'phase' : true,
    'building' : true,
    'component' : true
  },
  folderOrder: ['phase', 'building'],
  roots: {},
  sortBy: null
};

@Injectable()
export class JobService implements Resolve<Promise<any>> {
  private _job: BehaviorSubject<Collection> = new BehaviorSubject(null);
  private jobSubject: BehaviorSubject<Collection>;
  private treeSubject: BehaviorSubject<any[]>;
  private treeConfigSubject: BehaviorSubject<TreeConfig>;
  //public job: Observable<Collection> = this._job.asObservable();

  public job: Collection;
  //public tree: Tree;
  private jobSubscription: Subscription;
  private treeSubscription: Subscription;
  public elements: BehaviorSubject<any[]> = new BehaviorSubject([]);

  private _saved: BehaviorSubject<Collection> = new BehaviorSubject(null);

  private _status: BehaviorSubject<any[]> = new BehaviorSubject([]);
  public status: Observable<any[]> = this._status.asObservable();

  public config: BehaviorSubject<any> = new BehaviorSubject({});
  //public elements: BehaviorSubject<any[]> = new BehaviorSubject([]);

  public rootFolders: BehaviorSubject<any> = new BehaviorSubject({});
  public visibleFolders: BehaviorSubject<any> = new BehaviorSubject({});

  public folders: BehaviorSubject<any[]> = new BehaviorSubject([]);
  public components: BehaviorSubject<any[]> = new BehaviorSubject([]);

  public _options: BehaviorSubject<any> = new BehaviorSubject(initOptions);
  public options: Observable<any> = this._options.asObservable();

  public editElementList: BehaviorSubject<Element[]> = new BehaviorSubject([]);

  constructor(private elementService: ElementService, private router: Router) {
  }

  // edit page
  getEditElements() {
    return this.editElementList.asObservable();
  }

  addEditElement(el): void {
    let list = this.editElementList.getValue();
    let i = list.map(el=>el.id).indexOf(el.id);
    if(i == -1) this.editElementList.next(list.concat(el));
  }

  removeEditElement(el) {
    let list = this.editElementList.getValue();
    let i = list.indexOf(el);
    if(i == -1) return null; // probably should throw err
    list.splice(i, 1);
    this.editElementList.next(list);
  }

  // build page
  changeEnabled(ob) {
    let job = this._job.getValue();
    let names = job.folders.order
    let options = this._options.getValue();
    for(let prop in ob) {
      if(prop != 'component' && names.indexOf(prop) == -1) throw new Error('invalid name - not in this job');
      options.enabled[prop] = ob[prop]; }
    this._options.next(options);
    return options.enabled;
  }

  /*
  findChanges(job?:Collection) {
    job = job || this._job.getValue();
    return this.elementService.findChanges(job).then(res=>{
      if(res != null) this._status.next(res);
      return res;
    });
  }
  */

  changeSort(sort: string) {
    let options = this._options.getValue();
    options.sortBy = sort;
    this._options.next(options);
  }

  searchFolders(id:string) {
    let folders = this.folders.getValue();
    return folders.find(f=>f.id == id);
  }

  searchComponents(id:string) {
    let components = this.components.getValue();
    return components.find(f=>f.id == id);
  }

  watchJob(subject:BehaviorSubject<Collection>): Subscription {
    return subject.subscribe(job=>{
      // update job save here
      console.log('job updated', job);
      this.job = job;
    });
  }

  /*
  updateTree(tree:Tree) {
    return Observable.fromPromise(Promise.all(tree.folderOrder.map(name=>{
      return this.elementService.loadFolder(tree.folders[name].currentRoot);
    })).then(roots=>{
      // should use tree.elements as partial-replacement to determine what is open
      return this.buildTree(roots, 0, 10).then(res=>{
        return this.flattenTree(res).slice(1).map(n=>{
          n.depth-=1;
          return n;
        });
      });
    }));
  }
  */

  flattenTree(tree: HierarchyNode<any>) {
    let arr = [];
    arr.push(tree);
    if(tree.children) {
      for(let i=0; i<tree.children.length;i++) {
        arr.push.apply(arr, this.flattenTree(tree.children[i]));
      }
    }
    return arr;
  }

  /*
  buildTree(roots: any[], currentRoot:number=0, maxDepth: number=1) {
    if(currentRoot < roots.length) {
      let base = [];
      let root = roots[currentRoot];

      return this.resolveChildren(root, maxDepth).then(()=>{
        let node = hierarchy(root, (n)=>n.children);//.filter(c=>(c instanceof FolderElement && c['type'] == n['type'])))

        let promises = [];
        node.each(child=>{
          let newRoots = roots.slice();
          newRoots.splice(currentRoot, 1, child.data);
          promises.push(this.buildTree(newRoots, currentRoot+1, maxDepth-1).then(arr => {
            if(arr instanceof hierarchy) {
              child.children = child.children || [];
              arr.each((n:any)=>{
                n.depth = n.depth + child.depth;
              });
              [].push.apply(child.children, arr.children);
            } else if (Array.isArray(arr)) {
              child.children = child.children || [];
              [].push.apply(child.children, arr.map((n:any)=>{
                n.depth = n.depth + child.depth + 1;
                return n;
              }));
            } else {
              throw new Error('unexpected');
            }
          }));
        });
        return Promise.all(promises).then(arr=>{
          // append any components to children of root nodes
          //node.each((el:any)=>{
          //  if(el['parent']) {
          //    el.depth = el.parent.depth + 1;
          //    // should also somehow update 'node.height'
          //  }
          //});
          return node;
        });
      });
    } else {
      return this.elementService.loadLocation(roots.map(r=>r.id).join('-')).then(loc=>{
        // set child folders (easier folder lookup), retrieve children
        return Promise.all(loc.children.map(child=>{
          child.folders = loc.folders; // may not be a good idea. parent <-- child
          return this.elementService.loadComponentInChild(child).then(()=>{
            return hierarchy(child, (n)=>n.data.children);
          });
        }));
      }).catch(err=>{
        // not finding location, may not exist -> no children
        return [];
      });
    }
  }
  */

  /*
  watchTree(subject:BehaviorSubject<Tree>): Subscription {
    return subject.debounceTime(100).switchMap(this.updateTree.bind(this)).subscribe(this.elements);
  }
  */
  
  resolve(route: ActivatedRouteSnapshot): Promise<{job, tree, treeConfig}> {
    let username = route.params['username'];
    let shortname = route.params['shortname'];

    return this.elementService.loadJob(shortname).then(job =>{
      let jobVal = job.getValue();
      if(this.jobSubject) {
        // unload everything
      }
      this.jobSubject = job;
      this.treeSubject = new BehaviorSubject([]);
      let enabled = {'component': true};
      Object.keys(jobVal.folders.roots).forEach(n=>enabled[n]=true);
      
      this.treeConfigSubject = new BehaviorSubject({
        order: jobVal.folders.order,
        enabled,
        roots: jobVal.folders.roots
      });
      return {
        job: this.jobSubject,
        tree: this.treeSubject,
        treeConfig: this.treeConfigSubject
      };
    }).catch(err => {
      if(err.message === 'invalid/nonexistant job') { // 404
        this.router.navigate(['/jobs']);
        return false;
      }
      throw err;
    });
  }

  loadElement(_class, id:string) {
    return this.elementService.loadElement(_class, id);
  }

  buildTree(config: TreeConfig) {
    let folderIds = Object.keys(config.enabled).filter(n=>(n in config.roots) && config.enabled[n]).map(n=>config.roots[n]);
    let foldersPromise = Promise.all(folderIds.map(folderId =>
      this.loadElement(FolderElement, folderId).then(folder =>
      this.buildBranch(folder.getValue())))).then(nodes => {
        console.log(nodes);
        if(nodes.length > 1) {
          let nodea = nodes[0];
          let nodeb = nodes[1];

          nodea.descendants().forEach(n => {
            let copy = nodeb.copy();
            copy.parent = n;
            copy.each(_n => {
              _n.depth += n.depth+1;
            });
            n.children = n.children || [];
            n.children.push(copy);
          });

          let max = 0;
          nodea.each(n => {
            max = n.depth > max ? n.depth : max
          });

          nodea.each(n => {
            n.height = max - n.depth;
          });

          return [nodea].concat(nodea.children);
        } else {
          return nodes[0].descendants();
        }
      });


    return Observable.fromPromise(foldersPromise);
    /*
    return Observable.fromPromise(Promise.all(folderIds.map(folderId => this.loadElement(FolderElement, folderId).then(folder => {
      return this.buildBranch(folder).then(node => {
        return node.descendants();
      });
    }))).then(arr => {
      if(arr.length == 1) return arr[0].slice(1);
      arr.reverse();
      return arr.reduce((a, b) => {
        let copy = a.slice(1);
        return b.slice(1).map(el => [el].concat(copy.map(n=>n.copy()))).reduce((c,d)=>c.concat(d)).concat(copy.map(n=>n.copy()))
      });
    }));
    */
  }

  buildBranch(root, maxDepth=3) {
    return this.occupyChildren(root, maxDepth).then(()=>{
      let node = D3.hierarchy(root, (el) => el.children ? el.children.filter(child=> typeof child !== 'string') : [])
      return node;
    });
  }

  occupyChildren(root, maxDepth=3) {
    if(maxDepth < 1 || !root.children) return root;
    return Promise.all(root.children.map((childId, i) => {
      if(typeof childId === 'string') {
        return this.loadElement(root.constructor, childId).then(child => {
          root.children[i] = child.getValue();
          return this.occupyChildren(child, maxDepth - 1);
        });
      }
      return Promise.resolve(childId) // child
    })).then(() => {
      return root;
    });
  }


  fn(enabled, folders, cnest, par?, prev?, prevOrder?) {
    prev = prev || {};
    prevOrder = prevOrder || []; // need to preserve order of above
    let name = enabled[0];
    let remaining = enabled.slice(1);
    if(name == 'component') {
      let ob = cnest;
      prevOrder.map(n=>prev[n]).forEach(el=>{
        ob = ob[el];
      });
      // components may have children
      return ob.map(comp=>{
        let t = hierarchy(comp, (d=>d.data.children));
        if(par) {
          t['parent'] = par;
          t.each((e:any)=>{
            e['depth']=e['depth']+par['depth']+1;
          });
        }
        return t;
      });

    } else if (name in folders) {
      let root = folders[name];
      if(par) {
        root['parent'] = par;
        root['depth'] = par['depth']+1;
        root.each(e=>{
          e['depth']=e['depth']+par['depth'];
        });
      }
      let children = root.leaves();
      if(!remaining.length) return children;

      return children.map(child => {
        let ob = {};
        ob[name] = child.data.id;
        let p = Object.assign({}, prev, ob);
        let descendants = this.fn(remaining, folders, cnest, child, p, prevOrder.concat(name));
        descendants.unshift(child);
        return descendants;
      }).reduce((a,b)=>a.concat(b));

    } else {
      throw new Error('name "'+name+'" not in available folders');
    }
  }

  getOptions():any {
    return this._options.getValue();
  }

  /*
  buildTree(rootFolders?, components?):Promise<any[]> {
    let options = this._options.getValue();
    let enabledObj = options.enabled;
    let enabled = options.folderOrder.filter(f=>enabledObj[f]);
    if(enabledObj.component) enabled = enabled.concat('component');
    let job = this._job.getValue();
    if(job == null) throw new Error('job not yet defined');

    let prom;
    if(rootFolders && components) {
      prom = Promise.resolve([rootFolders, components]);
    } else {
      prom = this.getJobElements(job);
    }
    return prom.then((els)=>{
      let rootFolders = els[0];
      components = els[1];

      this.components.next(components);
      // janky
      let folders = Object.keys(rootFolders).map(t=>rootFolders[t].descendants().map(d=>d.data));
      if(folders.length) folders = folders.reduce((a,b)=>a.concat(b));
      this.folders.next(folders);

      let i = enabled.indexOf('component');
      if(i != -1 && i != enabled.length - 1) throw new Error('if enabled, component must be last');

      let componentNest:any = nest();

      if(options.sortBy == 'asc') {
        componentNest.sortValues((a, b)=>{
          return a.data.name < b.data.name ? -1 : 1;
        });
      } else if (options.sortBy == 'desc') {
        componentNest.sortValues((a, b)=>{
          return a.data.name > b.data.name ? -1 : 1;
        });
      }

      // for 'nest' component arrangement
      for(let j=0;j<enabled.length ;j++) {
        let name = enabled[j];
        if(name == 'component') continue;
        componentNest = componentNest.key((d:any)=>d.folders[name]);
      }
      componentNest = componentNest.object(components);


      let elements = this.fn(enabled, rootFolders, componentNest);
      this.elements.next(elements);
      return elements;
    });
  }
  */

  createComponent(name:string, description:string, job?:Collection):Promise<ComponentElement> {
    job = job||this._job.getValue();
    return this.elementService.createComponent(name, description, job);/*.then(component => {
      return this.buildTree().then(()=> component);
    });
    */
  }

  /*
  getJobElements(job: Collection): Promise<[HierarchyNode<any>,any|null]> {
    return this.elementService.getAllOfJob(job.id).then((els:any) => {
      let options = this._options.getValue();
      let enabled = options.enabled;

      let roots = options.roots;
      // if root not included, use job root for type
      job.folders.order.forEach((t,i)=>{
        if(!(t in roots)) roots[t] = job.folders.roots[i];
      });

      let folders = {};
      job.folders.order.filter(t=>enabled[t]).map(t=>{
        let root = els.folders.find(f=>f['type']==t&&f['id']==roots[t]);
        if(root == null) throw new Error('folder root not found with that type ("'+t+'") and id ("'+roots[t]+'")')
        root = hierarchy(this.resolveChildren(root, els.folders));
        folders[t] = root;
      });

      let components = [];
      els.locations.forEach(l=>{
        let ob = {};
        job.folders.roots.forEach((t,i)=>{
          ob[t] = l.folders[i];
        });
        // fill in child 'data' attribute
        l.children.forEach(c=>{
          let child = els.components.find(e=>e.id==c.ref);
          c.data = child;
          c.folders = ob;
          components.push(c);
        });
      });

      return [folders, components];
    });
  }
  */

  //calcStatus(current: Collection) {
  //  let saved = this._saved.getValue();

  //  let a = saved.toJSON();
  //  let b = current.toJSON();
  //  let d = diff.diff(saved.toJSON(), current.toJSON())
  //  if(d) this._status.next(d);
  //  return d;
  //}

  updateJob(job: Collection) {
    return this.elementService.updateJob(job).then(j=>{
      this._job.next(job);
      //this.findChanges();
      return job;
    });
  }

  findComponent(id: string):Promise<ComponentElement>{
    return this.elementService.retrieveComponent(id);
  }

  search(query:any, options:any):Promise<any[]> {
    let lower = !!options['ignorecase'];
    let which = !!options['any']; // any in query vs all in query
    let tree = this.elements.getValue();
    let f = (t)=> {
      let el = t.ref;
      for(let prop in query) {
        if(el[prop] == null) continue;

        let c = (lower ? el[prop].toLowerCase() : el[prop]).indexOf(query[prop]) == -1;
        if(!which && c || which && !c) return which;
      }
      return !which;
    };
    //return Promise.all(tree.map(this.addRef.bind(this))).then(arr=>arr.filter(f));
    return Promise.all([]);
  };
}
