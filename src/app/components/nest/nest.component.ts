import {
  ComponentFactoryResolver,
  ReflectiveInjector,
  ComponentFactory,
  ViewContainerRef,
  AfterViewInit,
  ComponentRef,
  ElementRef,
  ViewChild,
  Component,
  OnChanges,
  OnInit,
  Output,
  Input
} from '@angular/core';

import { Subject, Observable, ReplaySubject, Subscription } from 'rxjs';
import { Selection, HierarchyNode } from 'd3';
import * as D3 from 'd3';

import { waitForTransition } from '../../resources/util';
import { SimpleTreeElementComponent } from '../simple-tree/simple-tree-element/simple-tree-element.component';

import { ClassToStringPipe, TypeToClassPipe } from '../../pipes';
import { ChildElement } from '../../models';

const HEIGHT = 36;
let cnt = 0;

function addEmptyFolders(arr, nodes, enabled = [true, true]) {
  if(nodes.length) {
    if(nodes.length > 1) arr.forEach(({ key, values }) => addEmptyFolders(values, nodes.slice(1), enabled.slice(1)));
    if(enabled[0]) {
      let ids = arr.map(el => el.key)
      let desired = nodes[0].descendants().map(el => el.data.id);
      desired.forEach(id => {
        if(ids.indexOf(id) === -1) {
          arr.push({ key: id, values: [] });
        }
      });
    }
  }
}


@Component({
  selector: 'app-nest',
  templateUrl: './nest.component.html',
  styleUrls: ['./nest.component.less'],
  providers: [ TypeToClassPipe, ClassToStringPipe ]
})
export class NestComponent implements OnInit {
  @Input() nest: any;
  @Input() roots: any;
  @Input() data: any[];
  @Input() config: any = {};
  @Input() order: string[];
  @Output() drag: Subject<any> = new Subject();
  @Output() dropEvt: Subject<any> = new Subject();

  // should be replaysubject
  private nestSubject = new ReplaySubject();

  @ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref
  private host: Selection<any, any, any, any>;
  private htmlElement: HTMLElement;
  private childComponentFactory: ComponentFactory<any>;
  private elementComponentRefMap: Map<HTMLElement, ComponentRef<any>>;
  private childComponents: Subject<any[]> = new Subject();
  private nodeSub: Subscription;

