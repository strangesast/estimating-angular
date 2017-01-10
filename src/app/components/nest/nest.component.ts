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

import { Child } from '../../models/classes';

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
    this.nest.startWith({ entries: null, keys: null }).pairwise().switchMap(this.subjectUpdate.bind(this)).subscribe(result => console.log('nest update result', result)); 
    //this.update(this.nest);
  }

  subjectUpdate([{entries: entriesA, keys: keysA }, { entries: entriesB, keys: keysB }]) {
    let arr:any = [];

    let nest = D3.nest()
    keysB.forEach(key => {
      nest = nest.key(d => d.folders[key.data.type]);
    })

    let data = nest.entries(entriesB);

    let selection = this.host;

    keysB.forEach(key => {
      selection.text(key.data.name)
      selection.selectAll('li').data([]).exit().remove();
      selection = selection.selectAll('ul').data(d => d ? d.values : data).enter().append('ul');
    });

    if(selection == this.host) selection.text('');
    selection.selectAll('ul').data([]).exit().remove();
    selection.selectAll('li').data(d => d ? d.values : data).enter().append('li').text(d => d instanceof Child ? d.name : d.key)
    
    return Observable.never();
  }

  ngOnChanges(changes: any) {
    /*
    if('nest' in changes) {
      this.update(this.nest);
    }
    */
  }
}
