import { Injectable } from '@angular/core';
import { Observable }      from 'rxjs/Observable';
import { Subject }         from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { Element } from './element';
import { TreeBuilderService } from './tree-builder.service';

@Injectable()
export class ElementEditService {
  _elements: BehaviorSubject<Element[]> = new BehaviorSubject([]);
  elements: Observable<Element[]> = this._elements.asObservable();
  _activeElement: BehaviorSubject<Element | null> = new BehaviorSubject(null);
  activeElement: Observable<Element> = this._activeElement.asObservable();

  constructor(private treeBuilderService: TreeBuilderService) { }

  getElements(): Element[] {
    return this._elements.getValue();
  }

  addElement(element: Element): void {
    let arr = this._elements.getValue();
    if(arr.indexOf(element) == -1) {
      arr.push(element)
      this._elements.next(arr);
    }
  }

  removeElement(element: Element): Element | null {
    let arr = this._elements.getValue();
    let i;
    if((i = arr.indexOf(element)) != -1) {
      let removed = arr.splice(i, 1);
      this._elements.next(arr);
      return removed[0];
    }
    return null;
  }

  loadElementById(id: number): Element | null{
    var element = this.treeBuilderService.find(id);
    if(element == null) throw new Error('element with that id does not exist');
    return this.loadElement(element);
  }

  loadElement(element: Element | null): Element | null{
    if(element == null) {
      this._activeElement.next(null);
      return null;
    }
    let arr = this._elements.getValue();
    let i;
    if((i=arr.indexOf(element)) != -1) {
      this._activeElement.next(arr[i]);
      return arr[i];
    } else {
      var el = this.treeBuilderService.grab(element);
      if(el == null) throw new Error('element not in tree');
      this._elements.next(arr.concat(el));
      this._activeElement.next(el);
      return el;
    }
  }

}
