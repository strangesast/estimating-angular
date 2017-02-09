import { ElementRef, Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import * as D3 from 'd3';
import { Selection, HierarchyNode } from 'd3';

import { ElementService } from '../../services/element.service';
import { JobService } from '../../services/job.service';
import { TreeService } from '../../services/tree.service';
import { Collection, ChildElement, ComponentElement, FolderElement } from '../../models';

function currency(num) {
  return '$' + Math.floor(num*100)/100;
}

@Component({
  selector: 'app-estimating-page',
  templateUrl: './estimating-page.component.html',
  styleUrls: ['../../styles/general.less', './estimating-page.component.less']
})
export class EstimatingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private jobSubject: BehaviorSubject<Collection>;
  private nestSubject: BehaviorSubject<any>;
  private nestConfig: BehaviorSubject<any>;
  private nestSubscription: Subscription;
  private treesSubject: BehaviorSubject<any>;
  private treesSubscription: Subscription;

  private hostReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private htmlElement: HTMLElement;
  private host: Selection<any, any, any, any>;

  public selectedFolder: string;
  public folderNames: any[];
  private selectedFolderSubject: BehaviorSubject<string> = new BehaviorSubject(null);

  private groupBy:'buy'|'sell' = 'buy';
  private groupByOptions = ['buy', 'sell'];
  private groupBySubject: BehaviorSubject<string> = new BehaviorSubject('buy');

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private element: ElementRef,
    private elementService: ElementService,
    private treeService: TreeService
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({ job: { collectionSubject: jobSubject, nestConfigSubject: nestConfig, nestSubject, trees:treesSubject }}) => {
      this.jobSubject = jobSubject;
      this.nestSubject = nestSubject;
      this.nestConfig = nestConfig;

      jobSubject.take(1).subscribe((job) => {
        this.selectedFolder = job.folders.order[0];
        this.folderNames = job.folders.order.concat(null).map(name => ({ value: name, display: (name || 'none')[0].toUpperCase() + (name || 'none').slice(1)}));
        this.selectedFolder = null;
        this.nestSubscription = Observable.combineLatest(nestConfig, this.selectedFolderSubject, this.groupBySubject).withLatestFrom(jobSubject).switchMap(([[config, selectedFolder, groupBy], job]) => Observable.fromPromise(this.treeService.nest(job, config)).switchMap(res => this.blobUpdate(res, selectedFolder, groupBy))).subscribe();
      });

      /*
      (this.treesSubject = treesSubject).withLatestFrom(this.groupBySubject).take(1).switchMap(this.treesSubjectUpdate.bind(this)).subscribe();
      this.treesSubscription = Observable.combineLatest(this.treesSubject, this.groupBySubject).skip(1).switchMap(this.treesSubjectUpdate.bind(this)).subscribe();
      */
      
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

  blobUpdate({ children, components, folders }, selectedFolder, groupBy) {
    if (!folders.length) return Observable.never();

    let folderIndex = this.folderNames.map(o => o.value).indexOf(this.selectedFolder);
    let folder = folders[folderIndex];

    let max = Number.NEGATIVE_INFINITY, min = Number.POSITIVE_INFINITY;
    let root;
    if (this.selectedFolder == null) {
      root = D3.hierarchy({ children, totalSell: children.map(child => child.totalSell).reduce((a, b) => a + b), totalBuy: children.map(child => child.totalBuy).reduce((a, b) => a + b) });

    } else {
      root = D3.hierarchy(folder, (n) => {
        if (n instanceof FolderElement) {
          return (n.children || []).concat(children.filter(c => c.folders[folderIndex] === n.id));
        }
      })
    }
    root = root
      .sum(n => n[groupBy == 'sell' ? 'totalSell' : 'totalBuy'])
      .sort((a, b) => a.value - b.value)

    root.each(n => {
      max = Math.max(n.value, max);
      min = Math.min(n.value, min);
    });

    let color = D3.scaleLinear()
      .domain([min, max])
      .interpolate(<any>D3.interpolateHcl)
      .range(<any>[D3.rgb('#E0E0E0'), D3.rgb('#707070')])

    let pack = D3.pack().size([1000, 1000])

    let svg = this.host.select('svg.pack');

    let nodes = svg.selectAll('g')
      .data(pack(root).descendants(), (el: any) => el.data.id)

    let t = D3.transition(null).duration(500);

    let add = nodes
      .enter()
      .append('g')
      .attr('class', (d) => !(d instanceof ChildElement) ? 'folder' : 'child')

    add.attr('transform', (d) => 'translate(' + d.x + ', ' + d.y + ')')

    nodes.exit()
      .transition(t)
      .remove()

    nodes.exit().select('circle').transition(t)
      .attrTween('stroke-opacity', (d) => <any>D3.interpolate(1.0, 0))

    nodes
      .transition(t)
      .attr('transform', (d) => 'translate(' + d.x + ', ' + d.y + ')')

    let circle = add.append('circle')
      .attr('r', (d: any) => d.r)

    add.append('title')
      .text((d: any) => d.data.name + ' (' + currency(d.value) + ')')

    add.filter(d => d.data instanceof ChildElement)
      .append('text')
      .text((d) => currency(d.value))
      .attr('text-anchor', 'middle')

    add.filter(d => d.data instanceof FolderElement)
      .on('mouseover', function() {
        D3.select(this).select('text').transition().duration(100).attrTween('fill-opacity', () => <any>D3.interpolate(0, 1)); 
      })
      .on('mouseout', function() {
        D3.select(this).select('text').transition().delay(500).duration(500).attrTween('fill-opacity', () => <any>D3.interpolate(1, 0)); 
      })
      .append('text')
      .attr('y', (d) => -(d.r + 10))
      .attr('text-anchor', 'middle')
      .attr('fill-opacity', 0)
      .text((d) => currency(d.value))

    nodes.select('circle').transition(t).attr('r', (d) => d.r);

    let notChild = circle.filter(d => !(d.data instanceof ChildElement))

    notChild.transition(t)
      .attrTween('stroke-opacity', (d) => <any>D3.interpolate(0, 1.0))

    notChild
      .attr('fill', 'grey')
      .attr('fill-opacity', 0.0)
      .attr('stroke', 'grey')
      .attr('stroke-width', 2)
      .filter(d => d.data instanceof FolderElement)
      .on('dblclick', (node: any) => {
        let config = this.nestConfig.getValue()
        if (config.folders.roots[node.data.type] !== node.data.id) {
          config.folders.roots[node.data.type] = node.data.id;
          this.nestConfig.next(config);
        } else {
          this.gotoParent();
        }
      })


    circle.filter(d => d.data instanceof ChildElement)
      .attr('fill', (d) => color(d.value))
      .attr('fill-opacity', 1.0)
      .attr('stroke', 'grey')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0)
      .on('mouseover', function() {
        D3.select(this).attr('stroke-opacity', 0.5);
      })
      .on('mouseout', function() {
        D3.select(this).attr('stroke-opacity', 0);
      })


    return Observable.never();
  }

  async gotoParent(current?) {
    let folderName = this.selectedFolder;
    let config = this.nestConfig.getValue();
    current = current || config.folders.roots[folderName];
    if (current == null) return;
    let par = await this.treeService.getParent(current);
    if (par) {
      config.folders.roots[folderName] = par.id
      this.nestConfig.next(config);
    }
  }


  treeUpdate(data, groupBy) {
    let fader = (c) => D3.interpolateRgb(c, '#fff')(0.2);
    let color = D3.scaleOrdinal(D3.schemeCategory20.map(fader));

    let treemap = D3.treemap()
      .tile(D3.treemapResquarify)
      .size([500, 500])
      .round(true)
      .paddingInner(1);

    let svg = this.host.selectAll('svg.hierarchy').data(data);

    let cell = svg.enter()
      .append('svg')
      .attr('class', 'hierarchy')
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
      .append('title')
      .text((d:any) => {
        return d.data.name + ' (' + currency(d.value) + ')';
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

  selectedFolderChanged(evt) {
    if (this.selectedFolder == 'null') this.selectedFolder = null;
    this.selectedFolderSubject.next(this.selectedFolder);
  }

  ngOnDestroy() {
    this.nestSubscription.unsubscribe();
    //this.treesSubscription.unsubscribe();
  }

}
