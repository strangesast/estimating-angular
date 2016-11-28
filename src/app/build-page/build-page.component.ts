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
      let job = data.job;
      this.jobService.getJobElements(job).then(els=>{
        let enabled = ['phase', 'building', 'component'];
        // order
        //      folder hierarchies
        //              nested stuff
        this.config = {
          enabled: enabled,
          folders: els[0],
          components: els[1]
        };
        //this.folders = both[0].descendants();

        //this.components = both[1];
      });
      this.job = job;
    });
    //this.jobService.folders.subscribe(folders => {
    //  console.log('folders...', folders);
    //  this.folders = folders;
    //});
  }

  buildTree() {
  }

  ngOnDestroy() {
    this.jobSub.unsubscribe();
  }
}
