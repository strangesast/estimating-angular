import {
  Input,
  Component,
  ComponentRef,
  ComponentFactory,
  ComponentFactoryResolver,
  ReflectiveInjector,
  OnInit,
  OnChanges,
  AfterViewInit,
  ViewChild,
  ViewContainerRef
} from '@angular/core';

import { Selection } from 'd3';
import * as D3 from 'd3';
import { ListElementComponent, ListElementComponentSelector } from './list-element/list-element.component';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.less']
})
export class ListComponent implements OnInit, OnChanges, AfterViewInit {
  private init = false;
  private factory: ComponentFactory<any>;
  private host: Selection<any, any, any, any>;
  private map: Map<any, ComponentRef<ListElementComponent>>;
  @ViewChild('container', { read: ViewContainerRef }) private container: ViewContainerRef;

  @Input() data;
  list: any[]; // rendered order of elements derived from data

  constructor(private factoryResolver: ComponentFactoryResolver) { }

  ngOnInit() {
    this.map = new Map();
    this.factory = this.factoryResolver.resolveComponentFactory(ListElementComponent);
    this.recalculate(this.data)
  }

  ngAfterViewInit() {
    this.host = D3.select(this.container.element.nativeElement);
    this.render()
    this.init = true;
  }

  ngOnChanges(changes) {
    if ('data' in changes && this.init) {
      this.recalculate(this.data).then(() => {
        this.render();
      });
    }
  }

  // create componentRef, return dom element for insertion
  create(data: any, index: number): HTMLElement {
    let inputProviders = [
      { provide: 'data', useValue: data }
    ];
    let resolvedInputs = ReflectiveInjector.resolve(inputProviders);
    let injector = ReflectiveInjector.fromResolvedProviders(resolvedInputs, this.container.parentInjector);
    let componentRef = this.factory.create(injector);
    let element = componentRef.instance.elementRef.nativeElement;
    this.container.insert(componentRef.hostView);
    this.map.set(data, componentRef);
    return element;
  }

  // destroy componentRef
  remove(data) {
    let componentRef = this.map.get(data);
    if (componentRef) {
      componentRef.destroy();
      this.map.delete(data);
    } else {
      throw new Error('component with that data does not exist');
    }
  }

  async recalculate(data) {
    console.log('data', data);
  }

  render(): void {
    let array = [1, 2, 3, 4];

    let selection = this.host.selectAll(ListElementComponentSelector).data(array);
    console.log('selection', selection);

    let toRemove = selection.exit().each(this.remove.bind(this)).remove();

    let toAdd = selection.enter().append(this.create.bind(this));

  }
}
