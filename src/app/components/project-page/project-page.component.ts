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

import { BehaviorSubject, Observable } from 'rxjs';

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
import { JobService }     from '../../services/job.service';

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.less', '../app.component.less'],
  providers: [ SimpleTreeComponent, TreeComponent ]
})
export class ProjectPageComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  private sub: any;
  private sub2: any;
  jobSubject: BehaviorSubject<Collection>;
  tree: BehaviorSubject<any[]>;
  treeConfig: BehaviorSubject<TreeConfig>;
  job: Collection;

  testNode: HierarchyNode<any> = hierarchy({name: 'toast', children: [ { name: 'butter', children: [] } ]});

  elements: any[] = [];
  //private data: any[];
  private config: any = {};

  private activeSubTab: string = 'balance';
  testDate = new Date();

  private htmlElement: HTMLElement;
  private host;

  constructor(
    private elementService: ElementService,
    private jobService: JobService,
    private route: ActivatedRoute,
    private element: ElementRef
  ) { }

  changeSubTab(tabName: string) {
    this.activeSubTab = tabName;
  }

  ngOnInit() {
    this.route.data.subscribe(({jobData: {job, tree, treeConfig}})=>{
      console.log('once');
      this.jobSubject = job;
      this.jobSubject.subscribe(job => {
        this.job = job;
      });
      /*
      this.treeSubject = tree;

      this.treeSubject.subscribe(tree => {
        console.log('got tree!', tree);
        //this.tree = tree;
      });
      elements.subscribe(elements => {
        this.elements = elements;
      });
      */

    });
  }

  newComponentActiveJob() {
    let job = this.job;
    this.jobService.createComponent(Math.round(Math.random()*10) + ' new component', 'test component');
  }

  shuffle() {
    //this.jobService.shuffleComponents();
  }

  ngAfterViewInit() {
  }

  ngOnChanges() {

  }

  ngOnDestroy() {
    //if(this.sub2) this.sub2.unsubscribe();
    //this.sub.unsubscribe();
  }
}
