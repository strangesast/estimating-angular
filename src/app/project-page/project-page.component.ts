import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  AfterViewInit,
  ElementRef,
  OnChanges, // used with input
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

import * as D3 from 'd3';

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.less', '../app.component.less']
})
export class ProjectPageComponent implements OnInit, OnDestroy, AfterViewInit {
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
    this.data = this.jobService.data;
    this.sub = this.route.data.subscribe((data:any) => {
      console.log('job', data.job);
      this.job = data.job;
    });
  }

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('.tree-container');
    this.host = D3.select(this.htmlElement);
    this.host.html('');

    let update = (arr) => {
      this.host.style('height', arr.length*40 + 'px');
      let t = D3.transition(null)
        .duration(750);

      let text = this.host.selectAll('li')
        .data(arr, function(d){return d.id});

      text.exit()
        .transition(t)
        .style('opacity', 1e-6)
        .remove();

      text.style('opacity', 1)
        .style('margin-left', (el)=>el.level * 20 + 'px')
        .style('width', (el)=>'calc(100% - ' + el.level * 20 + 'px)')
        .style('z-index', (el, i)=>i)
        .transition(t)
        .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')

      text.enter().append('li')
        .style('transform', (el, i)=>'translate(-100%, ' + (i*40) + 'px)')
        .style('margin-left', (el)=>el.level * 20 + 'px')
        .style('width', (el)=>'calc(100% - ' + el.level * 20 + 'px)')
        .style('opacity', 0)
        .style('z-index', (el, i)=>i)
        .text((d:any)=>d.value)
        .transition(t)
        .style('opacity', 1)
        .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')
    };

    update(this.data);

    setTimeout(()=>{
      setInterval(()=>{
        this.data.reverse();
        let id =  Math.floor(Math.random()*100000);
        this.data.push({level: Math.floor(Math.random()*4), value: 'new toast '+ id, id:id});
        this.data = D3.shuffle(this.data).slice(0, 8)
        update(this.data);
      }, 5000);
    }, 1000);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  buildTreeSvg():void {

  }
}
