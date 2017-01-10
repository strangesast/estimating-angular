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
  styleUrls: ['./project-page.component.less'],
  providers: [ SimpleTreeComponent, TreeComponent ]
})
export class ProjectPageComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  private job: Collection;
  private jobSubject: BehaviorSubject<Collection>;
  private jobSubscription: Subscription;

  private openElementsSubject: BehaviorSubject<any>;
  private openElementIds: string[] = [];
  private openElements: any = {};

  constructor(
    private elementService: ElementService,
    private searchService: SearchService,
    private jobService: JobService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.data.subscribe(({job: { job: jobSubject, openElements }}) => {
      this.jobSubject = jobSubject;
      this.jobSubscription = this.jobSubject.subscribe(job => {
        this.searchService.setJob(job);
        this.job = job;
      });

      this.openElementsSubject = openElements;
      this.openElementsSubject.subscribe(els => {
        this.openElements = els;
        this.openElementIds = Object.keys(els);
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

  closeOpenElement(element) {
    this.jobService.closeOpenElement(element);
  }

}
