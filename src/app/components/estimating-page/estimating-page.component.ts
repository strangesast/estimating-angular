import { ElementRef, Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import * as D3 from 'd3';
import { Selection, HierarchyNode } from 'd3';

import { ElementService } from '../../services/element.service';
import { JobService } from '../../services/job.service';
import { TreeService } from '../../services/tree.service';
import { Collection, ChildElement, ComponentElement, FolderElement } from '../../models';

@Component({
  selector: 'app-estimating-page',
  templateUrl: './estimating-page.component.html',
  styleUrls: ['../../styles/general.less', './estimating-page.component.less']
})
export class EstimatingPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private jobSubject: BehaviorSubject<Collection>;
  private nestSubject: BehaviorSubject<any>;
  private nestSubscription: Subscription;
  private treesSubject: BehaviorSubject<any>;
  private treesSubscription: Subscription;

  private hostReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private htmlElement: HTMLElement;
  private host: Selection<any, any, any, any>;

  public selectedFolder: string;
  public folderNames: string[];
  private selectedFolderSubject: BehaviorSubject<string>;

  private groupBy:'qty'|'buy'|'sell' = 'qty';
  private groupByOptions = ['qty', 'buy', 'sell'];
  private groupBySubject: BehaviorSubject<string> = new BehaviorSubject('qty');

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

      jobSubject.take(1).subscribe((job) => {
        this.selectedFolder = job.folders.order[0];
        this.selectedFolderSubject = new BehaviorSubject(this.selectedFolder);
        this.folderNames = job.folders.order;
        this.nestSubscription = Observable.combineLatest(nestConfig, this.selectedFolderSubject, this.groupBySubject).withLatestFrom(jobSubject).switchMap(([[config, selectedFolder, groupBy], job]) => Observable.fromPromise(this.treeService.nest(job, config)).switchMap(res => this.blobUpdate2(res, selectedFolder, groupBy))).subscribe();
      });

      (this.treesSubject = treesSubject).withLatestFrom(this.groupBySubject).take(1).switchMap(this.treesSubjectUpdate.bind(this)).subscribe();
      this.treesSubscription = Observable.combineLatest(this.treesSubject, this.groupBySubject).skip(1).switchMap(this.treesSubjectUpdate.bind(this)).subscribe();
      
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

  blobUpdate({ keys, config, rootNode }) {
    let nest = D3.nest();

    //let root = D3.hierarchy({ children: entries });
    //(<any>root).value = root.children.map(n => n.value).reduce((a, b) => a + b);

    let pack = D3.pack().size([100, 100])

    let svg = this.host.select('svg.pack')

    let descendants = pack(rootNode).descendants();
    console.log('d', descendants); 

    let node = svg.selectAll('g').data(descendants)
      .enter()
      .append('g')
      .attr('transform', (d) => 'translate(' + d.x + ', ' + d.y + ')')

    node.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', 'blue')
      .attr('fill-opacity', 0.1)
      .append('title').text((n: any) => n.data.name + ' (' + n.value + ')');

    return Observable.never();
  }

  blobUpdate2({ children, components, folders }, selectedFolder, groupBy) {
    if (!folders.length) return Observable.never();
    //this.selectedFolder = this.selectedFolder || this.folderNames[0];

    let folderIndex = this.folderNames.indexOf(this.selectedFolder);
    let folder = folders[folderIndex];

    let root = D3.hierarchy(folder, (n) => {
      if (n instanceof FolderElement) {
        return (n.children || []).concat(children.filter(c => c.folders[folderIndex] === n.id));
      }
    }).sum(n => n[groupBy == 'sell' ? 'totalSell' : 'totalBuy']);

    let pack = D3.pack().size([1000, 1000])

    let svg = this.host.select('svg.pack');

    let nodes = svg.selectAll('g')
      .data(pack(root).descendants(), (el: any) => el.data.id)

    let t = D3.transition(null).duration(500);


    let add = nodes
      .enter()
      .append('g')
      .attr('class', (d) => d instanceof FolderElement ? 'folder' : 'child')

    add.attr('transform', (d) => 'translate(' + d.x + ', ' + d.y + ')')

    nodes.exit()
      .transition(t)
      .remove()

    nodes.exit().select('circle').transition(t)
      .attrTween('stroke-opacity', (d) => <any>D3.interpolate(1.0, 0))

    nodes
      .transition(t)
      .attr('transform', (d) => 'translate(' + d.x + ', ' + d.y + ')')


    add.append('title')
      .text((d: any) => d.data.name + ' (' + d.value + ')');

    let circle = add.append('circle')
      .attr('r', (d: any) => d.r)

    nodes.select('circle').transition(t).attr('r', (d) => d.r);

    circle.transition(t)
      .attrTween('stroke-opacity', (d) => <any>D3.interpolate(0, 1.0))

    circle.filter(d => d.data instanceof FolderElement)
      .attr('fill', 'grey')
      .attr('fill-opacity', 0.0)
      .attr('stroke', 'grey')
      .attr('stroke-width', 2)

    circle
      .filter(d => d.data instanceof ChildElement)
      .attr('fill', 'grey')
      .attr('fill-opacity', 0.1)

    /*
    add.filter(d => d.data instanceof ChildElement).append('text')
      .attr('text-anchor', 'middle')
      .text((d: any) => d.data.name + '\n' + d.value)
    */

    return Observable.never();
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
      .append('title').text((d:any) => {
        return d.data.name + ' (' + d.value + ')';
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
    this.selectedFolderSubject.next(this.selectedFolder);
  }

  ngOnDestroy() {
    this.nestSubscription.unsubscribe();
    this.treesSubscription.unsubscribe();
  }

}
