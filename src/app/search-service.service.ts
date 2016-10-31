import { Injectable }      from '@angular/core';
import { Observable }      from 'rxjs/Observable';
import { Subject }         from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { Element } from './element';

import { TreeBuilderService } from './tree-builder.service';

import { Filter, AVAILABLE_FILTERS } from './filter';
import { Result } from './result';

@Injectable()
export class SearchServiceService {
  public query: BehaviorSubject<string> = new BehaviorSubject('');

  private _results: BehaviorSubject<Result[]> = new BehaviorSubject([]);
  public results: Observable<Result[]> = this._results.asObservable();

  private _filters: BehaviorSubject<Filter[]> = new BehaviorSubject([]);
  public filters: Observable<Filter[]> = this._filters.asObservable();


  constructor(private treeBuilderService: TreeBuilderService) {
    this.query.subscribe((query) => {
      let results = this.search(query);
      this._results.next(results);
    })
    this.filters.subscribe((filters) => {
      let results = this.search(this.query.getValue());
      this._results.next(results);
    });
  }

  search(query: string): Result[] {
    let ignoreCase = !/[A-Z]/.test(query);
    let filters = this._filters.getValue();
    if(filters.find((f)=>f.value == 'filter')) {
      return AVAILABLE_FILTERS.filter((f)=>f.value != 'filter').map((ob)=>{
        return {
          type: 'filter',
          value: ob
        };
      });
    }
    let treeResults: Result[] = this.treeBuilderService.where(query.toLowerCase()).map((ob) => {
      return {
        type: 'element',
        value: ob
      };
    });
    let filterResults: Result[] = AVAILABLE_FILTERS.filter((f)=> {
      if(filters.indexOf(f) != -1) return false;
      return f.value.startsWith(query.toLowerCase());

    }).map((ob)=>{
      return {
        type: 'filter',
        value: ob
      }
    });
    return [].concat(treeResults, filterResults);
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
