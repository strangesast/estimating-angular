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

@Component({
  selector: 'app-tree',
  animations: [],
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.less']
})
export class TreeComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  private host;
  private htmlElement: HTMLElement;
  @Input() elements: any[];

  constructor(
    private element: ElementRef
  ) { }

  ngOnInit(): void {
  };

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('.tree');
    this.host = D3.select(this.htmlElement);
    this.host.html('');

    this.host.selectAll('li')
      .data(this.elements, (d)=>d.id)
      .enter().append('li')
      .attr('tabindex', 1)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')
      .style('margin-left', (el)=>el.level * 20 + 'px')
      .style('width', (el)=>'calc(100% - ' + (el.level * 20) + 'px)')
      .style('z-index', (el, i)=>i)
      .style('opacity', 1)
      .text((d:any)=>d.value)
  }

  update(arr:any[]) {
    this.host.style('height', arr.length*40 + 'px');
    let t = D3.transition(null)
      .duration(750);

    let text = this.host.selectAll('li')
      .data(arr, function(d){return d.id});

    text.exit()
      .transition(t)
      .style('opacity', 1e-6)
      .remove();

    text.style('opacity', 1)
      .style('margin-left', (el)=>el.level * 20 + 'px')
      .style('width', (el)=>'calc(100% - ' + (el.level * 20) + 'px)')
      .style('z-index', (el, i)=>i)
      .transition(t)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')

    text.enter().append('li')
      .attr('tabindex', 1)
      .style('transform', (el, i)=>'translate(-100%, ' + (i*40) + 'px)')
      .style('margin-left', (el)=>el.level * 20 + 'px')
      .style('width', (el)=>'calc(100% - ' + (el.level * 20) + 'px)')
      .style('opacity', 0)
      .style('z-index', (el, i)=>i)
      .text((d:any)=>d.value)
      .transition(t)
      .style('opacity', 1)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')
  };

  ngOnDestroy(): void {
  };

  ngOnChanges() {
    if(this.host) this.update(this.elements);
  };
}
