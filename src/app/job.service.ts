import { Injectable } from '@angular/core';

import {
  CanActivate,
  Router,
  Resolve,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';

import { Subject, Observable, BehaviorSubject } from 'rxjs';

import { ComponentElement, Folder, User, Job, Location } from './classes';

import { ElementService } from './element.service';
import { UserService } from './user.service';

import { hierarchy, tree, treemap, HierarchyNode } from 'd3-hierarchy';
import { nest } from 'd3-collection';

import * as D3 from 'd3';

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
  public job: Observable<Job> = this._job.asObservable();

  public config: BehaviorSubject<any> = new BehaviorSubject({});
  public elements: BehaviorSubject<any[]> = new BehaviorSubject([]);

  public rootFolders: BehaviorSubject<any> = new BehaviorSubject({});
  public visibleFolders: BehaviorSubject<any> = new BehaviorSubject({});

  public folders: BehaviorSubject<any[]> = new BehaviorSubject([]);
  public components: BehaviorSubject<any[]> = new BehaviorSubject([]);

  public _options: BehaviorSubject<any> = new BehaviorSubject(initOptions);
  public options: Observable<any> = this._options.asObservable();

  constructor(private elementService: ElementService, private userService: UserService, private router: Router) { }

  changeEnabled(ob) {
    let job = this._job.getValue();
    let names = job.folders.types
    let options = this._options.getValue();
    for(let prop in ob) {
      if(prop != 'component' && names.indexOf(prop) == -1) throw new Error('invalid name - not in this job');
      options.enabled[prop] = ob[prop];
    }
    this._options.next(options);
    return options.enabled;
  }

  changeSort(sort: string) {
    let options = this._options.getValue();
    options.sortBy = sort;
    this._options.next(options);
  }

  resolve(route: ActivatedRouteSnapshot): Promise<any> {
    let username = route.params['username'];
    let shortname = route.params['shortname'];

    return this.userService.userFromUsername(username).then(user => {
      //if(!user) {
      //  this.router.navigate(['/jobs']); // should be 404
      //  return false;
      //}
      
      // TODO: should resolve list of users before all this....

      return this.elementService.getJob(username, shortname).then((job:Job) => {
        //if(!job) {
        //  this.router.navigate(['/jobs']); // should be 404
        //  return false;
        //}
        this._job.next(job);

        return this.buildTree().then((elements) => {
          this._job.next(job);
          return {
            job: job,
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
  }

  shuffleComponents() {
    let folders = this.folders.getValue();
    let components = this.components.getValue();
    return this.buildTree(folders, D3.shuffle(components));
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
        let t = D3.hierarchy(comp, (d=>d.data.children));
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

  buildTree(folders?, components?):Promise<any[]> {
    let options = this._options.getValue();
    let enabledObj = options.enabled;
    let enabled = options.folderOrder.filter(f=>enabledObj[f]);
    if(enabledObj.component) enabled = enabled.concat('component');
    let job = this._job.getValue();
    if(job == null) throw new Error('job not yet defined');

    let prom;
    if(folders && components) {
      prom = Promise.resolve([folders, components]);
    } else {
      prom = this.getJobElements(job);
    }
    return prom.then((els)=>{
      folders = els[0];
      components = els[1];
      this.components.next(components);
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


      let elements = this.fn(enabled, folders, componentNest);
      this.elements.next(elements);
      return elements;
    });
  }

  createComponent(name:string, description:string, job?:Job):Promise<ComponentElement> {
    job = job||this._job.getValue();
    return this.elementService.createComponent(name, description, job).then(component => {
      return this.buildTree().then(()=> component);
    });
  }

  resolveChildren(node, folders) {
    node.children = node.children.map(n=>this.resolveChildren(folders.find(f=>f['type']==node['type']&&n['id']==f['id']), folders));
    return node;
  }

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
        root = D3.hierarchy(this.resolveChildren(root, els.folders));
        folders[t] = root;
      });

      let components = [];
      els.locations.forEach(l=>{
        let ob = {};
        job.folders.types.forEach((t,i)=>{
          ob[t] = l.folders[i];
        });
        l.children.forEach(c=>{
          let child = els.components.find(e=>e.id==c.id);
          c.data = child;
          c.folders = ob;
          components.push(c);
        });
      });

      return [folders, components];
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
