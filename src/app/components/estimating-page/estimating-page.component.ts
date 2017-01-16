import { ElementRef, Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, BehaviorSubject } from 'rxjs';
import * as D3 from 'd3';
import { Selection, HierarchyNode } from 'd3';

import { ElementService } from '../../services/element.service';
import { JobService } from '../../services/job.service';
import { Collection, Child } from '../../models/classes';

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

      this.treesSubject = treesSubject;

      /*
      this.hostReady.switchMap(ready => ready ? this.nestSubject.switchMap(this.nestSubjectUpdate.bind(this)): Observable.never()).subscribe(res => {
        console.log('nest updated', res);
      });
      */

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

      let getChildren = Promise.all(copied.map(node => this.elementService.retrieveAllChildren(job, node.data).then(node => {
        console.log('node', node);
        return node;
      })));

      /*
      let promises = [];
      copied.forEach(rootNode => {
        rootNode.each(n => {
          promises.push(this.elementService.retrieveLocationsWith(job, n.data.type, n.data.id).then(locs => {
            return Promise.all(locs.map(loc => {
              return Promise.all(loc.children.map((id, i, arr) => this.elementService.retrieveChild(id))).then(children => {
                n.children = n.children || [];
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
      */

      return Observable.combineLatest(Observable.fromPromise(getChildren), this.groupBySubject).switchMap(([nodes, groupBy]) => {

        return this.treeUpdate(nodes, groupBy);
      });

    });
  }

  treeUpdate(data, groupBy) {
    //let t = D3.transition(null).duration(500);

    console.log('data', data);

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
      .selectAll('g').data((d:any) => {
      d.sum((e) => {
        if(e instanceof Child) {
          return groupBy === 'qty' ? e[groupBy] : e.data[groupBy];
        }
        return 0;
      });
      treemap(d)
      return d.leaves();
    });

    cell.exit().remove();

    let rect = cell.enter()
      .append('g')
      .merge(cell)
      .attr('transform', (d:any) => {
        return 'translate(' + d.x0 + ',' + d.y0 + ')'
      })
      .append('rect')

    rect.attr('width', (d:any) => d.x1 - d.x0)
      .attr('height', (d:any) => d.y1 - d.y0)
      .attr('fill', (d:any) => color(d.parent.data.id))


    /*
    cell
      .attr('transform', (d:any) => {
        return 'translate(' + d.x0 + ',' + d.y0 + ')'
      })
      .select('rect')
      .attr('width', (d:any) => d.x1 - d.x0)
      .attr('height', (d:any) => d.y1 - d.y0)
      .attr('fill', (d:any) => color(d.parent.data.id))
      .transition(t)


    cell.enter()
      .append('g')
      .attr('title', (d:any) => d.data.id + '\n' + d.value)
      .append('rect')
      .attr('id', (d:any) => {
        return d.data.id
      })
      .transition(t)
      .attr('transform', (d:any) => {
        return 'translate(' + d.x0 + ',' + d.y0 + ')'
      })

    cell.exit().transition(t).remove();
    */




    /*
    let selection = this.host
      .select('.second')
      .selectAll('div.graph')
      .data(() => {
        let treemap = D3.treemap().tile(D3.treemapResquarify).size([500, 500]).round(true).paddingInner(1);

        return data.map(d => {
          d.sum((e:any) => e[groupBy]);
          return treemap(d);
        });
      })

    selection.enter()
      .append('div')
      .attr('class', 'graph')
      .text((d:any) => d.data.type + ' tree graph')
      .append('svg')

    let svg = selection.select('svg')
      .attr('width', '100%')
      .attr('height', '500px')
      .attr('viewBox', '0 0 500 500')
      .attr('preserveAspectRatio', 'none');

    let cell = svg.selectAll('g')
      .data((n:any) => n.leaves())

    cell
      .attr('transform', (d:any) => {
        return 'translate(' + d.x0 + ',' + d.y0 + ')'
      })
      .select('rect')
      .attr('width', (d:any) => d.x1 - d.x0)
      .attr('height', (d:any) => d.y1 - d.y0)
      .attr('fill', (d:any) => color(d.parent.data.id))
      .transition(t)


    cell.enter()
      .append('g')
      .attr('title', (d:any) => d.data.id + '\n' + d.value)
      .append('rect')
      .attr('id', (d:any) => {
        return d.data.id
      })
      .transition(t)
      .attr('transform', (d:any) => {
        return 'translate(' + d.x0 + ',' + d.y0 + ')'
      })

    cell.exit().transition(t).remove();


    cell.append('clipPath')
      .attr('id', (d) => 'clip-' + d.data.id)
      .append('use')
      .attr('xlink:href', (d) => '#' + d.data.id)
    */


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
