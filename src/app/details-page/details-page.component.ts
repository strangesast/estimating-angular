import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { JobService } from '../job.service';

import { Job } from '../classes';


@Component({
  selector: 'app-details-page',
  templateUrl: './details-page.component.html',
  styleUrls: ['./details-page.component.less']
}) export class DetailsPageComponent implements OnInit {
  private sub: Subscription;
  private job: Job;

  constructor(
    private jobService: JobService
  ) { }

  ngOnInit() {
    this.sub = this.jobService.job.subscribe(job => {
      this.job = job;
      this.jobService.findChanges().then(hist => {
        console.log('history', hist);
      });
    });
  }
  ngOnDestroy() {
    this.sub.unsubscribe();
  }


}
