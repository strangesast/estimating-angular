import { Injectable } from '@angular/core';

import { Observable, BehaviorSubject } from 'rxjs';

import { Component, Folder, User, Job, TreeElement } from './classes';

import { ElementService } from './element.service';

@Injectable()
export class JobService {

  public job: Job;

  public elements: BehaviorSubject<any[]> = new BehaviorSubject([]);
  public tree: BehaviorSubject<TreeElement[]> = new BehaviorSubject([]);

  constructor(private elementService: ElementService) { }

  init(user:User, shortname: string):Observable<TreeElement[]> {
    console.log('job service init');

    let getJobElements = this.elementService.init().then((both)=>{

      console.log('element service init');
      return this.elementService.getJob(user.username, shortname).catch((err)=>{
        console.log('error', err);
        return this.elementService.createJob(user, shortname);

      }).then((job:Job)=>{
        this.job = job;

        return this.elementService.buildTree(job).then((res)=>{
          return Promise.all(res.map(this.addRef.bind(this)));
        });

      }).then((res: TreeElement[])=>{
        this.tree.next(res);
      });


    });

    return Observable.fromPromise(getJobElements).flatMap(()=>this.tree.asObservable());
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
