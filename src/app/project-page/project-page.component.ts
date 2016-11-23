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

import { Job } from '../classes';

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
  job: Job;
  private data: any[];


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
    this.jobService.data.subscribe(data => {
      this.data = data;
    });
    this.sub = this.route.data.subscribe((data:any) => {
      console.log('job', data.job);
      this.job = data.job;
    });
  }

  ngAfterViewInit() {
  }

  ngOnChanges() {
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  buildTreeSvg():void {

  }
}
