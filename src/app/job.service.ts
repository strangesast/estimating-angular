import { Injectable } from '@angular/core';

import { Observable, BehaviorSubject } from 'rxjs';

import { User, Job, TreeElement } from './classes';


import { ElementService } from './element.service';

@Injectable()
export class JobService {

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

        console.log('job', job);
        return this.elementService.buildTree(job).then((res)=>{
          return Promise.all(res.map(el => {
            return (el.reftype == 'component' ? this.elementService.retrieveComponent(el.refid) : this.elementService.retrieveFolder(el.refid)).then((ref)=>{
              el.ref = ref;
              return el;
            });
          }));
        });

      }).then((res: TreeElement[])=>{
        this.tree.next(res);
      });


    });

    return Observable.fromPromise(getJobElements).flatMap(()=>this.tree.asObservable());
  }
}
