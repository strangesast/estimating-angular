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
  trigger,
  state,
  animate,
  style,
  transition
} from '@angular/core';

import { TreeElementComponent } from  './tree-element/tree-element.component';

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

  @Input() tree: any[];

  @ViewChild('parent', {read: ViewContainerRef}) _parent: ViewContainerRef;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private element: ElementRef
  ) { }

  ngOnInit(): void {
    this.childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(TreeElementComponent);
  };

  createChildComponent(data?, index?) {
    data = data || {};
    console.log('data', data);
    let inputProviders = [{ provide: 'data', useValue: data}];
    let resolvedInputs = ReflectiveInjector.resolve(inputProviders);

    let injector = ReflectiveInjector.fromResolvedProviders(resolvedInputs, this._parent.parentInjector);

    let component = this.childComponentFactory.create(injector);

    this._parent.insert(component.hostView);

    return component.instance.element.nativeElement;
  }

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('.tree');
    this.host = D3.select(this.htmlElement);
    this.host.html('');
    this.update(this.tree, false);
  }
  update(tree: any[], anim?) {
    anim = anim || false;

    this.host.style('height', tree.length*40 + 'px');

    if(anim) {
      this.host.selectAll('li')
        .data(tree, (d)=>d.id)
        .enter().append('li')
        .attr('tabindex', 1)
        .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')
        .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
        .style('z-index', (el, i)=>i)
        .style('opacity', 1)
        .html(template)
      return;
    }
    
    let t = D3.transition(null)
      .duration(250);

    let text = this.host.selectAll('li')
      .data(tree, function(d){return d.data.id});

    text.exit()
      .transition(t)
      .style('opacity', 1e-6)
      .remove();

    text.style('opacity', 1)
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
      .style('z-index', (el, i)=>i)
      .transition(t)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')

    text.enter().append(this.createChildComponent.bind(this))
      .attr('tabindex', 1)
      .style('transform', (el, i)=>'translate(-10%, ' + (i*40) + 'px)')
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
      .style('opacity', 0)
      .style('z-index', (el, i)=>i)
      .transition(t)
      .style('opacity', 1)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')
  }

  ngOnChanges() {
    if(this.host) this.update(this.tree);
  };
}
