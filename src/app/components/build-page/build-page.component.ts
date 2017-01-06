import {
  Input,
  Component,
  SimpleChanges,
  OnInit,
  OnDestroy,
  OnChanges
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import {
  Subject,
  Observable,
  Subscription,
  BehaviorSubject
} from 'rxjs';

import { Nest } from 'd3';

import { JobService } from '../../services/job.service';
import { TreeComponent } from '../tree/tree.component';
import { Collection, TreeConfig } from '../../models/classes';

interface NestConfig {
  folders: {
    order: string[];
    roots: any;
    enabled: any;
  };
  component: {
    enabled: boolean;
  }
}

@Component({
  selector: 'app-build-page',
  templateUrl: './build-page.component.html',
  styleUrls: ['./build-page.component.less'],
  providers: [TreeComponent]
})
export class BuildPageComponent implements OnInit, OnDestroy {
  private job: Collection;
  private jobSubject: BehaviorSubject<Collection>;
  private jobSubscription: Subscription;

  private nestConfig: NestConfig;
  private nestConfigSubject: BehaviorSubject<NestConfig>;
  private nestSubject: BehaviorSubject<Nest<any, any>>;
  private nest: Nest<any, any>;

  public FOLDER_ICONS = {
    phase: 'fa fa-bookmark-o fa-lg',
    building: 'fa fa-building-o fa-lg',
    component: 'fa fa-cubes fa-lg'
  };

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({job: { job: jobSubject, nest: nestSubject, nestConfig }}) =>{
      this.nestConfigSubject = nestConfig;
      this.nestConfigSubject.subscribe(config => this.nestConfig = config);
      this.nestSubject = nestSubject;
      this.nestSubject.subscribe(nest => {
        this.nest = nest;
      });
      this.jobSubject = jobSubject;
      this.jobSubscription = this.jobSubject.subscribe(job => {
        this.job = job;
      });
    });
  }

  ngOnDestroy() {
    this.jobSubscription.unsubscribe();
  }
}
