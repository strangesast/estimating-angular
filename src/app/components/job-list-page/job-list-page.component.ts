import { Component, OnInit } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

import { ElementService } from '../../services/element.service';

import { User, Collection } from '../../models/classes';

@Component({
  selector: 'app-job-list-page',
  templateUrl: './job-list-page.component.html',
  styleUrls: ['../app.component.less', './job-list-page.component.less']
})
export class JobListPageComponent implements OnInit {
  jobs: Collection[] = [];
  jobStatus: any = {};
  users: User[] = [];

  aboutJob: any = {}; // { job: about }

  jobsSubject: BehaviorSubject<BehaviorSubject<Collection>[]>;
  constructor(private elementService: ElementService) { }

  ngOnInit() {
    // get list of jobs from db
    // get save state from git
    /*
    return Promise.all([
      this.elementService.getJobs().then((jobs: Collection[])=> {
        this.jobs = jobs;
        let ob = {};
        jobs.forEach(j=>ob[j.id] = 'ready');
        this.jobStatus = ob;
      }),
      this.elementService.getUsers().then((users: User[])=>{
        this.users = users;
      })
    ]);
    */
   let handleAbout = (job) => {
     let getAbout = this.elementService.aboutJob(job).map(about => {
       console.log(about);
       job.about = about;
     });
     return Observable.of(job).concat(getAbout.ignoreElements().map(()=>job));
   };
   this.elementService.getJobs().then(bs => {
     this.jobsSubject = bs;

     let first = this.jobsSubject.take(1).flatMap(jobs => {
       return Observable.combineLatest(...jobs.map(_bs => _bs.flatMap(handleAbout.bind(this))));
     }).subscribe((jobs:Collection[]) => this.jobs = jobs);
     
     this.jobsSubject.pairwise().flatMap(([a, b]) => {
       let forJob = b.map(_bs=> {
         if (a.indexOf(_bs)==-1) {
           return _bs.flatMap(handleAbout.bind(this))
         } else {
           return _bs;
         }
       });
       return Observable.combineLatest(...forJob);

     }).subscribe((jobs:Collection[]) => {
       this.jobs = jobs;
     });
   });
  }

  createNewJob():void {
    // createJob(owner: User, shortname: string, name?: string, description?: string):Promise<Collection> {
    let owner = new User('Sam Zagrobelny', 'sazagrobelny', 'Samuel.Zagrobelny@dayautomation.com');

    let shortname = 'test_job_' + Math.floor(Math.random()*100);

    let name = shortname.split('_').map((n)=>n[0].toUpperCase()+n.slice(1)).join(' ');

    let job;
    let jobSubject = this.elementService.createJob(owner, shortname, name, 'blank description')
    
    jobSubject.takeWhile(job => !job.saveState.startsWith('saved')).subscribe(
      res => {
        if(job) {
          this.jobs.splice(this.jobs.indexOf(job), 1, res);
        } else {
          this.jobStatus[res.id] = 'loading';
          this.jobs.push(res);
        }
        job = res;
      }, (e)=>{
        console.error(e);
      }, () => {
        if(job) this.jobStatus[job.id] = 'ready';
        this.elementService.saveJob(job, 'first').then(saveResult => {
          console.log('saveResult', saveResult);
          this.elementService.compareTree(saveResult.commit.tree);
        });
      }
    );
  }

  deleteJob(job:Collection) {
    this.elementService.removeJob(job.id);
  }
}
