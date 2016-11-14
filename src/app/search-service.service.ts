import { Injectable, Optional } from '@angular/core';
import { Observable }           from 'rxjs/Observable';
import { Subject }              from 'rxjs/Subject';
import { BehaviorSubject }      from 'rxjs/BehaviorSubject';
import { Http, Response, Headers } from '@angular/http';

import { JobService }         from './job.service';
import { ElementService }     from './element.service';
import { TreeBuilderService } from './tree-builder.service';

import { Filter, AVAILABLE_FILTERS } from './filter';
import { Result } from './result';

function removeCase(str:string, remove:boolean):string {
  return remove ? str.toLowerCase() : str;
}

class PartCatalog {
  _boost: number;
  active: boolean;
  description: string;
  id: string;
  kind: string;
  label: string;
  summary: string;
  type: string;
}

@Injectable()
export class SearchServiceService {
  public query: BehaviorSubject<string> = new BehaviorSubject('');

  private _results: BehaviorSubject<Result[]> = new BehaviorSubject([]);
  public results: Observable<Result[]> = this._results.asObservable();

  private _filters: BehaviorSubject<Filter[]> = new BehaviorSubject([]);
  public filters: Observable<Filter[]> = this._filters.asObservable();

  private sub: any;


  constructor(private elementService: ElementService, private jobService: JobService, private http: Http) { }

  init() {
    this.sub = this.sub || this.query.distinctUntilChanged().map(this.checkForFilters.bind(this)).debounceTime(300).flatMap(this.search.bind(this)).subscribe((res:Result[])=> {
      this._results.next(res);
    });
  }

  checkForFilters(text: string) {
    let filters = this._filters.getValue();
    if(text.endsWith(':')) {
      let i = text.indexOf(':');
      let filterValue = text.substring(0, i);
      let filter = AVAILABLE_FILTERS.find((f)=>f.value==filterValue);
      if(filter && !filters.find((f)=>f.value==filterValue)) {
        text = text.substring(i+1);
        this.query.next(text);
        this._filters.next(filters.concat(filter));
      }
    }
    return text;
  }

  search(query: string) {
    let ignoreCase = !/[A-Z]/.test(query);
    let filters = this._filters.getValue();

    for(let i=0; i<filters.length; i++) {
      let filter = filters[i];
      if(filter.value == 'filter') {
        return Observable.fromPromise(Promise.resolve(AVAILABLE_FILTERS.filter(f=>f.value!='filter').map((el)=>new Result('filter-element', el))));
      }
    }

    query = query.split(':').join(' ');

    // apply filters to search
    let tree = Observable.fromPromise(this.jobService.search({name: query}, {ignorecase: ignoreCase, 'any':true}).then((res)=>{
      return res.map((el)=>new Result('tree-element', el));
    }));

    let body = {
      query: {
        term: { description: query }
      }
    };

    // apply filters to search
    let path = 'catalog/production_part_catalogs/_search?q=description:'+query + '&size=100';
    let search = query ? this.http.get(path).map((r: Response)=>{
      let obj = r.json();
      let hits = obj.hits;
      console.log(hits);
      return (hits.hits || []).map(el => new Result('catalog-element', el._source));
    }) : Observable.fromPromise(Promise.resolve([]));

    let others = Observable.fromPromise(Promise.resolve(['phase', 'building', 'component'].map((n)=>new Result('new-tree-element', {reftype: n, description: 'new ' + n}))));

    // tree observable (jobservice)
    // element observable (elementservice)
    // filter observable
    let ob = Observable.merge(tree, search, others).reduce((a,b)=>a.concat(b));
    

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

  filterFilter() {
    let filter = AVAILABLE_FILTERS.find((f)=>f.value == 'filter');
    this._filters.next([filter]);
  }

  removeLastFilter(): Filter | null {
    let filters = this._filters.getValue();
    let removed = filters.pop();
    if(removed != null) {
      this._filters.next(filters);
      return removed;
    }
    return null;
  }

  addToJob(result: Result) {
    switch(result.kind) {
      case 'catalog-element':
        console.log('result', result.value);
        break;
      default:
        throw new Error('unknown result type "'+result.kind+'"');
    }
  }
}
