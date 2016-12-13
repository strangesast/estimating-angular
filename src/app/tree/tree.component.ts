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

import { BehaviorSubject, Subject, Observable } from 'rxjs';

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
  private elementComponentRefMap = new Map();
  private childComponents = new Subject();

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
    let source = this.childComponents.switchMap((arr: any[])=>{
      let emitters = arr.map((component, index)=>component.dragEmitter.asObservable().map(data=>{
        return {
          index: index,
          component: component,
          value: data
        };
      }));
      return Observable.from(emitters).mergeAll();
    });

    //let source = this.childComponents.bufferWhen(()=>this.sinkReady.asObservable()).debounceTime(100).flatMap(arrayOfObservables=>{
    //  return Observable.merge(arrayOfObservables.map(el=>el.emitter.map((v)=>{
    //    return {
    //      component: el.component,
    //      index: el.index,
    //      value: v
    //    }
    //  })));
    //}).mergeAll();


    let lastDragged, lastMoved;
    [lastDragged, lastMoved] = source.partition((x:any)=> x.value['type']=='on');

    let lastEnter, lastLeave;
    [lastEnter, lastLeave] = lastMoved.partition((x:any)=>x.value.value=='enter');

    // TODO: this breaks when leaving + re-entering same component
    // return enter immediately, leave after delay if no new enter supercedes it
    let hasMoved = Observable.combineLatest(lastEnter, lastLeave)
      .switchMap(([a,b]:[any,any])=>a.component==b.component?Observable.of(b).delay(100):Observable.of(a))
      .distinct();

    Observable.combineLatest(
      lastDragged.do(x=>this.dragging=x.value.value=='start'),
      hasMoved
    ).subscribe(([dragState,hoverState]:[any,any])=>{
      let isDragging = dragState.value.value == 'start';

      let d1 = dragState.component.data;
      let i1 = this.tree.indexOf(d1);
      let d2 = hoverState.component.data;
      let i2 = this.tree.indexOf(d2);
      //if(i2 == -1) throw new Error('fucked up');
      console.log(i1, i2);

      let { 'type' : t, 'value': v } = hoverState.value;
      // drag not still in progress, last was an enter
      if(!isDragging && v == 'enter') {
        // move to
        //console.log(this.tree.indexOf(d1), this.tree.indexOf(d2));

      // drag not finished and entered / left
      } else if(isDragging && v == 'enter' && i1!=i2) {
        // move to
        let r;
        if(i1 > -1) {
          r = this.tree.splice(i1, 1);
        } else {
          console.log('not present');
          //r = [d1];
          r = [];
        }
        this.tree = [].concat(this.tree.slice(0, i2), r, this.tree.slice(i2));
        this.update(this.tree);

      } else if(isDragging && v == 'leave' && dragState.index != i1) {
        let r;
        if(i1 > -1) {
          r = this.tree.splice(i1, 1);
        } else {
          console.log('not present'); // bad
          r = [];
        }
        this.tree = [].concat(this.tree.slice(0, dragState.index), r, this.tree.slice(dragState.index));
        this.update(this.tree);
      }
    });
  };

  removeChildComponent(element: HTMLElement) {
    let component = this.elementComponentRefMap.get(element);
    component.destroy();
    return this.elementComponentRefMap.delete(element);
  }

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
    this._parent.insert(componentRef.hostView);

    let element = componentRef.instance.element.nativeElement;

    this.elementComponentRefMap.set(element, componentRef);

    return element;
  }

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('.tree');
    this.host = D3.select(this.htmlElement);
    //this.update(this.tree, false);
  }

  update(tree: any[], anim?) {
    console.log('update');
    anim = anim == null ? true : anim;

    this.host.style('height', tree.length*40 + 'px');

    let selection = this.host.selectAll('app-tree-element')
      .data(tree, function(d){return d.data.id});

    let t = D3.transition(null)
      .duration(250);

    // remove
    let toRemove = selection.exit()
    if(anim) toRemove = toRemove.transition(t)
      //.call(endall, function(){console.log('remove all done')})
      .styleTween('opacity', ()=>D3.interpolate(1, 0))

    toRemove = toRemove.remove();

    // adjust
    let toAdjust = selection.order()
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')

    if(anim) toAdjust = toAdjust
      .transition(t)
      //.call(endall, function(){console.log('adjust all done')});

    toAdjust = toAdjust
      .style('top', (el, i)=>(i*40) + 'px')

    // add
    let toAdd = selection
      .enter()
      .append(this.createChildComponent.bind(this))
      .order()
      .style('top', (el, i)=>(i*40) + 'px')
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')

    if(anim) toAdd = toAdd
      .transition(t)
      //.call(endall, ()=>console.log('add all done'))
      .styleTween('opacity', ()=>D3.interpolate(0, 1))

    toAdd = toAdd
      .style('top', (el, i)=>(i*40) + 'px');

    toRemove._groups.slice(0)[0].map(el=>this.removeChildComponent(el));

    let arr = [];
    for(let [prop, val] of this.elementComponentRefMap.entries()) {
      arr.push(val.instance);
    }
    this.childComponents.next(arr);
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.host && 'tree' in changes) this.update(this.tree)
  };
}
