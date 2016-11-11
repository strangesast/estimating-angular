import { Injectable, Optional }      from '@angular/core';
import { Observable }      from 'rxjs/Observable';
import { Subject }         from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { Element } from './element';

import { JobService } from './job.service';
import { ElementService } from './element.service';
import { TreeBuilderService } from './tree-builder.service';

import { Filter, AVAILABLE_FILTERS } from './filter';
import { Result } from './result';

function removeCase(str:string, remove:boolean):string {
  return remove ? str.toLowerCase() : str;
}

@Injectable()
export class SearchServiceService {
  public query: BehaviorSubject<string> = new BehaviorSubject('');

  private _results: BehaviorSubject<Result[]> = new BehaviorSubject([]);
  public results: Observable<Result[]> = this._results.asObservable();

  private _filters: BehaviorSubject<Filter[]> = new BehaviorSubject([]);
  public filters: Observable<Filter[]> = this._filters.asObservable();

  private sub: any;


  constructor(private elementService: ElementService, private jobService: JobService) { }

  init() {
    this.sub = this.sub || this.query.debounceTime(300).distinctUntilChanged().flatMap(this.search.bind(this)).subscribe((res:Result[])=> {
      this._results.next(res.sort((a,b)=>a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
    });
  }

  search(query: string): Observable<Result[]> {
    let ignoreCase = !/[A-Z]/.test(query);
    let filters = this._filters.getValue();


    let tree = Observable.fromPromise(this.jobService.search({name: query}, {ignorecase: ignoreCase, 'any':true}).then((res)=>{
      return res.map((el)=>new Result('tree-element', el));
    }));

    // tree observable (jobservice)
    // element observable (elementservice)
    // filter observable
    let ob = Observable.merge(tree).reduce((a,b)=>a.concat(b));
    

    return ob;
  }

  addFilter(value: string): Filter | null {
    let filters = this._filters.getValue();
    let i;
    if((i=filters.map((f)=>f.value).indexOf('filter'))!=-1) filters.splice(i, 1); // if adding another filter, remove 'filter' filter
    let filter;
    if(filter = AVAILABLE_FILTERS.find((f)=>f.value == value)) {
      if(filters.indexOf(filter) == -1) {
        this._filters.next(filters.concat(filter));
        return filter;
      }
    }
    this.query.next(this.query.getValue());
    return null;
  };

  removeFilter(filter: string) {
    let filters = this._filters.getValue();
    let index = filters.map((f)=>f.value).indexOf(filter);
    if(index !== -1) {
      let removed = filters.splice(index, 1);
      this._filters.next(filters);
      return removed;
    }
    return null;
  };

  removeLastFilter(): Filter | null {
    let filters = this._filters.getValue();
    let removed = filters.pop();
    if(removed != null) {
      this._filters.next(filters);
      return removed;
    }
    return null;
  }

}