  private foldersById: any;
  private currentTree: any;
  private currentRoot: any;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef,
    private typeToClassPipe: TypeToClassPipe
  ) { }

  ngOnInit() {
    this.elementComponentRefMap = new Map();
    this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(SimpleTreeElementComponent);

    this.childComponents.switchMap(components => Observable.merge(...components.map(({instance}) => instance.drag))).subscribe(this.drag);
    this.childComponents.switchMap(components => Observable.merge(...components.map(({instance}) => instance.dropEvt))).subscribe(this.dropEvt);
  }

  createChildComponent(data, index) {
    let inputProviders = [{
      provide: 'data',
      useValue: data
    }, {
      provide: 'config',
      useValue: this.config
    }];
    let resolvedInputs = ReflectiveInjector.resolve(inputProviders);
    let injector = ReflectiveInjector.fromResolvedProviders(resolvedInputs, this._parent.parentInjector);
    let componentRef = this.childComponentFactory.create(injector);
    this._parent.insert(componentRef.hostView);
    let element = componentRef.instance.elementRef.nativeElement;
    componentRef.instance.dragEnabled = false;
    componentRef.instance.startAt = -1;
    this.elementComponentRefMap.set(element, componentRef);
    return element;
  }

  removeChildComponent(element: HTMLElement) {
    let component = this.elementComponentRefMap.get(element);
    let res = this.elementComponentRefMap.delete(element);
    component.destroy();
    return res;
  }

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('div');
    this.host = D3.select(this.htmlElement);
    this.nodeSub = this.nest.filter(x => !!x).switchMap(this.subjectUpdate.bind(this)).subscribe(this.childComponents);
  }

  subjectUpdate({ entries, keys, config }) {
    // store folder ref for D3 access
    let folders = {};
    let folderOrders = {};

    keys.forEach(folder => {
      let type = folder.data.type;
      folderOrders[type] = [];
      folder.eachBefore(n => {
        let id = n.data.id;
        folderOrders[type].push(id);
        folders[id] = n.copy();
      })
    });

    this.foldersById = folders;

    // data setup
    let nest = D3.nest();
    // sort keys by position in hierarchy
    keys.forEach(key => nest = nest.key((d:any) =>
      d.data.folders[this.order.indexOf(key.data.type)]).sortKeys((a, b) => {
        let i = folderOrders[key.data.type].indexOf(a);
        let j = folderOrders[key.data.type].indexOf(b);
        return i < j ? -1 : i > j ? 1 : a < b ? -1 : 1;
      }));

    let data = nest.entries(entries);

    let root;
    if (config.component.enabled) {
      // if empty folders
      let enabled = config.folders.order.filter(n => config.folders.enabled[n]).map(n => !!config.folders.filters[n].find(f => f.type == 'emptyFolders'));
      addEmptyFolders(data, keys, enabled);
      root = D3.hierarchy({ values: data, children: [] }, (d) => d.values || d.children);

    } else {
      root = D3.hierarchy(keys[0]);
    }
    this.currentRoot = root;

    let tree = (<any>D3).tree().nodeSize([0, HEIGHT]);

    this.currentTree = tree;

    let node = tree(root);

    return this.update(node);
  }

  update(source) {
    let arr = [];
    source.eachBefore((n) => n !== this.currentRoot ? arr.push(n) : null);

    arr.forEach((n, i) => {
      n.x = i * HEIGHT;
    });

    let selection = this.host.selectAll('.item').data(arr, (d) => {
      if(d.data instanceof D3.hierarchy) {
        if (d.data.data instanceof ChildElement) {
          return d.data.ancestors().map(n => n.data.id).join('');
        }
        return d.data.data.id;
      }
      if(d.data.key !== undefined && d.data.values !== undefined) return d.data.key;
      return (d.id || (d.id = ++cnt))
    })

    let t = D3.transition(undefined).duration(500);

    this.host.transition(t).style('height', arr.length * HEIGHT + 'px');
    //let width = this.host.node().getBoundingClientRect().width;

    let toRemove = selection.exit()
      .style('transform', (d:any) => 'translate(' + (d.y - HEIGHT) + 'px' + ',' + d.x + 'px' + ')')
      .transition(t)
      .styleTween('opacity', () => <any>D3.interpolate(1, 0))
      .style('transform', (d:any) => 'translate(' + (d.y - HEIGHT - HEIGHT) + 'px' + ',' + d.x + 'px' + ')')
      .remove();

    let toAdjust = selection
      .style('opacity', 1)
      .order()
      .transition(t)
      //.style('width', (d:any) => (width - d.y + HEIGHT) + 'px')
      .style('width', (d:any) => 'calc(100% - ' + (d.y - HEIGHT) + 'px' + ')')
      .style('transform', (d:any) => 'translate(' + (d.y - HEIGHT) + 'px' + ',' + d.x + 'px' + ')')

    let toAdd = selection.enter()
      .append((n, i) => {
        if(n.data instanceof D3.hierarchy) {
          return this.createChildComponent(n.data, i);
        } else if (n.data.key !== undefined) {
          let id = n.data.key;
          return this.createChildComponent(this.foldersById[id], i);
        } else {
          throw new Error('unexpected node type')
        }
      })
      .attr('class', 'item')
      //.style('width', (d:any) => (width - d.y + HEIGHT) + 'px')
      .style('width', (d:any) => 'calc(100% - ' + (d.y - HEIGHT) + 'px' + ')')
      .style('transform', (d:any) => 'translate(' + (d.y - HEIGHT - HEIGHT) + 'px' + ',' + d.x + 'px' + ')')
      .transition(t)
      .styleTween('opacity', () => <any>D3.interpolate(0, 1))
      .style('transform', (d:any) => 'translate(' + (d.y - HEIGHT) + 'px' + ',' + d.x + 'px' + ')')

    return Observable.forkJoin(...[toRemove, toAdjust, toAdd].map(waitForTransition)).map(([removed, adjusted, added]:[any[], any[], any[]]) => {
      removed.forEach(el => {
        return this.removeChildComponent(el.element);
      });

      let remaining = [].concat(adjusted, added)
      return remaining.map(({element, data, index}) => {
        let component = this.elementComponentRefMap.get(element);
        // TODO: fix this
        //component.instance.data = data.data instanceof D3.hierarchy ? data.data : data;
        return component;
      });
    });
  }

  /*
  ngOnChanges(changes: any) {
    if('nest' in changes) {
      this.nestSubject.next(this.nest);
    }
  }
  */
}
