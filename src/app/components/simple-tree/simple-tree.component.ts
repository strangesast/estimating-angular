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

import { Subscription, Subject, Observable, ReplaySubject, BehaviorSubject } from 'rxjs';

import {
  SIMPLE_TREE_ELEMENT_SELECTOR,
  SimpleTreeElementComponent
} from './simple-tree-element/simple-tree-element.component';

import { waitForTransition } from '../../resources/util';

import { interpolate, transition, select, Selection, HierarchyNode } from 'd3';
import { hierarchy } from 'd3-hierarchy';

let cnt = 0;

const TEST_DATA = [
  {
    data: {
      name: 'test',
      description: 'testtttttttttttttttt'
    },
    depth: 0,
    height: 1,
    parent: null,
    children: [],
    value: null
  }
]

@Component({
  selector: 'app-simple-tree',
  templateUrl: './simple-tree.component.html',
  styleUrls: ['./simple-tree.component.less']
})
export class SimpleTreeComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() rootNode: ReplaySubject<HierarchyNode<any>|HierarchyNode<any>[]>;
  @ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref

  //private nodesSubject: ReplaySubject<HierarchyNode<any>[]> = new ReplaySubject(1);
  private host: Selection<any, any, any, any>;
  private htmlElement: HTMLElement;
  private childComponentFactory: ComponentFactory<any>;
  private childComponents: Subject<any[]> = new Subject();
  @Output() componentEdit: Subject<any> = new Subject();

  private elementComponentRefMap: Map<HTMLElement, ComponentRef<any>>;
  private nodeSub: Subscription;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef
  ) { }

  ngOnInit() {
    this.elementComponentRefMap = new Map();
    this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(SimpleTreeElementComponent);
    this.childComponents.switchMap(components => {
      return Observable.merge(...components.map(component => component.instance.edit));
    }).subscribe(this.componentEdit);
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
    this.htmlElement = this.element.nativeElement.querySelector('ul');
    this.host = select(this.htmlElement);
    this.nodeSub = this.rootNode.switchMap(this.subjectUpdate.bind(this)).subscribe(this.childComponents);
  }

  subjectUpdate(nodes:HierarchyNode<any>[]): Observable<any> {
    if(!Array.isArray(nodes)) nodes = [nodes];
    if(!this.host || !nodes) return Observable.never();

    let arr:any = nodes.map(node => node.descendants()).reduce((a, b)=>a.concat(b), []);
    let selection = this.host.selectAll(SIMPLE_TREE_ELEMENT_SELECTOR);

    let t = transition(null).duration(100);

    let withData = selection.data(arr, (d:any) => d.temp || (d.temp = ++cnt))

    let toRemove = withData
      .exit()
      .transition(t)
      .styleTween('opacity', interpolate.bind(null, 1,0))
      .remove();

    let toAdjust = withData.transition(t).style('opacity', 1);

    let toAdd = withData
      .order()
      .enter()
      .append(this.createChildComponent.bind(this))
      .transition(t)
      .styleTween('opacity', interpolate.bind(null, 0,1))

    return Observable.forkJoin(...[toRemove, toAdjust, toAdd].map(waitForTransition)).map(([removed, adjusted, added]:[any[], any[], any[]]) => {
      removed.forEach(el => {
        return this.removeChildComponent(el.element);
      });

      let remaining = [].concat(adjusted, added)
      return remaining.map(({element, data, index}) => {
        let component = this.elementComponentRefMap.get(element);
        component.instance.data = data;
        return component;
      });
    });

  }

  ngOnChanges(changes: any) {
    if('rootNode' in changes) {
      if(this.nodeSub) this.nodeSub.unsubscribe();
      this.nodeSub = this.rootNode.switchMap(this.subjectUpdate.bind(this)).subscribe(this.subjectUpdate);
    }
  }
}
