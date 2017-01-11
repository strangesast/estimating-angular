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

  private htmlElement: HTMLElement;
  private host: Selection<any, any, any, any>;

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
    this.htmlElement = this.element.nativeElement.querySelector('div');
    this.host = D3.select(this.htmlElement);
  }

  subjectUpdate({ keys, entries }) {

    //let nests = keys.D3.nest();

    let selection = this.host
      .selectAll('div.graph')
      .data(keys)
      .enter()
      .append('div')
      .attr('class', 'graph');

    let cspace = D3.interpolateHsl('grey', 'lightgrey');

    let width = 9;
    let height = 1;

    let x = D3.scaleLinear().rangeRound([0, width]);

    let label = selection.append('div').text((d:any) => 'Unique components in ' + d.data.name + ' (' + d.data.type + ')')
    let svg = selection.append('svg')
      .attr('width', '100%')
      .attr('height', '50px')
      .attr('viewBox', '0 0 '+width+' '+height)
      //.attr('preserveAspectRatio', 'xMinYMin meet')

    let groups = svg.selectAll('g').data((a:any) => {
      let folderType = a.data.type;
      return D3.nest().key((n:any) => n.folders[folderType]).rollup((b:any) => <any>D3.map(b, (c:any) => c.ref).entries().map(({key, value}) => {
          let ob = {
            id: key,
            count: b.filter(d => d.ref == key).length,
            data: value.data,
            x: 0
          };
          return ob;
        }).reduce((a, b) => {
          let last = a.slice(-1)[0]
          b.x = last.x + last.count;
          return a.concat(b);
        }, [{count: 0, x: 0}]).slice(1)).entries(entries);
      })
      .enter()
      .append('g')
      .attr('x', 0)
      .attr('y', 0)
      .selectAll('g')
      .data((d:any) => {
        return d.value;
      })
      .enter()
      .append('g')

    groups
      .append('rect')
      .attr('fill', (d, i, arr) => {
        return cspace(i/arr.length);
      })
      .attr('x', (d:any) => d.x)
      .attr('height', 1)
      .attr('width', (d:any) => d.count)

    groups
      .append('text')
      .attr('font-size', '0.2')
      .attr('text-anchor', 'middle')
      .attr('y', height/2)
      .attr('x', (d:any) => d.x+d.count/2)
      .attr('color', 'black')
      .text((d:any) => d.data.name + ' (' + d.count + ')')

    return Observable.never();
  }

}
