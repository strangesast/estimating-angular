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

  private treeSubject: BehaviorSubject<any[]> = new BehaviorSubject([]);
  private hostSubject = new Subject();

  @Input() tree: any[];
  @Input() options: TreeOptions;

  @ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef
  ) { }

  ngOnInit(): void {
    this.treeSubject.debounceTime(200).skipUntil(this.hostSubject).concatMap(tree=>{
      // store component in output of emitter
      return this.subjectUpdate(tree).map(components=>{
        let emitters = components.map(c=>{
          return (function(component) {
            return component.instance.dragEmitter.map(value=>{
              return {
                component: component,
                value: value
              }
            });
          })(c);
        });
        return Observable.merge(...emitters);
      });
    }).subscribe(this.childEventSourceContainer);

    this.childEventSourceContainer.switchMap((el:any) =>{
      return el;
    }).subscribe(this.childEventSource);
        
    let source = this.childEventSource;
    let [lastDragged, lastMoved] = source.partition((x:any)=> x.value['type']=='on');

    let [lastStart, lastEnd] = lastDragged.partition((x:any)=>x.value.value == 'start');

    let lastDraggedComponent = null;

    let revertTree = null;
    let currentTree = null;
    let wasDropped = false;

    lastMoved.windowToggle(lastStart.do((evt:any)=>{
      lastDraggedComponent=evt.component;
      revertTree = this.treeSubject.getValue();
      wasDropped = false;
      currentTree = revertTree.slice(0);
    }), ()=>lastEnd.do((x)=>{
      wasDropped = x.value.value == 'drop';
      this.dragging = false;
    })).do(()=>{
      this.dragging = true;
    }).map(seq=>{
      //let lastEnter, lastLeave;
      //[lastEnter, lastLeave] = seq.partition((x:any)=>x.value.value=='enter');

      // TODO: this breaks when leaving + re-entering same component
      // return enter immediately, leave after delay if no new enter supercedes it
      let [lastEnter, lastLeave] = Observable.combineLatest(...seq.partition((x:any)=>x.value.value=='enter'))
        .switchMap(([a,b]:[any,any])=>a.component==b.component?Observable.of(b).delay(500):Observable.of(a))
        .distinct()
        .partition(x=>x.value.value=='enter')
        .map(ob=>ob.pluck('component'));

      return Observable.merge(
        lastEnter.do((x:any)=>{
          //currentTree = this.treeSubject.getValue();
          
          let currentPosition = currentTree.indexOf(lastDraggedComponent.instance.data)
          let desiredPosition = currentTree.indexOf(x.instance.data);
          if(currentPosition == desiredPosition) return;
          let r = currentTree.splice(currentPosition, 1);
          currentTree = [].concat(currentTree.slice(0, desiredPosition), r, currentTree.slice(desiredPosition));
          this.treeSubject.next(currentTree);
          //console.log('entered', data.data ? data.data.name : data.name);
        }),
        lastLeave.do(()=>{
          console.log('left');
          currentTree = revertTree.slice();
          this.treeSubject.next(currentTree);
        })
      ).finally(()=>{
        this.dragging=false;
        console.log('finished dragging');
      });
    }).mergeAll().subscribe((evt:any)=>{
      console.log(evt);
    });
    this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(TreeElementComponent);
    this.treeSubject.next(this.tree);
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
    let animationDuration = 250;

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
      removed.map(el=>{
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
    if('tree' in changes) {
      this.treeSubject.next(this.tree);
    }
  };
}
