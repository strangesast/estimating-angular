import { ElementRef, Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, BehaviorSubject } from 'rxjs';
import * as D3 from 'd3';
import { Selection, HierarchyNode } from 'd3';

import { JobService } from '../../services/job.service';
import { Collection } from '../../models/classes';

@Component({
  selector: 'app-estimating-page',
  templateUrl: './estimating-page.component.html',
  styleUrls: ['./estimating-page.component.less']
})
export class EstimatingPageComponent implements OnInit, AfterViewInit {
  private jobSubject: BehaviorSubject<Collection>;
  private nestSubject: BehaviorSubject<any>;

  private graphElement: HTMLElement;
  private graphHost: Selection<any, any, any, any>;

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private element: ElementRef
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({ job: { job: jobSubject, nest: nestSubject }}) => {
      this.jobSubject = jobSubject;
      this.nestSubject = nestSubject;

      this.nestSubject.switchMap(this.subjectUpdate.bind(this)).subscribe(res => {
        console.log('nest updated', res);
      });
      
    });
  }

  ngAfterViewInit() {
    this.graphElement = this.element.nativeElement.querySelector('svg.graph');
    this.graphHost = D3.select(this.graphElement);
  }

  subjectUpdate({ keys, entries }) {
    console.log('update', keys, entries);

    let nest = D3.nest();

    keys.forEach(key => {
      nest.key((d:any) => d.folders[key.data.type]);
    })

    let data = nest.rollup((d:any) => d.length).entries(entries);

    console.log('data', data);


    return Observable.never();
  }

}
