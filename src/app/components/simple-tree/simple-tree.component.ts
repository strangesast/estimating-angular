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
  Input
} from '@angular/core';

import {
  SIMPLE_TREE_ELEMENT_SELECTOR,
  SimpleTreeElementComponent
} from './simple-tree-element/simple-tree-element.component';

import { select, Selection, HierarchyNode } from 'd3';
import { hierarchy } from 'd3-hierarchy';

let cnt = 0;

@Component({
  selector: 'app-simple-tree',
  templateUrl: './simple-tree.component.html',
  styleUrls: ['./simple-tree.component.less']
})
export class SimpleTreeComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() rootNode: HierarchyNode<any>;
  @ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref

  private host: Selection<any, any, any, any>;
  private htmlElement: HTMLElement;
  private childComponentFactory: ComponentFactory<any>;
  private elementComponentRefMap: Map<HTMLElement, ComponentRef<any>>;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef
  ) { }

  ngOnInit() {
    this.elementComponentRefMap = new Map();
    this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(SimpleTreeElementComponent);
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

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('div');
    this.host = select(this.htmlElement);
    console.log('host', this.host);
    this.update(this.rootNode);
  }

  update(node:HierarchyNode<any>) {
    if(!this.host) return;
    let arr = node.descendants();
    let selection = this.host.selectAll(SIMPLE_TREE_ELEMENT_SELECTOR);
    console.log('arr', arr);

    selection
      .order()
      .data(arr, (d:any) => d.temp || (d.temp = ++cnt))
      .enter()
      .append(this.createChildComponent.bind(this))
      .style('top', (el, i) => (i*40) + 'px');
  }

  ngOnChanges(changes: any) {
    if('rootNode' in changes) {
      this.update(this.rootNode);
    }
  }
}
