import {
  Input,
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges, // used with input
  ElementRef,
  ViewChild,
  trigger,
  state,
  animate,
  style,
  transition
} from '@angular/core';

import * as D3 from 'd3';
import { nest } from 'd3-collection';

@Component({
  selector: 'app-tree',
  animations: [],
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.less']
})
export class TreeComponent implements OnInit, OnChanges, AfterViewInit {
  private host;
  private htmlElement: HTMLElement;
  @Input() tree: any[];

  constructor(
    private element: ElementRef
  ) { }

  ngOnInit(): void {
  };

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
        .style('margin-left', (el)=>el.depth * 20 + 'px')
        .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
        .style('z-index', (el, i)=>i)
        .style('opacity', 1)
        .text((d:any)=>d.data.name)
      return;
    }
    
    let t = D3.transition(null)
      .duration(750);

    let text = this.host.selectAll('li')
      .data(tree, function(d){return d.data.id});

    text.exit()
      .transition(t)
      .style('opacity', 1e-6)
      .remove();

    text.style('opacity', 1)
      .style('margin-left', (el)=>el.depth * 20 + 'px')
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
      .style('z-index', (el, i)=>i)
      .transition(t)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')

    text.enter().append('li')
      .attr('tabindex', 1)
      .style('transform', (el, i)=>'translate(-10%, ' + (i*40) + 'px)')
      .style('margin-left', (el)=>el.depth * 20 + 'px')
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
      .style('opacity', 0)
      .style('z-index', (el, i)=>i)
      .text((d:any)=>d.data.name||d.data.data.name)
      .transition(t)
      .style('opacity', 1)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')
  }

  ngOnChanges() {
    if(this.host) this.update(this.tree);
  };
}
