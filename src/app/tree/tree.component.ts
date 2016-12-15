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

import { BehaviorSubject, Subject } from 'rxjs';
import {Observable} from 'rxjs/Rx';

import * as D3 from 'd3';
import { nest } from 'd3-collection';

import { TreeElementComponent } from  './tree-element/tree-element.component';
import { TreeOptions } from '../tree-options';
import { defaultOptions } from '../defaults'; // annoying

let waitForTransition = function(_transition) {
  return Observable.create(subscriber => {
    let size = _transition.size();
    if(size === 0) subscriber.complete();
    let n = 0;
    _transition.each(()=>++n).on('end', function(d, i) {
      subscriber.next({element: this, data: d, index: i}); // this == html element
      if(!--n) subscriber.complete();
    });
  }).toArray();
}

const ANIMATION_TIME = 250; // ms

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

  private childEventSourceContainer = new Subject();
  private childEventSource = new Subject();

  private dragging: boolean = false;
  private isDragging = new Subject();

  private hostSubject: Subject<any> = new Subject();
  private treeSubject: BehaviorSubject<any[]>;

  private dragSink: Subject<any> = new Subject();

  @Input() tree: any[];
  @Input() options: TreeOptions;

  @ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef
  ) { }

  ngOnInit(): void {
    this.treeSubject = new BehaviorSubject([]);
    this.treeSubject
      .skipUntil(this.hostSubject) // wait for host to load in afterViewInit, only 
      .distinct()
      .switchMap(this.subjectUpdate.bind(this)) // call subject update, interrupt if necessary
      .subscribe(this.childComponents); // feed into childcomponents

    this.childComponents.map(
      (components:any[])=>Observable.merge(...components.map(
        ({instance: component})=>component.dragEmitter
      )))
      .subscribe(this.dragSink); // on childcomponents update, update drag listeners

    let source = this.dragSink.switchMap(el=>el);
    let arr = ['dragstart', 'drop', 'dragend'];
    let [dragged, draggedOver] = source.partition(({event:{type:t},component:c})=>arr.indexOf(t)!=-1);

    let [dragStart, dragEnd] = dragged.partition(({event:{type:t}})=>t=='dragstart'); // dragstart OR dragend, drop

    let currentDrag=null;
    let initialPosition=null;
    draggedOver
      .switchMap((evt:any)=>{
        let t = evt.event.type;
        return t == 'dragenter' ? Observable.of(evt) : t == 'dragover' ? Observable.never() : Observable.of(evt).delay(500);
      })
      // may be longer, shorter fails to call 'this.dragging = false' for some reason
      // shouldn't be shorter than animation time
      .debounceTime(ANIMATION_TIME)
      // create window formed by start/end/drop
      .windowToggle(dragStart.withLatestFrom(this.treeSubject).do(([{component}, tree]:[any,any[]])=>{
        this.dragging = true; // disable pointer events
        initialPosition = tree.indexOf(component.data); // store for reset
        currentDrag=component; // store dragged element
      }), ()=>dragEnd)
      // drag window sequence (may be interrupted)
      .switchMap(ob=>{
        return ob.finally(()=>{
          this.dragging = false;
        });
      })
      // use the most recent tree (might be updated by the following)
      .withLatestFrom(this.treeSubject).subscribe(([{component, event:{type:t}}, tree])=>{
        let currentPosition = tree.indexOf(currentDrag.data);
        let desiredPosition = tree.indexOf(component.data);

        // should error if these dont hold
        if(currentPosition != -1) {
          let r = tree.splice(currentPosition, 1);
          if(t == 'dragenter' && desiredPosition != -1) {
            tree = tree.slice(0, desiredPosition).concat(r, tree.slice(desiredPosition));
          } else {
            tree = tree.slice(0, initialPosition).concat(r, tree.slice(initialPosition));
          }
          this.treeSubject.next(tree);
        }
      });
    this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(TreeElementComponent);
  };

  removeChildComponent(element: HTMLElement) {
    let component = this.elementComponentRefMap.get(element);
    let res = this.elementComponentRefMap.delete(element);
    component.destroy();
    return res;
  }

  createChildComponent(data, index) {
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
    this.hostSubject.next(this.host);
    this.treeSubject.next(this.tree);
  }
  // update the position / presence of elements
  subjectUpdate(tree) : Observable<any>{
    let treeElementHeight = 40;
    let treeElementIndent = 20;
    let treeElementSelector = 'app-tree-element';
    let animationDuration = ANIMATION_TIME;

    this.host.style('height', (tree.length * treeElementHeight) + 'px');

    let selection = this.host
      .selectAll(treeElementSelector)
      .data(tree, (d)=>d.data.id);

    let t = D3.transition(null).duration(animationDuration);

    // remove
    let toRemove = selection.exit()
    let toRemoveTransition = toRemove.transition(t).styleTween('opacity', ()=>D3.interpolate(1,0));
    toRemoveTransition.remove();

    // adjust
    let toAdjust = selection.order()
      .style('width', (el)=>'calc(100% - ' + (el.depth * treeElementIndent) + 'px)')
    let toAdjustTransition = toAdjust.transition(t).style('top', (el, i)=>(i*40) + 'px')

    // add
    let toAdd = selection
      .enter()
      .append(this.createChildComponent.bind(this))
      .order()
      .style('top', (el, i)=>(i*treeElementHeight)+'px')
      .style('width', (el)=>'calc(100% - ' + (el.depth * treeElementIndent) + 'px)')
    let toAddTransition = toAdd.transition(t).styleTween('opacity', ()=>D3.interpolate(0, 1))
    toAdd.style('top', (el, i)=>(i*40) + 'px');

    return Observable.forkJoin(
      waitForTransition(toRemoveTransition),
      waitForTransition(toAdjustTransition),
      waitForTransition(toAddTransition)
    ).map(([removed, moved, added]:[any[], any[], any[]])=>{
      removed.forEach(el=>{
        return this.removeChildComponent(el.element);
      });

      let remaining = moved.concat(added);
      return remaining.map(({element: htmlElement, data, index})=>{
        let component = this.elementComponentRefMap.get(htmlElement);
        component.instance.data = data; // bastard

        return component;
      });
    });
  }

  ngOnChanges(changes) {
    if(this.host && 'tree' in changes) {
      this.treeSubject.next(this.tree);
    }
  };
}
