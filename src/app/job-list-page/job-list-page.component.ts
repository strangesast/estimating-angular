import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { ElementService } from '../element.service';

import { User, Job } from '../classes';

@Component({
  selector: 'app-job-list-page',
  templateUrl: './job-list-page.component.html',
  styleUrls: ['../app.component.less', './job-list-page.component.less']
})
export class JobListPageComponent implements OnInit {
  jobs: Job[] = [];
  jobStatus: any = {};
  users: User[] = [];

  constructor(private elementService: ElementService) { }

  ngOnInit() {
    return Promise.all([
      this.elementService.getJobs().then((jobs: Job[])=> {
        this.jobs = jobs;
        let ob = {};
        jobs.forEach(j=>ob[j.id] = 'ready');
        this.jobStatus = ob;
      }),
      this.elementService.getUsers().then((users: User[])=>{
        this.users = users;
      })
    ]);
  }

  createNewJob():void {
    // createJob(owner: User, shortname: string, name?: string, description?: string):Promise<Job> {
    let owner = new User('Sam Zagrobelny', 'sazagrobelny', 'Samuel.Zagrobelny@dayautomation.com');

    let shortname = 'test_job_' + Math.floor(Math.random()*100);

    let name = shortname.split('_').map((n)=>n[0].toUpperCase()+n.slice(1)).join(' ');

    let job;
    this.elementService.createJob(owner, shortname, name, 'blank description').subscribe(
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
      }
    );

  }

  deleteJob(job:Job) {
    this.elementService.removeJob(job);
  }
}
