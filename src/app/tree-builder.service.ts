import { OnInit, Injectable, OnChanges, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs';

import { Element } from './element';
const ELEMENTS: Element[] = [
  {
    name: 'Element 1',
    id: 0,
    parent: null
  },
  {
    name: 'Element 2',
    id: 0,
    parent: null
  },
  {
    name: 'Element 3',
    id: 0,
    parent: null
  }
];


@Injectable()
export class TreeBuilderService implements OnInit {
  elements: Element[] = [];

  constructor() {
  }

  ngOnInit() {
    this.elements = ELEMENTS;
  }

  buildTree() {
    return Promise.resolve(this.elements);
  }
}
