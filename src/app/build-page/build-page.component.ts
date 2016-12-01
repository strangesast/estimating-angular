import { Input, Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';


import { Subscription } from 'rxjs';

import { TreeComponent } from '../tree/tree.component';

import { JobService } from '../job.service';
import { Job } from '../classes';

@Component({
  selector: 'app-build-page',
  templateUrl: './build-page.component.html',
  styleUrls: ['./build-page.component.less', '../app.component.less'],
  providers: [TreeComponent]
})
export class BuildPageComponent implements OnInit, OnDestroy {
  private jobSub: Subscription;
  private elSub: Subscription;
  private elements: any[];

  private config: any = {};

  private job: Job;

  private FOLDER_ICONS = {
    phase: 'fa fa-bookmark-o fa-lg',
    building: 'fa fa-building-o fa-lg',
    component: 'fa fa-cubes fa-lg'
  };


  constructor(
    private jobService: JobService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.jobSub = this.route.parent.data.subscribe((data:any) => {
      let job = data.jobService.job;
      let elements = data.jobService.elements;

      this.job = job;
      this.elements = elements;
      this.jobService.elements.subscribe(elements => this.elements = elements);
    });
  }

  buildTree() {
    return this.jobService.buildTree();
  }

  ngOnDestroy() {
    this.jobSub.unsubscribe();
  }
}
