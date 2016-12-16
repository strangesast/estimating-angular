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

import {
  ComponentElement,
  Folder,
  Tree,
  Job
} from '../classes';
import { ElementService } from '../element.service';
import { TreeOptions }    from '../tree-options';
import { JobService }     from '../job.service';
import { defaultOptions } from '../defaults';

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.less', '../app.component.less']
})
export class ProjectPageComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  private sub: any;
  private sub2: any;
  treeSubject: BehaviorSubject<Tree>;
  jobSubject: BehaviorSubject<Job>;
  tree: Tree;
  job: Job;

  elements: any[] = [];
  //private data: any[];
  private config: any = {};

  private activeSubTab: string = 'balance';
  testDate = new Date();

  private searchTreeOptions: TreeOptions = {
    expand: false,
    source: true,
    sink: false,
    reorder: false,
    sort: false,
    animationTime: 250
  };

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
    this.route.data.subscribe(({jobData: {job, tree, elements}})=>{
      console.log('once');
      this.jobSubject = job;
      this.treeSubject = tree;

      this.jobSubject.subscribe(job => {
        console.log('got job!');
        this.job = job;
      });
      this.treeSubject.subscribe(tree => {
        console.log('got tree!', tree);
        //this.tree = tree;
      });
      elements.subscribe(elements => {
        this.tree = elements;
      });

    });
    //this.sub = this.route.data.subscribe((data:any) => {
    //  this.job = data.jobService.job;
    //  this.elements = data.jobService.elements;

    //  if(this.sub2) this.sub2.unsubscribe();

    //  this.sub2 = this.jobService.elements.subscribe(elements => this.elements = elements);

    //  this.jobService.job.subscribe(job => this.job = job);

    //  this.jobService.options.subscribe(o => {
    //    this.jobService.buildTree();
    //  });
    //});
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
    if(this.sub2) this.sub2.unsubscribe();
    this.sub.unsubscribe();
  }
}
