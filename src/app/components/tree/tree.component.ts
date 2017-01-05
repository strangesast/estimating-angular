import {
  Input,
  Output,
  Component,
  OnInit,
  AfterViewInit,
  OnChanges,
  ElementRef,
  ViewChild,
  ViewContainerRef,
  ComponentFactory,
  ComponentFactoryResolver,
  ReflectiveInjector,
  SimpleChanges,
  EventEmitter
} from '@angular/core';

import {
  BehaviorSubject,
  Observable,
  Subject
} from 'rxjs';

import * as D3 from 'd3';
import { nest } from 'd3-collection';

import { TreeElementComponent } from  './tree-element/tree-element.component';
import { waitForTransition } from '../../resources/util';

let cnt = 0;

@Component({
  selector: 'app-tree',
  animations: [],
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.less']
})
export class TreeComponent implements OnInit, OnChanges, AfterViewInit {
  private host;
  private htmlElement: HTMLElement;

  private childComponentFactory;
  // for storing ref to child components
  private elementComponentRefMap = new Map();
  private childComponents = new Subject();

  @Output() public change = new EventEmitter();

  public dragging: boolean = false;

  private hostSubject: Subject<any> = new Subject();
  private treeSubject: BehaviorSubject<any[]>;

  private dragSink: Subject<any> = new Subject();

  @Input() tree: any[];
  options = { animationTime: 200 }

  @ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef; // parent container html element ref

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef
  ) { }

  ngOnInit(): void {
    // tree update watcher
    this.treeSubject = new BehaviorSubject([]);
    this.treeSubject
      .skipUntil(this.hostSubject) // wait for host to load in afterViewInit, only 
      .distinct()
      .pairwise()
      .switchMap(this.subjectUpdate.bind(this)) // call subject update, interrupt if necessary
      .subscribe(this.childComponents); // feed into childcomponents

    // child component update watcher
    this.childComponents.map(
      (components:any[])=>Observable.merge(...components.map(
        ({instance: component})=>component.dragEmitter
      )))
      .subscribe(this.dragSink); // on childcomponents update, update drag listeners

    // drag event source
    let source = this.dragSink.switchMap(el=>el);
    let arr = ['dragstart', 'drop', 'dragend'];
    let [dragged, draggedOver] = source.partition(({event:{type:t},component:c})=>arr.indexOf(t)!=-1);

    let [dragStart, dragEnd] = dragged.partition(({event:{type:t}})=>t=='dragstart'); // dragstart OR dragend, drop

    let currentDrag=null;
    let initialPosition=null;
    let last = null;
    draggedOver
      .switchMap((evt:any)=>{
        let t = evt.event.type;
        return (
          t == 'dragenter' ? Observable.of(evt) : // if 'dragenter', return immediately
          t == 'dragover' ? Observable.never() : // if over, prevent 'dragleave'
          Observable.of(evt).delay(500) // else return 'dragleave' after delay
        );
      })
      // may be longer - shorter fails to call 'this.dragging = false' for some reason
      // shouldn't be shorter than animation time
      .debounceTime(Math.round(this.options.animationTime/2))
      // create window formed by start/end/drop
      .windowToggle(dragStart.withLatestFrom(this.treeSubject).do(([{component}, tree]:[any,any[]])=>{
        console.log('first');
        initialPosition = tree.indexOf(component.data); // store for reset
        currentDrag=component; // store dragged element
      }), ()=>dragEnd.do(()=>this.dragging=false))
      // drag window sequence (may not be interrupted)
      .exhaustMap(ob=>{
        this.dragging = true; // disable pointer events
        return ob
        // use the most recent tree (might be updated by the following)
        .withLatestFrom(this.treeSubject)
        .map(([{component, event:{type:t}}, tree])=>{
          let currentPosition = tree.indexOf(currentDrag.data);
          let desiredPosition = tree.indexOf(component.data);

          let ret:any = { component: currentDrag };

          // should error if these dont hold
          if(desiredPosition == -1 || currentPosition == -1) throw new Error('this shouldn\'t happen');
          let r = tree.splice(currentPosition, 1);

          if(t == 'dragenter') {
            tree = tree.slice(0, desiredPosition).concat(r, tree.slice(desiredPosition));
            currentPosition = desiredPosition;
            ret.index = desiredPosition;
          } else {
            tree = tree.slice(0, initialPosition).concat(r, tree.slice(initialPosition));
            currentPosition = initialPosition;
            ret.index = initialPosition;
          }
          this.treeSubject.next(tree);
          return ret;
        })
        .finally(()=>{
          this.dragging = false;
        })
        .takeLast(1)
        .concatMap(result=>{
          // check if valid
          return result.component.confirmPlacement().switchMap(res=>{
            if(res) return Observable.of(result);
            return Observable.of(result).withLatestFrom(this.treeSubject).map(([{component},tree])=>{
              // should be a better way to do this
              let i = tree.indexOf(component.data);
              if(i == -1 || initialPosition == null || initialPosition == -1) throw new Error('this shouldn\'t happen');
              let r = tree.splice(i, 1);
              tree = tree.slice(0, initialPosition).concat(r, tree.slice(initialPosition));
              this.treeSubject.next(tree);
              return result;
            });
          });
        })
        .finally(()=>{
          initialPosition = null;
          currentDrag =null;
        })

      }).subscribe(x=>{
        console.log('finished', x);
        this.change.emit(this.tree);
      });

    this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(TreeElementComponent);
  };

  confirmPlacement(component) {
    component.confirmPlacement()
  }

  removeChildComponent(element: HTMLElement) {
    let component = this.elementComponentRefMap.get(element);
    let res = this.elementComponentRefMap.delete(element);
    component.destroy();
    return res;
  }

  createChildComponent(data, index) {
    // creation of child component / passing in data
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
  subjectUpdate([prev, tree]) : Observable<any>{
    let treeElementHeight = 40;
    let treeElementIndent = 20; // should probably be offloaded to child
    let treeElementSelector = 'app-tree-element';
    let animationDuration = this.options.animationTime;

    // children are absolute-ly positioned
    this.host.style('height', (tree.length * treeElementHeight) + 'px');

    // use child, folder, component ids.
    // will probably break with multiple instances of same
    let selection = this.host
      .selectAll(treeElementSelector)

    if(tree.length != prev.length+1) {
      selection = selection.data(tree, (d)=>{
        if(!d.temp) d.temp = ++cnt;
        return d.data.id;
      });
    } else { 
      selection = selection.data(tree, (d)=>d.temp || (d.temp = ++cnt))
    }
    selection = selection.order()

    // use the same transition for the three selections
    let t = D3.transition(null).duration(animationDuration);

    // remove
    let toRemove = selection.exit()
    let toRemoveTransition = toRemove
      .transition(t)
      .styleTween('opacity', ()=>D3.interpolate(1,0))
      .remove();

    // adjust
    let toAdjust = selection
      .style('width', (el)=>'calc(100% - ' + (el.depth * treeElementIndent) + 'px)')
    let toAdjustTransition = toAdjust
      .transition(t)
      .style('top', (el, i)=>(i*40) + 'px')

    // add
    let toAdd = selection
      .enter()
      .append(this.createChildComponent.bind(this))
      .style('top', (el, i)=>(i*treeElementHeight)+'px')
      .style('width', (el)=>'calc(100% - ' + (el.depth * treeElementIndent) + 'px)')
    let toAddTransition = toAdd
      .transition(t)
      .styleTween('opacity', ()=>D3.interpolate(0, 1))
      .style('top', (el, i)=>(i*40) + 'px');

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
