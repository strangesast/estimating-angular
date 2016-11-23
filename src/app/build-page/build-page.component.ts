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
  private sub: Subscription;
  private elements: any[] = [];

  private data;

  constructor(
    private jobService: JobService
  ) { }

  ngOnInit() {
    this.jobService.data.subscribe(data => {
      this.data = data;
    });


    this.sub = this.jobService.job.subscribe(job => {
      console.log('child job', job);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
