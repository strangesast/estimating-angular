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

import { Observable, BehaviorSubject } from 'rxjs';
import { Selection, HierarchyNode } from 'd3';
import * as D3 from 'd3';

let cnt = 0;

@Component({
  selector: 'app-nest',
  templateUrl: './nest.component.html',
  styleUrls: ['./nest.component.less']
})
export class NestComponent implements OnInit {
  @Input() nest: any;
  @Input() roots: any;
  @Input() data: any[];

  // should be replaysubject
  private nestSubject: BehaviorSubject<any>;

  //@ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref
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
    //this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(SimpleTreeElementComponent);
  }

  /*
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

  */
  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('div');
    this.host = D3.select(this.htmlElement);
    this.nest.switchMap(this.subjectUpdate.bind(this)).subscribe(result => console.log('nest update result', result)); 
    //this.update(this.nest);
  }

  subjectUpdate({ entries, keys }) {
    let arr:any = [];

    console.log('entries', entries, 'keys', keys);

    let nest = D3.nest()
    keys.forEach(key => {
      nest = nest.key((d:any) => d.folders[key.data.type]);
    });
    let data = nest.entries(entries);
    console.log('data', data);

    let s = this.host;

    this.host.selectAll('ul').data(data).enter().append('ul').text((d)=>d.key).selectAll('li').data(d=>d.values).enter().append('li').text(d=>d.name);

    keys.forEach(key => {
      s = s.selectAll('ul').data(data).enter().append('ul').text(d => d.key)
      data = data.map(d => d.values);
    });

    s.selectAll('li').data(d=>d.values).enter().append('li').text(d=>d.name);




    return Observable.never();

    /*
    this.nest.map(el => {
      console.log('el', el);
      if('key' in el) {
        el.values.map(bel => {
          console.log('bel', bel);
          if('key' in el) {
          } else {
          }
        });
      } else {

      }
    });
    */

   /*
    selection
      .order()
      .data(this.nest[0])
      .enter()
      .append('div')
      //.append(this.createChildComponent.bind(this))
      //.style('top', (el, i) => (i*40) + 'px');
      */
  }

  ngOnChanges(changes: any) {
    /*
    if('nest' in changes) {
      this.update(this.nest);
    }
    */
  }
}
