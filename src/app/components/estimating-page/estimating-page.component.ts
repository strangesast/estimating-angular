import { ElementRef, Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router,ActivatedRoute } from '@angular/router';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import * as D3 from 'd3';
import { Selection, HierarchyNode } from 'd3';

import { ClassToStringPipe } from '../../pipes';
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
    private router: Router,
    private pipe: ClassToStringPipe,
    private element: ElementRef,
    private elementService: ElementService,
    private treeService: TreeService
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({ job: { collectionSubject: jobSubject, nestConfigSubject: nestConfig, nestSubject, trees:treesSubject, editWindowsEnabled }}) => {
      editWindowsEnabled.next(true);
      this.jobSubject = jobSubject;
      this.nestSubject = nestSubject;
      this.nestConfig = nestConfig;

      jobSubject.take(1).subscribe((job) => {
        this.selectedFolder = job.folders.order[0];
        this.folderNames = job.folders.order.concat(null).map(name => ({ value: name, display: (name || 'none')[0].toUpperCase() + (name || 'none').slice(1)}));
        this.selectedFolder = null;
        this.nestSubscription = Observable.combineLatest(nestConfig, this.selectedFolderSubject, this.groupBySubject).withLatestFrom(jobSubject).switchMap(([[config, selectedFolder, groupBy], job]) => Observable.fromPromise(this.treeService.nest(job, config)).switchMap(res => this.blobUpdate(res, selectedFolder, groupBy))).subscribe();
      });

    });
  }

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('.graphs');
    this.host = D3.select(this.htmlElement);
    this.hostReady.next(true);
  }

  blobUpdate({ children, components, folders }, selectedFolder, groupBy) {
    if (!folders.length) return Observable.never();

    let pipe = this.pipe;
    let router = this.router;

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
      .sort((a, b) => b.value - a.value)

    root.each(n => {
      max = Math.max(n.value, max);
      min = Math.min(n.value, min);
    });

    let color = D3.scaleLinear()
      .domain([min, max])
      .interpolate(<any>D3.interpolateHcl)
      .range(<any>[D3.rgb('#E0E0E0'), D3.rgb('#707070')])

    let pack = D3.pack().size([1000, 1000]).padding(2);

    let svg = this.host.select('svg.pack');

    let nodes = svg.selectAll('g')
      .data(pack(root).descendants(), (el: any) => el.data.id)

    let t = D3.transition(null).duration(500);

    let add = nodes
      .enter()
      .append('g')
      .attr('class', (d) => !(d instanceof ChildElement) ? 'folder' : 'child')

    add.attr('transform', (d) => 'translate(' + d.x + ', ' + d.y + ')')

    let exiting = nodes.exit()

    exiting.select('circle')
      .transition(t)
      .attrTween('stroke-opacity', (d) => <any>D3.interpolate(1.0, 0))

    exiting
      .transition(t)
      .remove()

    let toRemove = nodes.exit().filter((d: any) => d.data instanceof ChildElement).select('g circle').select('circle').transition(t).attrTween('fill-opacity', (d) => <any>D3.interpolate(1.0, 0));

    nodes
      .transition(t)
      .attr('transform', (d) => 'translate(' + d.x + ', ' + d.y + ')')

    let circle = add.append('circle')
      .attr('r', (d: any) => d.r)
      .on('click', function(data: any) {
        let e = D3.event;
        if (e.ctrlKey) {
          let name = pipe.transform(data.data);
          router.navigate([], { fragment: [name, data.data.id].join('/') });
        }
      })

    add.append('title')
      .text((d: any) => d.data.name + ' (' + currency(d.value) + ')')

    add.filter(d => d.data instanceof FolderElement)
      .sort((a, b) => a.value > b.value ? -1 : 1)
      .on('mouseover', function() {
        D3.select(this).select('text').transition().duration(100).attrTween('fill-opacity', () => <any>D3.interpolate(0, 1)); 
      })
      .on('mouseout', function() {
        D3.select(this).select('text').transition().delay(500).duration(500).attrTween('fill-opacity', () => <any>D3.interpolate(1, 0)); 
      })
      .append('text')
      .attr('y', (d) => -(d.r + 10))
      .attr('text-anchor', 'middle')
      .text((d) => '$' + Math.round(d.value*100)/100)

    nodes.filter(d => d.data instanceof FolderElement)
      .select('g text')
      .attr('fill-opacity', 1)
      .transition(t).tween('text', function(d) {
      let that = D3.select(this);
      let start = +that.text().slice(1);

      let i = D3.interpolate(start, d.value);

      return (t) => {
        that.text('$' + Math.round(i(t)*100)/100);
      };
    });


    nodes.select('circle').transition(t).attr('r', (d) => d.r);

    nodes.filter(d => d.data instanceof FolderElement).select('text').transition(t).attr('y', (d) => -(d.r + 10));

    let notChild = circle.filter(d => !(d.data instanceof ChildElement))
    let isChild = circle.filter(d => d.data instanceof ChildElement)

    notChild.transition(t)
      .attrTween('stroke-opacity', (d) => <any>D3.interpolate(0, 1.0))

    notChild
      //.attr('fill', 'grey')
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

    isChild
      .on('mouseover', function() {
        D3.select(this).attr('stroke-opacity', 0.5);
      })
      .on('mouseout', function() {
        D3.select(this).attr('stroke-opacity', 0);
      })
      .attr('fill', (d) => color(d.value))
      .attr('stroke-width', 1)
      .attr('stroke', 'grey')
      .attr('stroke-opacity', 0)
      .transition(t)
      .attrTween('fill-opacity', (d) => <any>D3.interpolate(0, 1.0))


    add.filter(d => d.data instanceof ChildElement)
      .append('text')
      .text((d) => currency(d.value))
      .attr('text-anchor', 'middle')

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
