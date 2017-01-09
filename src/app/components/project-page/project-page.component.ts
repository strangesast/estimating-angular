import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges, // used with input
  Inject,
  ElementRef,
  ViewChild
} from '@angular/core';

import {
  ActivatedRoute,
  Params
} from '@angular/router';

import { Subscription, BehaviorSubject, Observable } from 'rxjs';

import { HierarchyNode } from 'd3';
import { hierarchy } from 'd3-hierarchy';

import { TreeComponent } from '../tree/tree.component';
import { SimpleTreeComponent } from '../simple-tree/simple-tree.component';

import {
  ComponentElement,
  FolderElement,
  TreeConfig,
  Collection
} from '../../models/classes';
import { ElementService } from '../../services/element.service';
import { SearchService } from '../../services/search.service';
import { JobService }     from '../../services/job.service';

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.less', '../app.component.less'],
  providers: [ SimpleTreeComponent, TreeComponent ]
})
export class ProjectPageComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  private job: Collection;
  private jobSubject: BehaviorSubject<Collection>;
  private jobSubscription: Subscription;

  constructor(
    private elementService: ElementService,
    private searchService: SearchService,
    private jobService: JobService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.data.subscribe(({job: { job: jobSubject }}) => {
      this.jobSubject = jobSubject;
      this.jobSubscription = this.jobSubject.subscribe(job => {
        this.searchService.setJob(job);
        this.job = job;
      });
    });
  }

  ngAfterViewInit() {
  }

  ngOnChanges() {
  }

  ngOnDestroy() {
    this.jobSubscription.unsubscribe();
  }
}
