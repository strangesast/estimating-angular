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

let DATA = [
  {
    value: 'One',
    level: 0,
    id: 0
  },
  {
    value: 'Two',
    level: 1,
    id: 1
  },
  {
    value: 'Three',
    level: 2,
    id: 2
  },
  {
    value: 'One',
    level: 0,
    id: 3
  },
  {
    value: 'Two',
    level: 1,
    id: 4
  }
];

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.less', '../app.component.less'],
  providers: [
    JobService
  ] // need to modularize jobservice
})
export class ProjectPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private sub: any;
  job: Job;


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

    update(DATA);

    setTimeout(()=>{
      setInterval(()=>{
        DATA.reverse();
        let id =  Math.floor(Math.random()*100000);
        DATA.push({level: Math.floor(Math.random()*4), value: 'new toast '+ id, id:id});
        DATA = D3.shuffle(DATA).slice(0, 8)
        update(DATA);
      }, 5000);
    }, 1000);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  buildTreeSvg():void {

  }
}
