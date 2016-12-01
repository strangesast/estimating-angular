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

import { TreeElement } from '../classes';

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
  //private data: any[];
  private config: any = {};

  private htmlElement: HTMLElement;
  private host;

  constructor(
    private elementService: ElementService,
    private userService: UserService,
    private jobService: JobService,
    private route: ActivatedRoute,
    private element: ElementRef
  ) { }

  ngOnInit() {
    //this.jobService.data.subscribe(data => {
    //  this.data = data;
    //});
    this.sub = this.route.data.subscribe((data:any) => {
      this.job = data.jobService.job;
      this.config = data.jobService.treeConfig;
      if(this.sub2) this.sub2.unsubscribe();
      this.sub2 = this.jobService.config.subscribe(config => {
        console.log('config update');
        this.config = config
      });
    });
  }

  //constructor(
  //  id,
  //  name,
  //  description,
  //  public job: string, 
  //  public children?: Child[], 
  //  public basedOn?: BasedOn|null
  //) {

  newComponentActiveJob() {
    let job = this.job;
    this.jobService.createComponent('new component', 'test component').then(component => {
      console.log('new component', component);
    });
  }

  ngAfterViewInit() {
  }

  ngOnChanges() {
  }

  ngOnDestroy() {
    if(this.sub2) this.sub2.unsubscribe();
    this.sub.unsubscribe();
  }

  buildTreeSvg():void {

  }
}
