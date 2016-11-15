import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Location }               from '@angular/common';
import { Observable } from 'rxjs';

import { TreeElement } from '../classes';

import { Job } from '../classes';

import { ElementService } from '../element.service';
import { JobService } from '../job.service';
import { UserService } from '../user.service';
import { ElementEditService } from '../element-edit.service';

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.less', '../app.component.less'],
  providers: [
    ElementEditService,
  ] // need to modularize jobservice
})
export class ProjectPageComponent implements OnInit, OnDestroy {
  private sub: any;
  elements: TreeElement[] = [];
  tree: TreeElement[] = [];
  job: Job;
  lastSave: any;

  constructor(private elementService: ElementService, private userService: UserService, private jobService: JobService, private route: ActivatedRoute, private location: Location) { }

  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
      let username = params['username'];
      let shortname = params['shortname'];

      this.userService.getUsers().then(users => {
        let user = users.find((u)=>u.username == username);
        if(user == null) throw new Error('username does not exist!');

        this.jobService.init(user, shortname).subscribe(elements => {

          console.log('elements', elements);
          this.elements = elements;

          this.job = this.jobService.job;
          this.readCommit(this.job.commit).then((res)=>{
            this.lastSave = res;
          });

        }, (err)=>{

          console.log('job service init error');
          console.error(err);

        }, () => {

        });
      });
    });
  }

  readCommit(commit: string) {
    return this.elementService.loadAs('commit', commit).then((res)=>{
      console.log(res);
      return res;
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

}