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

import { ComponentElement, Folder, User, Job, Location, Tree } from './classes';

import { ElementService } from './element.service';
import { UserService } from './user.service';

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
  private _job: BehaviorSubject<Job> = new BehaviorSubject(null);
  //public job: Observable<Job> = this._job.asObservable();

  public job: Job;
  public tree: Tree;
  private jobSubscription: Subscription;
  private treeSubscription: Subscription;
  public elements: BehaviorSubject<any[]> = new BehaviorSubject([]);

  private _saved: BehaviorSubject<Job> = new BehaviorSubject(null);

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

  constructor(private elementService: ElementService, private userService: UserService, private router: Router) {
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
    let names = job.folders.types
    let options = this._options.getValue();
    for(let prop in ob) {
      if(prop != 'component' && names.indexOf(prop) == -1) throw new Error('invalid name - not in this job');
      options.enabled[prop] = ob[prop]; }
    this._options.next(options);
    return options.enabled;
  }

  findChanges(job?:Job) {
    job = job || this._job.getValue();
    return this.elementService.findChanges(job).then(res=>{
      if(res != null) this._status.next(res);
      return res;
    });
  }

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

  watchJob(subject:BehaviorSubject<Job>): Subscription {
    return subject.subscribe(job=>{
      // update job save here
      console.log('job updated', job);
      this.job = job;
    });
  }

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

  resolveChildren(root, depth) {
    if(!root.children.length || depth < 1) return Promise.resolve(root);
    return Promise.all(
      root.children.map(
        (id:string|Folder)=>this.elementService.loadFolder(id instanceof Folder ? id.id : id)
      )
    ).then(children=>{
      root.children = children;
      return root;
    });
  }

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

  buildTree(roots: any[], currentRoot:number=0, maxDepth: number=1) {
    if(currentRoot < roots.length) {
      let base = [];
      let root = roots[currentRoot];

      return this.resolveChildren(root, maxDepth).then(()=>{
        let node = hierarchy(root, (n)=>n.children);//.filter(c=>(c instanceof Folder && c['type'] == n['type'])))

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

  watchTree(subject:BehaviorSubject<Tree>): Subscription {
    return subject.debounceTime(100).switchMap(this.updateTree.bind(this)).subscribe(this.elements);
  }
  
  resolve(route: ActivatedRouteSnapshot): Promise<{job: BehaviorSubject<Job>, tree: BehaviorSubject<Tree>}> {
    let username = route.params['username'];
    let shortname = route.params['shortname'];

    // get tree location (root folders, filters, etc)
    // router.params['tree-root'] <-- like this

    return this.elementService.loadJob(shortname).then((job:Job)=>{
      let tree = Tree.fromJob(job);

      let jobSubject = new BehaviorSubject(job);
      let treeSubject = new BehaviorSubject(tree);

      if(this.jobSubscription != null || this.treeSubscription != null) throw new Error('already watching');

      this.jobSubscription = this.watchJob(jobSubject);
      this.treeSubscription = this.watchTree(treeSubject);

      return { job: jobSubject, tree: treeSubject, elements: this.elements };
    });

    /*
    return this.userService.userFromUsername(username).then(user => {
      //if(!user) {
      //  this.router.navigate(['/jobs']); // should be 404
      //  return false;
      //}
      
      // TODO: should resolve list of users before all this....

      return this.elementService.getJob(username, shortname).then(({saved, current}:{saved: Job, current: Job}) => {
        //if(!job) {
        //  this.router.navigate(['/jobs']); // should be 404
        //  return false;
        //}
        this._job.next(current);
        this._saved.next(saved);

        this.findChanges();

        return this.buildTree().then((elements) => {
          //this._job.next(current);
          return {
            job: saved,
            elements: elements
          };
        });

      }).catch(err => {
        throw err;
        // get job error

      });
    }).catch(err => {
      // get user error
      throw err;

    });
    */
  }

  /*
  shuffleComponents() {
    let folders = this.folders.getValue();
    let components = this.components.getValue();
    return this.buildTree(folders, D3.shuffle(components));
  }
  */

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

  createComponent(name:string, description:string, job?:Job):Promise<ComponentElement> {
    job = job||this._job.getValue();
    return this.elementService.createComponent(name, description, job);/*.then(component => {
      return this.buildTree().then(()=> component);
    });
    */
  }

  //resolveChildren(node, folders) {
  //  node.children = node.children.map(n=>this.resolveChildren(folders.find(f=>f['type']==node['type']&&n['id']==f['id']), folders));
  //  return node;
  //}

  getJobElements(job: Job): Promise<[HierarchyNode<any>,any|null]> {
    return this.elementService.getAllOfJob(job.id).then((els:any) => {
      let options = this._options.getValue();
      let enabled = options.enabled;

      let roots = options.roots;
      // if root not included, use job root for type
      job.folders.types.forEach((t,i)=>{
        if(!(t in roots)) roots[t] = job.folders.roots[i];
      });

      let folders = {};
      job.folders.types.filter(t=>enabled[t]).map(t=>{
        let root = els.folders.find(f=>f['type']==t&&f['id']==roots[t]);
        if(root == null) throw new Error('folder root not found with that type ("'+t+'") and id ("'+roots[t]+'")')
        root = hierarchy(this.resolveChildren(root, els.folders));
        folders[t] = root;
      });

      let components = [];
      els.locations.forEach(l=>{
        let ob = {};
        job.folders.types.forEach((t,i)=>{
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

  //calcStatus(current: Job) {
  //  let saved = this._saved.getValue();

  //  let a = saved.toJSON();
  //  let b = current.toJSON();
  //  let d = diff.diff(saved.toJSON(), current.toJSON())
  //  if(d) this._status.next(d);
  //  return d;
  //}

  updateJob(job: Job) {
    return this.elementService.updateJob(job).then(j=>{
      this._job.next(job);
      this.findChanges();
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
