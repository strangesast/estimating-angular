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
export class TreeComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  private host;
  private htmlElement: HTMLElement;
  private treeArray: any[];
  @Input() config: any = {};

  constructor(
    private element: ElementRef
  ) { }

  ngOnInit(): void {
  };

  ngAfterViewInit() {
    this.htmlElement = this.element.nativeElement.querySelector('.tree');
    this.host = D3.select(this.htmlElement);
    this.host.html('');
    console.log('config', this.config);
    this.update(this.config);

    /*

    if(this.config == null || this.config.order == null) return;
    this.host.selectAll('li')
      .data(this.treeArray, (d)=>d.id)
      .enter().append('li')
      .attr('tabindex', 1)
      .style('transform', (el, i)=>'translate(0, ' + (i*40) + 'px)')
      .style('margin-left', (el)=>el.depth * 20 + 'px')
      .style('width', (el)=>'calc(100% - ' + (el.depth * 20) + 'px)')
      .style('z-index', (el, i)=>i)
      .style('opacity', 1)
      .text((d:any)=>d.data.name)
    */
  }

  update(config: any) {
    console.log('config', config);

    let n = nest();
    if(config.enabled.indexOf('phase') != -1) {
      n = n.key((d:any)=>d.phase);
    }
    if(config.enabled.indexOf('building') != -1) {
      n = n.key((d:any)=>d.building);
    }
    let res = n.object(config.components);
    console.log('res', res);

    let arr = config.folders['phase'].descendants();
    let arr2 = config.folders['building'].descendants();

    let data = [];
    for(let i=0,a;a=arr[i],i<arr.length;i++) {
      let cd = a.depth; // current depth
      data.push(a);
      for(let j=0,b;b=arr2[j],j<arr2.length;j++) {
        b['depth'] = cd + j + 1;
        b['parent'] = a;
        data.push(b);
        let c = res[a.data.id][b.data.id].map((e,k)=>{
          let node:any = D3.hierarchy(e.data, x=>x.data.children);
          node['depth'] = cd + j + k + 2;
          node['parent'] = b;
          return node;
        });
        data.push.apply(data, c);
      }
    }

    console.log(data);

    this.host.style('height', data.length*40 + 'px');
    let t = D3.transition(null)
      .duration(750);

    let text = this.host.selectAll('li')
      .data(data, function(d){return d.id});

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
  };

  ngOnDestroy(): void {
  };

  ngOnChanges() {
    if(this.host) this.update(this.config);
  };
}
