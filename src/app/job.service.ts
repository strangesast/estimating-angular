import { Injectable } from '@angular/core';

import {
  CanActivate,
  Router,
  Resolve,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';

import { Observable, BehaviorSubject } from 'rxjs';

import { Component, Folder, User, Job, TreeElement } from './classes';

import { ElementService } from './element.service';
import { UserService } from './user.service';

//import { hierarchy, tree, treemap } from 'd3-hierarchy';


@Injectable()
export class JobService {

  public elements: BehaviorSubject<any[]> = new BehaviorSubject([]);
  public tree: BehaviorSubject<TreeElement[]> = new BehaviorSubject([]);

  public rootFolders: BehaviorSubject<any> = new BehaviorSubject({});
  public visibleFolders: BehaviorSubject<any> = new BehaviorSubject({});

  constructor(private elementService: ElementService, private userService: UserService, private router: Router) { }

  resolve(route: ActivatedRouteSnapshot): Promise<Job>|boolean {
    let username = route.params['username'];
    let shortname = route.params['shortname'];

    return this.userService.userFromUsername(username).then(user => {
      if(!user) this.router.navigate(['/jobs']); // should be 404

      return this.elementService.getJob(user.username, shortname).then(job => {
        if(!job) {
          this.router.navigate(['/jobs']); // should be 404
          return false;
        }

        return job;
      });
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
