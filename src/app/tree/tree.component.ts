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

  private dragging: boolean = false;

  @Input() tree: any[];

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
    //.flatMap(el=>{ // double nested
    //  return el;
    //});
    let both = source.partition((x:any)=> x.value['type']=='on');
    let lastEnter = both[1].filter(x=>x.component != null && x.value.value=='enter');
    let lastLeave = both[1].filter(x=>x.component != null && x.value.value=='leave');
    let hasMoved = Observable.combineLatest(lastEnter, lastLeave)
      // compare enter / leave events - get most recent of two
      .map((b:[any,any])=>b[0].component!=b[1].component ? b[0]: false)
      // remove duplicate false
      .filter(x=>!!x).distinct()
    Observable.combineLatest(
      // if last is start, its dragging
      both[0].do(x=>this.dragging = x.value.value == 'start'),
      hasMoved
    ).filter((b:[any,any])=>b[0].component!=b[1].component).debounceTime(100).subscribe((parts:[any, any]) => {
      let d1 = parts[0].component.data.data
      let d2 = parts[1].component.data.data;
      //console.log(parts[0].value.value, d1.data ? d1.data.name : d1.name, 'below', d2.data ? d2.data.name : d2.name);
      let d = parts[0].component.data;
      let ci = this.tree.indexOf(d); // current index
      let ti = parts[1].index; // target index

      if(ci > -1 && ci != ti) {
        let r = this.tree.splice(ci, 1);
        this.tree = [].concat(this.tree.slice(0, ti), r, this.tree.slice(ti))
        this.update(this.tree);
      } else if (ci == -1) {
        //this.tree.push(d);
        //this.update(this.tree);
      }
      console.log(ci, ti);
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
