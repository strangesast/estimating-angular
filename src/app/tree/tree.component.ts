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
    this.htmlElement = this.element.nativeElement;
    this.host = D3.select(this.htmlElement)
    this.host.html('');

    console.log(this.htmlElement);
  }

  ngOnDestroy(): void {
  };

  ngOnChanges() {
  };
}
