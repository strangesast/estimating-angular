import { ElementRef, Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, BehaviorSubject } from 'rxjs';
import * as D3 from 'd3';
import { Selection, HierarchyNode } from 'd3';

import { ElementService } from '../../services/element.service';
import { JobService } from '../../services/job.service';
import { Collection, ChildElement } from '../../models';

@Component({
  selector: 'app-estimating-page',
  templateUrl: './estimating-page.component.html',
  styleUrls: ['../../styles/general.less', './estimating-page.component.less']
})
export class EstimatingPageComponent implements OnInit, AfterViewInit {
  private jobSubject: BehaviorSubject<Collection>;
  private nestSubject: BehaviorSubject<any>;
  private treesSubject: BehaviorSubject<any>;

  private hostReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private htmlElement: HTMLElement;
  private host: Selection<any, any, any, any>;

  private groupBy:'qty'|'buy'|'sell' = 'qty';
  private groupByOptions = ['qty', 'buy', 'sell'];
  private groupBySubject: BehaviorSubject<string> = new BehaviorSubject('qty');

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private element: ElementRef,
    private elementService: ElementService
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({ job: { job: jobSubject, nest: nestSubject, trees:treesSubject }}) => {
      this.jobSubject = jobSubject;
      this.nestSubject = nestSubject;

      (this.treesSubject = treesSubject).withLatestFrom(this.groupBySubject).take(1).switchMap(this.treesSubjectUpdate.bind(this)).subscribe();
      Observable.combineLatest(this.treesSubject, this.groupBySubject).skip(1).switchMap(this.treesSubjectUpdate.bind(this)).subscribe();
      
    });
  }

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('div');
    this.host = D3.select(this.htmlElement);
    this.hostReady.next(true);
  }

  treesSubjectUpdate([nodes, groupBy]) {
    return this.treeUpdate(nodes, groupBy);
    /*
    if(this.host == null) return Observable.never();
    return Observable.zip(...Object.keys(trees).map(name => trees[name].filter(x=>x))).combineLatest(this.jobSubject).switchMap(([nodes, job]:[HierarchyNode<any>[], Collection]) => {

      let copied = nodes.map(node => node.copy());

      let getChildren = Promise.all(copied.map(node => this.elementService.retrieveAllChildren(job, node.data).then(node => {
        return node;
      })));

      return Observable.combineLatest(Observable.fromPromise(getChildren), this.groupBySubject).switchMap(([nodes, groupBy]) => {

        return this.treeUpdate(nodes, groupBy);
      });

    });
    */
  }

  treeUpdate(data, groupBy) {
    let fader = (c) => D3.interpolateRgb(c, '#fff')(0.2);
    let color = D3.scaleOrdinal(D3.schemeCategory20.map(fader));

    let treemap = D3.treemap()
      .tile(D3.treemapResquarify)
      .size([500, 500])
      .round(true)
      .paddingInner(1);

    let svg = this.host.selectAll('svg').data(data);

    let cell = svg.enter()
      .append('svg')
      .attr('width', '100%')
      .attr('height', '500px')
      .attr('viewBox', '0 0 500 500')
      .attr('preserveAspectRatio', 'none')
      .merge(svg)
      .selectAll('g')
      .data((rootNode:any) => {
        rootNode.sum((d) => {
          if(d instanceof ChildElement) {
            return groupBy == 'qty' ? d.qty : d.data[groupBy];
          }
          return 0;
        });
        rootNode.each(n => {
          if(n.data instanceof ChildElement) {
            n._children = n.children;
            delete n.children;
          }
        });
        treemap(rootNode)
        return rootNode.leaves();
      })

    let cellEnter = cell.enter()
      .append('g')
      .attr('transform', (d:any) => 'translate(' + d.x0 + ',' + d.y0 + ')')

    cellEnter.append('rect')
      .attr('width', (d:any) => d.x1 - d.x0)
      .attr('height', (d:any) => d.y1 - d.y0)
      .attr('fill', (d:any) => color(d.parent.data.id))
      .append('title').text((d:any) => {
        return d.data.name;
      })

    cell.transition()
      .duration(500)
      .attr('transform', (d:any) => 'translate(' + d.x0 + ',' + d.y0 + ')')
      .select('rect')
      .attr('width', (d:any) => isNaN(d.x1 - d.x0) ? 0 : d.x1 - d.x0)
      .attr('height', (d:any) => isNaN(d.y1 - d.y0) ? 0 : d.y1 - d.y0)

    return Observable.never();
  }

  nestSubjectUpdate({ keys, entries }) {

    //let nests = keys.D3.nest();

    let selection = this.host
      .select('.first')
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
      .attr('preserveAspectRatio', 'none');

    let groups = svg.selectAll('g').data((a:any) => {
      let folderType = a.data.type;
      return D3.nest().key((n:any) => n.data.value.folders[folderType]).rollup((b:any) => <any>D3.map(b, (c:any) => c.data.value.ref).entries().map(({key, value}) => {
          let ob = {
            id: key,
            count: b.filter(d => d.data.value.ref == key).length,
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
      .text((d:any) => d.data.value.name + ' (' + d.count + ')');

    return Observable.never();
  }

  groupByChanged(evt) {
    this.groupBySubject.next(this.groupBy);
  }

}
