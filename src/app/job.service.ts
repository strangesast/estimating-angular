import { Injectable } from '@angular/core';

import {
  CanActivate,
  Router,
  Resolve,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';

import { Subject, Observable, BehaviorSubject } from 'rxjs';

import { Component, Folder, User, Job, TreeElement } from './classes';

import { ElementService } from './element.service';
import { UserService } from './user.service';

import { hierarchy, tree, treemap } from 'd3-hierarchy';
import * as D3 from 'd3';

let DATA = [
  {
    value: 'One',
    level: 0,
    id: 0
  },
  {
    value: 'Two',
    level: 1,
    id: 1
  },
  {
    value: 'Three',
    level: 2,
    id: 2
  },
  {
    value: 'One',
    level: 0,
    id: 3
  },
  {
    value: 'Two',
    level: 1,
    id: 4
  }
];

@Injectable()
export class JobService {
  private _job: BehaviorSubject<Job> = new BehaviorSubject(null);
  public job: Observable<Job> = this._job.asObservable();

  public elements: BehaviorSubject<any[]> = new BehaviorSubject([]);
  public tree: BehaviorSubject<TreeElement[]> = new BehaviorSubject([]);

  public rootFolders: BehaviorSubject<any> = new BehaviorSubject({});
  public visibleFolders: BehaviorSubject<any> = new BehaviorSubject({});

  public data: BehaviorSubject<any[]> = new BehaviorSubject([]);

  constructor(private elementService: ElementService, private userService: UserService, private router: Router) {
    setTimeout(()=>{
      setInterval(()=>{
        let data = this.data.getValue();
        data.reverse();
        let id =  Math.floor(Math.random()*100000);
        data.push({level: Math.floor(Math.random()*4), value: 'new toast '+ id, id:id});
        data = D3.shuffle(data).slice(0, 8);
        this.data.next(data);
      }, 5000);
    }, 1000);
  }

  resolve(route: ActivatedRouteSnapshot): Promise<Job>|boolean {
    let username = route.params['username'];
    let shortname = route.params['shortname'];

    return this.userService.userFromUsername(username).then(user => {
      if(!user) return this.router.navigate(['/jobs']); // should be 404

      return this.elementService.getJob(user.username, shortname).then((job:Job|null) => {
        if(!job) {
          this.router.navigate(['/jobs']); // should be 404
          return false;
        }
        this._job.next(job);
        return job;
      }).catch(err => {
        // get job error

      });
    }).catch(err => {
      // get user error

    });
  }

  resolveChildren(rootid, folders): any[] {
    let root = folders.find(f=>f.id==rootid);
    if(root == null) throw new Error('root not found');
    if(root.children) {
      root.children = root.children.map(id=>this.resolveChildren(id, folders));
    }
    return root;
  }

  getJobElements(job: Job): void {
    this.elementService.getAllOfJob(job.id).then((els:any) => {
      let resolved = {};
      job.folders.types.forEach((t, i)=>{
        let folders = els.folders.filter(f=>f['type']==t);
        let root = folders.find(f=>f.id==job.folders.roots[i]);
        if(root == null) throw new Error('root not found in folders');
        if(folders.map((f)=>f.id).indexOf(root.id) == -1) throw new Error('missing root folder "'+root+'" in db');
        root.children = root.children.map(id=>this.resolveChildren(id, folders))
        resolved[t] = root;
      });
      console.log(resolved['phase'])

      let enabled = ['phase', 'building', 'component'];
      let tree = D3.hierarchy(resolved['phase'], (el) => {
        let i = enabled.indexOf(el['type']);
        if(i<enabled.length-1) return [resolved[enabled[i+1]]].concat(el.children);
        return el.children;
      });
      console.log('tree', tree);
      console.log('descendants', tree.descendants());
    });
  }

  //  let getJobElements = this.elementService.init().then((both)=>{

  //    console.log('element service init');
  //    return this.elementService.getJob(user.username, shortname).catch((err)=>{
  //      console.log('error', err);
  //      return this.elementService.createJob(user, shortname);

  //    }).then((job:Job)=>{
  //      this.job = job;

  //      let folders = {};
  //      let visible = {};
  //      for(let i=0; i < job.folders.types.length; i++) {
  //        let t = job.folders.types[i];
  //        folders[t] = job.folders.roots[i];
  //        visible[t] = true;
  //      }
  //      visible['component'] = true;
  //      this.rootFolders.next(folders);

  //      return this.elementService.buildTree(job).then((res)=>{
  //        return Promise.all(res.map(this.addRef.bind(this)));
  //      });


  //    }).then((res: TreeElement[])=>{
  //      this.tree.next(res);
  //    });


  //  });

  //  return Observable.fromPromise(getJobElements).flatMap(()=>this.tree.asObservable());
  //}

  addRef(el:TreeElement):Promise<TreeElement> {
    return el.reftype == 'component' ? this.elementService.retrieveComponent(el.refid) : this.elementService.retrieveFolder(el.refid).then(ref=>{
      el.ref = ref;
      return el;
    });
  }

  search(query:any, options:any):Promise<TreeElement[]> {
    let lower = !!options['ignorecase'];
    let which = !!options['any']; // any in query vs all in query
    let tree = this.tree.getValue();
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
