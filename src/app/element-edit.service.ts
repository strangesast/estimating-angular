import { Injectable }               from '@angular/core';
import { Observable }               from 'rxjs/Observable';
import { Subject }                  from 'rxjs/Subject';
import { BehaviorSubject }          from 'rxjs/BehaviorSubject';
import { Router, ActivatedRoute, Params }   from '@angular/router';

import { Component, Folder, Job } from './classes';
import { ElementService } from './element.service';
import { JobService } from './job.service';

@Injectable()
export class ElementEditService {
  _elements: BehaviorSubject<any[]> = new BehaviorSubject([]);
  elements: Observable<any[]> = this._elements.asObservable();

  _activeElement: BehaviorSubject<any> = new BehaviorSubject(null);
  activeElement: Observable<any> = this._activeElement.asObservable();

  constructor(private jobService: JobService, private elementService: ElementService) { }

  getElements() {
    return this._elements.getValue();
  }

  removeElement(element) {
    let wasActive = element == this._activeElement.getValue();
    let elements = this._elements.getValue();
    let i = elements.indexOf(element);
    if(i == -1) throw new Error('element not in elements');
    let removed = elements.splice(i, 1);
    this._elements.next(elements);
    if(elements.length && wasActive) {
      this._activeElement.next(elements[i] || elements[i-1] || elements[i+1] || null);
    } else {
      this._activeElement.next(null);
    }
    return removed;
  }

  // kind, id || element
  loadElement(elementOrKind: string|Folder|Component, id?:string): Promise<any> {
    if(elementOrKind == null) {
      this._activeElement.next(null)
      return Promise.resolve(null);
    }
    let prom;
    if(elementOrKind instanceof Component || elementOrKind instanceof Folder) {
      prom = Promise.resolve(elementOrKind);
    } else if (typeof elementOrKind == 'string') {
      if(id == null) throw new Error('id required for "'+elementOrKind+'"');
      let kind = elementOrKind;
      switch(kind) {
        case 'phase':
        case 'building':
          prom = this.elementService.retrieveFolder(id);
          break;
        case 'component':
          prom = this.elementService.retrieveComponent(id);
          break;
        default:
          throw new Error('invalid kind "'+kind+'"');
      }
    } else {
      throw new Error('invalid type');
    }
    return prom.then((el)=>{
      if(el == null) throw new Error('that element does not exist');

      let elements = this._elements.getValue();
      let isNew = true;
      for(let i=0; i<elements.length; i++) {
        if(el instanceof elements[i].constructor && el.id == elements[i].id) isNew = false;
      }
      if(isNew) this._elements.next(elements.concat(el));
      this._activeElement.next(el);
      return el;
    });

  }
}
