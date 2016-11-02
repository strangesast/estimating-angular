import { Injectable, OnChanges, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { ElementRetrievalService } from './element-retrieval.service';

import { Element } from './element';

@Injectable()
export class TreeBuilderService {
  private _init: Element[] = [];
  private _tree: BehaviorSubject<Element[]> = new BehaviorSubject(this._init);
  public tree: Observable<Element[]> = this._tree.asObservable();

  constructor(private store: ElementRetrievalService) { }

  buildTree() {
    this._tree.next(this.store.getElements());
    return this.tree;
  }

  change(elements: Element[]) {
    this._tree.next(elements);
    return this.tree;
  }

  grab(element: Element) {
    let val = this._tree.getValue();
    if(val.indexOf(element) == -1) return null;
    return element;
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
