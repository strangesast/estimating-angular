import { Injectable, OnChanges, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { Element } from './element';
const ELEMENTS: Element[] = [
  {
    name: 'Element 1',
    id: 0,
    parent: null
  },
  {
    name: 'Element 2',
    id: 1,
    parent: null
  },
  {
    name: 'Element 3',
    id: 2,
    parent: null
  }
];


@Injectable()
export class TreeBuilderService {
  private _init: Element[] = [];
  private _tree: BehaviorSubject<Element[]> = new BehaviorSubject(this._init);
  public tree: Observable<Element[]> = this._tree.asObservable();

  constructor() {
    this._tree.next(ELEMENTS);
  }

  buildTree() {
    return this.tree;
  }

  change(elements: Element[]) {
    this._tree.next(elements);
    return this.tree;
  }

  find(id: Number): Element | null {
    let val = this._tree.getValue();
    return val.find((el)=>el.id == id);
  }

  where(name: String): Element[] {
    let val = this._tree.getValue();
    return val.filter(el => {
      return el.name.toLowerCase().startsWith(name.toLowerCase());
    });
  }
}
