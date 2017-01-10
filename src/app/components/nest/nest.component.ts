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

import { TypeToClassPipe } from '../../pipes/type-to-class.pipe'
import { Child } from '../../models/classes';

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

  // should be replaysubject
  private nestSubject: BehaviorSubject<any>;

  //@ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref
  private host: Selection<any, any, any, any>;
  private htmlElement: HTMLElement;
  private childComponentFactory: ComponentFactory<any>;
  private elementComponentRefMap: Map<HTMLElement, ComponentRef<any>>;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef,
    private typeToClassPipe: TypeToClassPipe
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
    this.htmlElement = this.element.nativeElement.querySelector('ul');
    this.host = D3.select(this.htmlElement);
    this.nest.switchMap(this.subjectUpdate.bind(this)).subscribe();
    //this.update(this.nest);
  }

  subjectUpdate({ entries, keys }) {
    let arr:any = [];

    let nest = D3.nest()
    keys.forEach(key => {
      nest = nest.key((d:any) => d.folders[key.data.type]);
    })

    let data = nest.entries(entries);

    let selection = this.host;

    keys.forEach(key => {
      /*
      let title = selection.select('span').enter().append('span').attr('class', 'title');
      title.append('span').attr('class', ['fa', this.typeToClassPipe.transform(key.data.type)].join(' '));
      title.append('span').text(key.data.name);
      */
      selection.text(key.data.name);
      selection.selectAll('li').data([]).exit().remove();
      selection = selection.selectAll('ul').data(d => d ? d.values : data).enter().append('ul');
    });

    if(selection == this.host) selection.text('');
    selection.selectAll('ul').data([]).exit().remove();
    selection.selectAll('span').data([]).exit().remove();
    selection.selectAll('li').data((d:any) => d ? d.values : data).enter().append('li').text((d:any) => d instanceof Child ? d.name : d.key)
    
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
