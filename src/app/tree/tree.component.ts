import {
  Input,
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges, // used with input
  ElementRef,
  ViewChild,
  ViewContainerRef,
  ComponentFactory,
  ComponentFactoryResolver,
  ReflectiveInjector,
  SimpleChanges,
  trigger,
  state,
  animate,
  style,
  transition
} from '@angular/core';

import { TreeElementComponent } from  './tree-element/tree-element.component';

import { Subject, Observable } from 'rxjs';
//import 'rxjs/add/operator/catch';
//import 'rxjs/add/operator/debounceTime';
//import 'rxjs/add/operator/distinctUntilChanged';
//import 'rxjs/add/operator/map';
//import 'rxjs/add/operator/switchMap';
//import 'rxjs/add/operator/toPromise'
//import 'rxjs/add/operator/just';

import * as D3 from 'd3';
import { nest } from 'd3-collection';

let template = function(p, i) {
  return '<span class="name hoverunderline">'+(p.data.name||p.data.data.name)+'</span><span class="spacer"></span><span class="depth">1</span>'
};

@Component({
  selector: 'app-tree',
  animations: [],
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.less'],
  entryComponents: [TreeElementComponent]
})
export class TreeComponent implements OnInit, OnChanges, AfterViewInit {
  private host;
  private htmlElement: HTMLElement;

  private childComponentFactory;
  private sink: Subject<any> = new Subject();
  private sinkReady: Subject<any> = new Subject();

  @Input() tree: any[];

  @ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef
  ) { }

  ngOnInit(): void {
    this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(TreeElementComponent);
    let source = this.sink.bufferWhen(()=>this.sinkReady.asObservable()).flatMap(arrayOfObservables=>{
      let observables = arrayOfObservables.map(el=>el.emitter.map((v)=>{
        return {
          component: el.component,
          index: el.index,
          value: v
        }
      }));
      return Observable.merge(observables);
    }).flatMap(el=>{ // double nested
      return el;
    });
    let drags = source.filter((f:any)=>f.value['type']=='on');
    let dragOvers = source.filter((f:any)=>f.value['type']=='over').distinctUntilChanged((a:any, b:any)=>a.component===b.component);
    Observable.combineLatest(drags, dragOvers).subscribe(both => {
      let d1 = both[0].component.data.data
      let d2 = both[1].component.data.data
      console.log((d1.data ? d1.data.name : d1.name) + ':', 'over', d2.data ? d2.data.name : d2.name);
    });
  };

  // probably(?) a mem leak
  createChildComponent(data?, index?) {
    data = data || {};
    // what's fed to the component (and what is it called)
    let inputProviders = [{
      provide: 'data',
      useValue: data
    }];
    let resolvedInputs = ReflectiveInjector.resolve(inputProviders);
    let injector = ReflectiveInjector.fromResolvedProviders(resolvedInputs, this._parent.parentInjector);
    let componentRef = this.childComponentFactory.create(injector);
    this.sink.next({emitter: componentRef.instance.dragEmitter, component: componentRef.instance, index: index});
    //let observ = Observable.fromEvent(componentRef.instance.dragEmitter, 'data');///u.subscribe(this.subEventFac(componentRef))
    //this.events = this.events ? Observable.merge(this.events, observ) : observ;
    this._parent.insert(componentRef.hostView);
    return componentRef.instance.element.nativeElement;
  }

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('.tree');
    this.host = D3.select(this.htmlElement);
    this.host.html('');
    //this.update(this.tree, false);
  }

  update(tree: any[], anim?) {
    anim = anim == null ? true : anim;

    this.host.style('height', tree.length*40 + 'px');

    let text = this.host.selectAll('app-tree-element')
      .data(tree, function(d){return d.data.id});

    if(!anim) {
      text.enter().append(this.createChildComponent.bind(this))
        .attr('tabindex', 1)
        .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
        .style('z-index', (el, i)=>i+1)
        .style('opacity', 1)
        .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')
      this.sinkReady.next(true);
      return;
    }

    let t = D3.transition(null)
      .duration(250);

    text.exit()
      .transition(t)
      .style('opacity', 1e-6)
      .remove(el=> {
        console.log('removing...', el);
      });

    text.style('opacity', 1)
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
      .style('z-index', (el, i)=>i+1)
      .transition(t)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')

    text.enter().append(this.createChildComponent.bind(this))
      .attr('tabindex', 1)
      //.attr('class', 'shadow')
      .style('transform', (el, i)=>'translate(-10%, ' + (i*40) + 'px)')
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
      .style('opacity', 0)
      .style('z-index', (el, i)=>i+1)
      .transition(t)
      .style('opacity', 1)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')

    this.sinkReady.next(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.host) this.update(this.tree);
  };
}
