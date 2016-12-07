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

import { Observable } from 'rxjs';

import { Job, ComponentElement, Folder } from '../classes';

import { ElementService }     from '../element.service';
import { JobService }         from '../job.service';
import { UserService }        from '../user.service';

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.less', '../app.component.less']
})
export class ProjectPageComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  private sub: any;
  private sub2: any;
  job: Job;
  elements: any[];
  //private data: any[];
  private config: any = {};

  private activeSubTab: string = 'balance';
  testDate = new Date();

  private htmlElement: HTMLElement;
  private host;

  constructor(
    private elementService: ElementService,
    private userService: UserService,
    private jobService: JobService,
    private route: ActivatedRoute,
    private element: ElementRef
  ) {
    console.log('new project page created');
  }

  changeSubTab(tabName: string) {
    this.activeSubTab = tabName;
  }

  ngOnInit() {
    this.sub = this.route.data.subscribe((data:any) => {
      this.job = data.jobService.job;
      this.elements = data.jobService.elements;

      if(this.sub2) this.sub2.unsubscribe();

      this.sub2 = this.jobService.elements.subscribe(elements => this.elements = elements);

      this.jobService.job.subscribe(job => this.job = job);

      this.jobService.options.subscribe(o => {
        this.jobService.buildTree();
      });
    });
  }

  newComponentActiveJob() {
    let job = this.job;
    this.jobService.createComponent(Math.round(Math.random()*10) + ' new component', 'test component').then(component => {
      console.log('new component', component);
    });
  }

  shuffle() {
    this.jobService.shuffleComponents();
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
