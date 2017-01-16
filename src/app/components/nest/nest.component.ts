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

import { Subject, Observable, BehaviorSubject, Subscription } from 'rxjs';
import { Selection, HierarchyNode } from 'd3';
import * as D3 from 'd3';

import { waitForTransition } from '../../resources/util';
import { SimpleTreeElementComponent } from '../simple-tree/simple-tree-element/simple-tree-element.component';

import { TypeToClassPipe } from '../../pipes/type-to-class.pipe'
import { Child } from '../../models/classes';

const HEIGHT = 36;
let cnt = 0;

@Component({
  selector: 'app-nest',
  templateUrl: './nest.component.html',
  styleUrls: ['./nest.component.less'],
  providers: [ TypeToClassPipe ]
})
export class NestComponent implements OnInit {
  @Input() nest: any;
  @Input() roots: any;
  @Input() data: any[];
  @Input() order: string[];
  @Output() drag: Subject<any> = new Subject();
  @Output() dropEvt: Subject<any> = new Subject();

  // should be replaysubject
  private nestSubject: BehaviorSubject<any>;

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

    /*
    this.dropEvt.subscribe(dropped => {
      console.log('dropped', dropped)
    });
    */
  }

  createChildComponent(data, index) {
    let inputProviders = [{
      provide: 'data',
      useValue: data
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
    this.nodeSub = this.nest.switchMap(this.subjectUpdate.bind(this)).subscribe(this.childComponents);
    //this.update(this.nest);
  }

  subjectUpdate({ entries, keys }) {
    // store folder ref for D3 access
    let folders = {};
    keys.forEach(folder => folder.descendants().forEach(child => folders[child.data.id] = child));

    this.foldersById = folders;

    // data setup
    let nest = D3.nest();
    keys.forEach(key => nest = nest.key((d:any) => d.data.folders[this.order.indexOf(key.data.type)]));
    let data = nest.entries(entries);

    let root = D3.hierarchy({ values: data, children: [] }, (d) => d.values || d.children);
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
    this.host.style('height', arr.length * HEIGHT + 'px');

    let selection = this.host.selectAll('.item').data(arr, (d) => {
      if(d.data instanceof D3.hierarchy) return d.data.data.id;
      if(d.data.key !== undefined && d.data.values !== undefined) return d.data.key;
      return (d.id || (d.id = ++cnt))
    });

    let t = D3.transition(undefined).duration(500);

    let toRemove = selection.exit()
      //.style('transform', (d:any) => 'translate(' + (d.y - HEIGHT) + 'px' + ',' + d.x + 'px' + ')')
      .transition(t)
      .styleTween('opacity', () => <any>D3.interpolate(1, 0))
      .style('transform', (d:any) => 'translate(' + (d.y - HEIGHT - HEIGHT) + 'px' + ',' + d.x + 'px' + ')')
      .remove();

    let toAdjust = selection
      //.style('transform', (d:any) => 'translateY(' + d.x + 'px' + ')')
      .style('width', (d:any) => 'calc(100% - ' + (d.y - HEIGHT) + 'px' + ')')
      .transition(t)
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
        //component.instance.data = data;
        return component;
      });
    });
  }

  ngOnChanges(changes: any) {
    /*
    if('nest' in changes) {
      this.update(this.nest);
    }
    */
  }
}
