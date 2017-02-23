import { Input, Component, ComponentRef, ComponentFactory, ComponentFactoryResolver, ReflectiveInjector, OnInit, AfterViewInit, ViewChild, ViewContainerRef } from '@angular/core';

import { Selection } from 'd3';
import * as D3 from 'd3';

import { ExampleComponent, ExampleComponentSelector } from './example-component/example-component.component';

@Component({
  selector: 'app-d3-example',
  templateUrl: './d3-example.component.html',
  styleUrls: ['./d3-example.component.less']
})
export class D3ExampleComponent implements OnInit, AfterViewInit {
  @Input() data;
  @ViewChild('container', { read: ViewContainerRef}) container: ViewContainerRef;
  host: Selection<any, any, any, any>;
  factory: ComponentFactory<any>;
  map: Map<any, ComponentRef<any>>;

  constructor(private factoryResolver: ComponentFactoryResolver) { }

  ngOnInit() {
    this.factory = this.factoryResolver.resolveComponentFactory(ExampleComponent);
    this.map = new Map();
  }

  create(data, index) {
    let inputProviders = [
      { provide: 'data', useValue: data }
    ];
    let resolvedInputs = ReflectiveInjector.resolve(inputProviders);
    let injector = ReflectiveInjector.fromResolvedProviders(resolvedInputs, this.container.parentInjector);
    let componentRef = this.factory.create(injector);
    this.container.insert(componentRef.hostView);
    this.map.set(data, componentRef);
    return componentRef.instance.elementRef.nativeElement;
  }

  remove(data) {
    let componentRef = this.map.get(data);
    if (componentRef) {
      componentRef.destroy();
      this.map.delete(data);
    }
  }
  
  ngAfterViewInit() {
    this.host = D3.select(this.container.element.nativeElement);
  }

  render(): void {
    let selection = this.host.selectAll(ExampleComponentSelector);

    let data = this.data;

    let d = selection.data(data);

    let t = D3.transition(null)
      .duration(500);

    let toRemove = d.exit()
      .transition(t)
      .each(this.remove.bind(this))
      .remove()

    let toAdd = d.enter()
      .append(this.create.bind(this))
      .transition(t)
  }

}
