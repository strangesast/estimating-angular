import { ElementRef, Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, BehaviorSubject } from 'rxjs';
import * as D3 from 'd3';
import { Selection, HierarchyNode } from 'd3';

import { ElementService } from '../../services/element.service';
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
  private treesSubject: BehaviorSubject<any>;

  private hostReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private htmlElement: HTMLElement;
  private host: Selection<any, any, any, any>;

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

      this.treesSubject = treesSubject;

      this.hostReady.switchMap(ready => ready ? this.nestSubject.switchMap(this.nestSubjectUpdate.bind(this)): Observable.never()).subscribe(res => {
        console.log('nest updated', res);
      });

      this.hostReady.switchMap(ready => ready ? this.treesSubject.switchMap(this.treesSubjectUpdate.bind(this)): Observable.never()).subscribe();
      
    });
  }

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('div');
    this.host = D3.select(this.htmlElement);
    this.hostReady.next(true);
  }

  treesSubjectUpdate(trees) {
    if(this.host == null) return Observable.never();
    return Observable.zip(...Object.keys(trees).map(name => trees[name].filter(x=>x))).combineLatest(this.jobSubject).switchMap(([nodes, job]:[HierarchyNode<any>[], Collection]) => {

      let copied = nodes.map(node => node.copy());

      let promises = [];
      copied.forEach(rootNode => {
        rootNode.each(n => {
          promises.push(this.elementService.retrieveLocationsWith(job, n.data.type, n.data.id).then(locs => {
            return Promise.all(locs.map(loc => {
              return Promise.all(loc.children.map((id, i, arr) => this.elementService.retrieveChild(id))).then(children => {
                console.log('children', children);
                n.children.push(...children.map(child => {
                  let node:any = D3.hierarchy(child);
                  node.parent = n;
                  node.depth = n.depth + 1;
                  return node;
                }));
              });
            }));
          }));
        });
      });

      return Observable.fromPromise(Promise.all(promises).then(() => {

        let fader = (c) => D3.interpolateRgb(c, '#fff')(0.2);
        let color = D3.scaleOrdinal(D3.schemeCategory20.map(fader));

        let selection = this.host
          .select('.second')
          .selectAll('div.graph')
          .data(copied)
          .enter()
          .append('div')
          .attr('class', 'graph')
          .text((d) => {
            return d.data.type + ' tree graph';
          });
        
        let svg = selection
          .append('svg')
          .attr('width', '100%')
          .attr('height', '500px')
          .attr('viewBox', '0 0 500 500')

        svg.each(function(d) {
            console.log('this', this);
            let treemap = D3.treemap().tile(D3.treemapResquarify).size([500, 500]).round(true).paddingInner(1);

            d.sum((e) => e.qty);
            treemap(d);
          })

        let cell = svg.selectAll('g')
          .data(n => {
            return n.leaves();
          })
          .enter()
          .append('g')
          .attr('transform', (d:any) => {
            return 'translate(' + d.x0 + ',' + d.y0 + ')'
          });

        cell.append('rect')
          .attr('id', (d:any) => {
            return d.data.id
          })
          .attr('width', (d:any) => d.x1 - d.x0)
          .attr('height', (d:any) => d.y1 - d.y0)
          .attr('fill', (d:any) => color(d.parent.data.id))

        /*
        cell.append('clipPath')
          .attr('id', (d) => 'clip-' + d.data.id)
          .append('use')
          .attr('xlink:href', (d) => '#' + d.data.id)
        */

        cell.append('text')
          .attr('x', 4)
          .attr('y', 20)
          .append('tspan')
          .attr('textLength', (d:any) => d.x1 - d.x0 - 20)
          .attr('lengthAdjust', 'spacingAndGlyphs')
          .text((d) => d.data.name);

        cell.append('title')
          .text((d) => d.data.id + '\n' + d.value)

        return null;

      }));
    });
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
      //.attr('preserveAspectRatio', 'xMinYMin meet')

    let groups = svg.selectAll('g').data((a:any) => {
      let folderType = a.data.type;
      console.log('folderType', folderType);
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

}
