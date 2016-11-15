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
    this.elementService.init().then(()=>{
      return Promise.all([
        this.elementService.getJobs().then((jobs: Job[])=> {
          this.jobs = jobs;
        }),
        this.elementService.getUsers().then((users: User[])=>{
          this.users = users;
        })
      ]);
    });
  }

  createNewJob():void {
  }

}
