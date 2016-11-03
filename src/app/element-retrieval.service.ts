import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { ElementService } from './element.service';

import { Element } from './element';

const ELEMENTS: Element[] = [
  {
    name: 'Element 1',
    id: 0,
    parent: null,
    children: ['Child 1']
  },
  {
    name: 'Element 2',
    id: 1,
    parent: null,
    children: ['Child 1']
  },
  {
    name: 'Element 3',
    id: 2,
    parent: null,
    children: ['Child 1']
  }
];


@Injectable()
export class ElementRetrievalService {

  constructor(private elementService: ElementService) { }

  getElements(): Element[] {
    return ELEMENTS;
  }
}
