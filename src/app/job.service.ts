import { Injectable } from '@angular/core';

import {
  CanActivate,
  Router,
  Resolve,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';

import { Subject, Observable, BehaviorSubject } from 'rxjs';

import { ComponentElement, Folder, User, Job, Location, TreeElement } from './classes';

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
  folderOrder: ['phase', 'building']
};

@Injectable()
export class JobService {
  private _job: BehaviorSubject<Job> = new BehaviorSubject(null);
  public job: Observable<Job> = this._job.asObservable();

  public config: BehaviorSubject<any> = new BehaviorSubject({});
  public elements: BehaviorSubject<any[]> = new BehaviorSubject([]);

  public rootFolders: BehaviorSubject<any> = new BehaviorSubject({});
  public visibleFolders: BehaviorSubject<any> = new BehaviorSubject({});

  public folders: BehaviorSubject<any[]> = new BehaviorSubject([]);
  public components: BehaviorSubject<any[]> = new BehaviorSubject([]);

  public options: BehaviorSubject<any> = new BehaviorSubject(initOptions);

  constructor(private elementService: ElementService, private userService: UserService, private router: Router) { }

  changeEnabled(ob) {
    let job = this._job.getValue();
    let names = job.folders.types
    let options = this.options.getValue();
    for(let prop in ob) {
      if(prop != 'component' && names.indexOf(prop) == -1) throw new Error('invalid name - not in this job');
      options.enabled[prop] = ob[prop];
    }
    this.options.next(options);
    return options.enabled;
  }

  resolve(route: ActivatedRouteSnapshot): Promise<any> {
    let username = route.params['username'];
    let shortname = route.params['shortname'];

    return this.userService.userFromUsername(username).then(user => {
      //if(!user) {
      //  this.router.navigate(['/jobs']); // should be 404
      //  return false;
      //}

      return this.elementService.getJob(user.username, shortname).then((job:Job) => {
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

  fn(enabled, folders, cnest, prev?, prevOrder?) {
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
      return ob.map(comp=>D3.hierarchy(comp, (d=>d.data.children)));

    } else if (name in folders) {
      let root = folders[name];
      let children = root.leaves();
      if(!remaining.length) return [];

      return children.map(child => {
        let ob = {};
        ob[name] = child.data.id;
        let p = Object.assign({}, prev, ob);
        let descendants = this.fn(remaining, folders, cnest, p, prevOrder.concat(name));
        descendants.unshift(child);
        return descendants;
      }).reduce((a,b)=>a.concat(b));

    } else {
      throw new Error('name "'+name+'" not in available folders');
    }
  }

  buildTree():Promise<any[]> {
    let options = this.options.getValue();
    let enabledObj = options.enabled;
    let enabled = options.folderOrder.filter(f=>enabledObj[f]);
    if(enabledObj.component) enabled = enabled.concat('component');
    let job = this._job.getValue();
    if(job == null) throw new Error('job not yet defined');
    return this.getJobElements(job).then((els)=>{
      let folders = els[0];
      let components = els[1];

      let i = enabled.indexOf('component');
      if(i != -1 && i != enabled.length - 1) throw new Error('if enabled, component must be last');

      let componentNest:any = nest();
      let withoutComp = i == -1 ? enabled : enabled.slice(0, -1);

      // for 'nest' component arrangement
      for(let j=0;j<withoutComp.length ;j++) {
        let name = withoutComp[j];
        componentNest = componentNest.key((d:any)=>d[name]);
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
      let enabled = ['phase', 'building'];

      let types = job.folders.types;
      let roots = {};
      // if root not included, use job root for type
      types.forEach((t,i)=>{
        if(!(t in roots)) roots[t] = job.folders.roots[i];
      });

      let folders = {};
      types.filter(t=>enabled.indexOf(t)!=-1).map(t=>{
        let root = els.folders.find(f=>f['type']==t&&f['id']==roots[t]);
        root = D3.hierarchy(this.resolveChildren(root, els.folders));
        folders[t] = root;
      });

      let components = [];
      els.locations.forEach(l=>{
        l.children.forEach(c=>{
          let child = els.components.find(e=>e.id==c.id);
          c.data = child;
          let ob:any = {};
          types.forEach((t,i)=>{
            ob[t] = l.folders[i];
          });
          components.push(Object.assign(ob, c));
        });
      });

      return [folders, components];
      /*
      let types = job.folders.types;

      let resolved = {};
      job.folders.types.forEach((t, i)=>{
        let folders = els.folders.filter(f=>f['type']==t);
        let root = folders.find(f=>f.id==job.folders.roots[i]);
        if(root == null) throw new Error('root not found in folders');
        if(folders.map((f)=>f.id).indexOf(root.id) == -1) throw new Error('missing root folder "'+root+'" in db');
        root.children = root.children.map(id=>this.resolveChildren(id, folders))
        resolved[t] = root;
      });

      let roots = {};
      job.folders.types.forEach((el, i)=>{
        roots[el] = job.folders.roots[i];
      });


      let enabled = ['phase', 'building'];
      let componentEnabled = true;
      let tree = D3.hierarchy(resolved['phase'], (el) => {
        let i = enabled.indexOf(el['type']);
        if(i<enabled.length-1) {
          return [resolved[enabled[i+1]]].concat(el.children);
        }
        return el.children;
      });

      console.log('tree', tree);
      console.log('components', els.components);
      console.log('locations', els.locations);
      let obs = [];
      els.locations.forEach(loc=>{
        loc.children.forEach(c=>{
          let ob:any = {};
          job.folders.types.forEach((t,i)=>{
            ob[t]=loc.folders[i];
          });
          ob.data = c;
          obs.push(ob);
        });
      });

      console.log('tree', tree.descendants());
      this.folders.next(tree.descendants());
      let test = nest().key((d:any)=>d.phase).key((d:any)=>d.building).entries(obs)[0];
      console.log('leaves', tree.leaves());
      let leaves = tree.leaves();
      leaves.forEach(l=>{
        let ctx = this.getNodeContext(l, roots);
        console.log('ctx', ctx);
      });
      console.log('test', test);

      return [tree, obs]
      */
    });
  }

  addRef(el:TreeElement):Promise<TreeElement> {
    return el.reftype == 'component' ? this.elementService.retrieveComponent(el.refid) : this.elementService.retrieveFolder(el.refid).then(ref=>{
      el.ref = ref;
      return el;
    });
  }

  search(query:any, options:any):Promise<TreeElement[]> {
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
    return Promise.all(tree.map(this.addRef.bind(this))).then(arr=>arr.filter(f));
  }
}
