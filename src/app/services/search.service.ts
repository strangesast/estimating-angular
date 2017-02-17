import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Http, Response, Headers, URLSearchParams } from '@angular/http';

import { Observable, ReplaySubject, BehaviorSubject, Subscription } from 'rxjs';
import { HierarchyNode } from 'd3';
import * as D3 from 'd3';

import { environment } from '../../environments/environment';
const { API_ADDR } = environment;

import { ElementService } from '../services/element.service';
import { UserService } from '../services/user.service';
import { DataService } from '../services/data.service';
import { FolderElement, ComponentElement, Collection, CatalogPart } from '../models';

@Injectable()
export class SearchService implements Resolve<any> {
  public query: string;
  
  // used here because value may not be immediately available.  could use behaviorsubject([]) instead
  public results: ReplaySubject<HierarchyNode<any>[]> = new ReplaySubject(1);

  private currentJob: BehaviorSubject<Collection> = new BehaviorSubject(null);
  // TODO: replace with default filters for page
  public currentTypes: BehaviorSubject<string[]> = new BehaviorSubject([]);

  private jobSub: Subscription;
  private resultObservable: Observable<any>;

  public resultsPageObservable: BehaviorSubject<any[]> = new BehaviorSubject([]);

  constructor(private elementService: ElementService, private db: DataService, private http: Http, private userService: UserService) { }

  resolve() {}

  streamWithRetry(stream, fn) {
    return stream.catch((err, stream) => {
      console.error('caught', err);
      return fn.concat(stream)
    });
  }

  searchSubject(inputSubject) {
    let retryFn = this.userService.refresh()
      .withLatestFrom(inputSubject)
      .flatMap(([_, input]) => this.handleSearchForm(input));

    let input = inputSubject.debounceTime(100)
      .switchMap(this.handleSearchForm.bind(this));

    return this.streamWithRetry(input, retryFn);
  }

  handleSearchForm(input: any) {
    let clean = (input.query || '').replace(/[^\w\s-&#@]/gi, '').toLowerCase();
    let observables = [];
    let db = this.db;
    let elementType = input.elementType;
    let attr = input.attributes; let query = input.query;
    if (elementType == '' || elementType == 'catalog') {
      let search = new URLSearchParams();
      if (attr) {
        for (let prop in attr) {
          let val = attr[prop];
          if (val != '') {
            search.set(prop, val);
          }
        }
      }

      if (search.paramsMap.size) {
        if (query) {
          search.set('description', ':' + clean);
        }
        search.set('fields', ['description', 'label'].join(','));
        
        let options = this.userService.authorizationOptions.merge({ search });
        observables.push(this.http.get(`${ API_ADDR }/data/part_catalogs.json`, options).map(res => res.json().map(el => D3.hierarchy(CatalogPart.fromJSON(el[Object.keys(el)[0]])))).startWith([]));

      } else {
        search.set('search', clean);
        let options = this.userService.authorizationOptions.merge({ search });
        observables.push(this.http.get(`${ API_ADDR }/search/select/part_catalogs.json`, options).map(res => res.json().map(el => D3.hierarchy(CatalogPart.fromJSON(el)))).startWith([]));

      }

    }
    if (elementType == '' || elementType == 'component') {
      let col:any = db.componentElements;

      if (attr) {
        if (attr.collection) {
          col = col.where('collection').equals(attr.collection);
        }
      }
      if (query) {
        col = col.where('name').startsWithIgnoreCase(clean).distinct();
      }
      let promise = col.toArray().then(arr => arr.map(el => D3.hierarchy(el)));
      observables.push(Observable.fromPromise(promise).startWith([]));

    }
    if (elementType == '' || elementType == 'folder') {
      let col:any = db.folderElements;
      let q = {};
      if (attr) {
        if (attr.collection) {
          q['collection'] = attr.collection;
        }
        if (attr.type) {
          q['type'] = attr.type;
        }
      }

      if (Object.keys(q).length && query) {
        col = col.where(q).filter(doc => {
          return doc.name.toLowerCase().startsWith(clean);
        });
      } else if (Object.keys(q).length) {
        col = col.where(q);
      } else if (query) {
        col = col.where('name').startsWithIgnoreCase(clean).distinct();
      }
      let promise = col.toArray().then(arr => arr.map(el => D3.hierarchy(el)));
      observables.push(Observable.fromPromise(promise).startWith([]));
    }

    return Observable.combineLatest(...observables).map((arr: any[]) => arr.reduce((a, b) => a.concat(b)));
  }

  moreDetail(id) {
    let url = `${ API_ADDR }/data/part_catalogs/${ id }.json`;
    let search = new URLSearchParams();
    search.set('fields', ['description', 'id', 'kind', 'label', 'summary', 'type', 'nys_price', 'price', 'list_price', 'number', 'version_id' ].join(','));
    let options = this.userService.authorizationOptions.merge({ search });
    return this.http.get(url, options).map(res => {
      let json = res.json();
      return json[Object.keys(json)[0]];
    }).toPromise();
  }
}
