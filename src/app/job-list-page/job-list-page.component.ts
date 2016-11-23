import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { ElementService } from '../element.service';

import { User, Job } from '../classes';

@Component({
  selector: 'app-job-list-page',
  templateUrl: './job-list-page.component.html',
  styleUrls: ['./job-list-page.component.less']
})
export class JobListPageComponent implements OnInit {
  jobs: Job[] = [];
  users: User[] = [];

  constructor(private elementService: ElementService) { }

  ngOnInit() {
    return Promise.all([
      this.elementService.getJobs().then((jobs: Job[])=> {
        this.jobs = jobs;
      }),
      this.elementService.getUsers().then((users: User[])=>{
        this.users = users;
      })
    ]);
  }

  createNewJob():void {
    // createJob(owner: User, shortname: string, name?: string, description?: string):Promise<Job> {
    let owner = new User('Sam Zagrobelny', 'sazagrobelny', 'Samuel.Zagrobelny@dayautomation.com');
    let shortname = 'test_job_' + Math.floor(Math.random()*10);
    let name = shortname.split('_').map((n)=>n[0].toUpperCase()+n.slice(1)).join(' ');
    this.elementService.createJob(owner, shortname, name, 'blank description').then(job => {
      console.log('created new job', job);
      this.jobs.push(job);
    });
  }

}
