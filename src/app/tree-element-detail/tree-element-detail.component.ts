import { Component, Input, OnInit } from '@angular/core';

import { ElementEditService } from '../element-edit.service';

import { Element } from '../element';

@Component({
  selector: 'app-tree-element-detail',
  templateUrl: './tree-element-detail.component.html',
  styleUrls: ['./tree-element-detail.component.less']
})
export class TreeElementDetailComponent implements OnInit {
  @Input() element: Element;

  constructor(private elementEditService: ElementEditService) { }

  ngOnInit() {
  }
}
