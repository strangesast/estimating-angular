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

import { Subject, Observable } from 'rxjs';

import * as D3 from 'd3';
import { nest } from 'd3-collection';

import { TreeElementComponent } from  './tree-element/tree-element.component';
import { TreeOptions } from '../tree-options';
import { defaultOptions } from '../defaults'; // annoying

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

  private dragging: boolean = false;

  @Input() tree: any[];
  @Input() options: TreeOptions;

  @ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef
  ) { }

  ngOnInit(): void {
    this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(TreeElementComponent);
    let source = this.sink.bufferWhen(()=>this.sinkReady.asObservable()).flatMap(arrayOfObservables=>{
      return Observable.merge(arrayOfObservables.map(el=>el.emitter.map((v)=>{
        return {
          component: el.component,
          index: el.index,
          value: v
        }
      })));
    }).mergeAll();


    let lastDragged, lastMoved;
    [lastDragged, lastMoved] = source.partition((x:any)=> x.value['type']=='on');

    let isDragging = lastDragged.map(x=>x.value.value=='start').do(dragging=>this.dragging = dragging);

    let lastEnter, lastLeave;
    [lastEnter, lastLeave] = lastMoved.partition((x:any)=>x.value.value=='enter');

    // return enter immediately, leave after delay if no new enter supercedes it
    
    let hasMoved = Observable.combineLatest(lastEnter, lastLeave)
      .switchMap(([a,b]:[any,any])=>a.component==b.component?Observable.of(b).delay(100):Observable.of(a))
      .distinct();

    Observable.combineLatest(isDragging, hasMoved).switchMap(([a,b]:[any,any])=>{
      let data = b.component.data.data;
      if(!a && b.value.value == 'enter') return Observable.of('dropped in ' + (data.data ? data.data.name : data.name) );
      if(a && b.value['type'] == 'over') return Observable.of((b.value.value == 'enter' ? 'hovered over ' : 'left ') + (data.data ? data.data.name : data.name) );
      return Observable.never();
    }).subscribe(res => {
      console.log('res', res);
    });

    //let hasMoved = Observable.combineLatest(lastEnter, lastLeave).switchMap(([a,b]:[any,any])=>a.component==b.component?Observable.of(false).delay(1000):Observable.of(a)).debounceTime(50);


    //let combined = Observable.combineLatest(lastDragged, hasMoved)
    //.subscribe(([dragged, hovered]:[any, any])=>{
    //  if(hovered) {
    //    let data = hovered.component.data.data;
    //    console.log('entered', data.data ? data.data : data);
    //  } else {
    //    console.log('left');
    //  }
    //});

    //let isDragging = lastDragged.map(x=>x.value.value == 'start').do(dragging=>{ // change dragging state if drag start
    //  this.dragging = dragging;
    //});

    //let lastEnter = lastMoved.filter(x=>x.component != null && x.value.value=='enter');
    //let lastLeave = lastMoved.filter(x=>x.component != null && x.value.value=='leave');

    //let hasMoved = Observable.combineLatest(lastEnter, lastLeave)
    //  // compare enter / leave events - get most recent of two
    //  .map((b:[any,any])=>b[0].component!=b[1].component ? b[0]: false)
    //  // remove duplicate false
    //  .filter(x=>!!x)
    //  .distinct()
    //  .debounceTime(50)

    //Observable.combineLatest(lastDragged, hasMoved)
    //  //.filter(([b1,b2]:[any,any])=>b1.component!=b2.component)
    //  .subscribe(([d, t]:[any, any]) => { // dragged, target
    //  let ci = this.tree.indexOf(d.component.data); // current index
    //  let ti = this.tree.indexOf(t.component.data);
    //  if(ci > -1 && ci != ti && ti > -1) {
    //    let r = this.tree.splice(ci, 1);
    //    this.tree = [].concat(this.tree.slice(0, ti), r, this.tree.slice(ti));
    //    this.update(this.tree);
    //  } else if (ci == -1) {
    //    //this.tree.push(d);
    //    //this.update(this.tree);
    //  }
    //});
  };

  // probably(?) a mem leak
  createChildComponent(data?, index?) {
    data = data || {};
    // what's fed to the component (and what is it called)
    let inputProviders = [{
      provide: 'data',
      useValue: data
    },
    {
      provide: 'options',
      useValue: this.options
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
    //if(this.pendingUpdate) clearTimeout(this.pendingUpdate);
    // hacked
    //this.pendingUpdate = window.setTimeout(()=>{
    //  if(this.host) this.update(this.tree)
    //}, 100);
  }

  update(tree: any[], anim?) {
    anim = anim == null ? true : anim;

    this.host.style('height', tree.length*40 + 'px');

    let text = this.host.selectAll('app-tree-element')
      .data(tree, function(d){return d.data.id});

    if(!anim) {
      text.enter().append(this.createChildComponent.bind(this))
        .order()
        .attr('tabindex', 1)
        .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
        .style('z-index', (el, i)=>i+1)
        .style('opacity', 1)
        .style('top', (el, i)=>(i*40) + 'px')
      this.sinkReady.next(true);
      return;
    }

    let t = D3.transition(null)
      .duration(250);

    text.exit()
      .transition(t)
      .style('opacity', 1e-6)
      .remove()

    text.style('opacity', 1)
      .order()
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
      .style('z-index', (el, i)=>i+1)
      .transition(t)
      .style('top', (el, i)=>(i*40) + 'px')

    text.enter().append(this.createChildComponent.bind(this))
      .order()
      .attr('tabindex', 1)
      .style('transform', (el, i)=>'translateX(-10%)')
      .style('top', (el, i)=>(i*40) + 'px')
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
      .style('opacity', 0)
      .style('z-index', (el, i)=>i+1)
      .transition(t)
      .style('opacity', 1)
      .style('transform', (el, i)=>'translateX(0)')
      .style('top', (el, i)=>(i*40) + 'px')

    this.sinkReady.next(true);
  }

  pendingUpdate: number;

  ngOnChanges(changes: SimpleChanges) {
    if(this.pendingUpdate) clearTimeout(this.pendingUpdate);
    this.pendingUpdate = window.setTimeout(()=>{
      if(this.host) this.update(this.tree)
    }, 1000);
  };
}
