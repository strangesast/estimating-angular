import { Component, OnInit, OnDestroy }      from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Location }               from '@angular/common';
import { Observable } from 'rxjs';

import { TreeElement } from '../classes';

import { JobService } from '../job.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.less'],
  providers: [
    JobService
  ]
})
export class ProjectPageComponent implements OnInit, OnDestroy {
  private sub: any;
  elements: TreeElement[] = [];
  tree: TreeElement[] = [];

  constructor(private userService: UserService, private jobService: JobService, private route: ActivatedRoute, private location: Location) { }

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

        }, (err)=>{

          console.log('job service init error');
          console.error(err);

        }, () => {
          console.log('init complete');

        });
      });
    });

  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

}
