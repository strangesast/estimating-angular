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

  constructor(private elementService: ElementService, private db: DataService, private http: Http, private userService: UserService) { }

  startListening(): void {
    let jobPageSwitch:Observable<any> = this.currentJob.switchMap((job:Collection) => {
      if(job) {
        let prom = this.elementService.retrieveCollectionComponents(job, 10).then(components => {
          let root = {
            name: 'Components in ' + job.name,
            type: 'filter',
            children: components/*.map(component => {
              return {
                name: component.name,
                data: component,
                type: 'component'
              };
            })
            */
          };
          return [D3.hierarchy(root)];
        });
        let prom2 = Promise.resolve([
          new (<any>ComponentElement)('New Component', '', 0.0, 0.0, ''),
          new FolderElement('New Folder (phase)', '', 'phase', '', []),
          new FolderElement('New Folder (building)', '', 'building', '', [])
        ].map(n=>D3.hierarchy(n)));
        return <any>Observable.fromPromise(<any>Promise.all([prom, prom2]).then((results:any) => results.reduce((a, b)=>a.concat(b))));

      } else {
        let getJobs = this.elementService.getJobs();
        return Observable.fromPromise(getJobs).map(jobs => {
          let root = {
            name: 'Create New Job',
            url: {
              path: '/jobs'
            },
            type: 'job',
            children: jobs.map(_job => {
              return {
                name: '... based on ' + _job.name,
                url: {
                  path: '/jobs',
                  fragment: _job.id
                },
                type: 'job'
              };
            })
          };
          return D3.hierarchy(root);
        });
      }
    });

    this.jobSub = this.elementService.isReady.distinct().switchMap(isReady => isReady ? jobPageSwitch : Observable.never()).subscribe((results:any) => {
      this.results.next(results);
    });
  }

  resolve() {
    if(!this.jobSub) this.startListening();
    return Promise.resolve();
  }

  setJob(job: Collection) {
    this.currentJob.next(job);
  }

  refreshCredentials() {
    return Observable.of(null).delay(1000);
  }

  streamWithRetry(stream, fn) {
    return stream.catch((err, stream) => fn.concat(stream));
  }

  searchSubject(inputSubject, retries = 1, on = 1) {
    let retryFn = this.refreshCredentials()
      .withLatestFrom(inputSubject)
      .flatMap(([_, input]) => this.handleSearchForm(input));

    let input = inputSubject.debounceTime(100)
      .switchMap(this.handleSearchForm.bind(this));

    return this.streamWithRetry(input, retryFn);

    /*
    return inputSubject
      .debounceTime(100)
      .switchMap(input => this.handleSearchForm(input))
      .catch((err, stream) => this.refreshCredentials()
        .withLatestFrom(inputSubject)
        .flatMap(([_, input]) => this.handleSearchForm(input))
        .concat(stream)
      );
    */
  }

  handleSearchForm(input: any) {
    if (Math.random() > 0.9) {
      return Observable.throw(new Error('fuck'));
    }
    return this.http.get(`${ API_ADDR }/search.json`, this.userService.authorizationOptions).map(res => res.json());
  }

  search(query) {
    let clean = query.replace(/[^\w\s-&#@]/gi, '');
    let db = this.db;

    let types = this.currentTypes.getValue();

    let search = new URLSearchParams();
    search.set('active', '1')
    search.set('q', clean);
    let observables = types.map((tableName) => Observable.fromPromise(db[tableName].where('name').startsWithIgnoreCase(clean).distinct().toArray().then(arr => arr.map(element => D3.hierarchy(element)))).startWith([]));

    if (this.userService.authorizationOptions) {

      let options = this.userService.authorizationOptions.merge({ search });
      //let uri = '/catalog/development_part_catalogs/_search?size=100&q="' + clean + '"';
      let uri = `${ API_ADDR }/search/select/part_catalogs.json`;
  
      let net = this.http.get(uri, options)
        .catch(err => {
          this.userService.refresh();
          return Observable.never();
        })
        .map((res:any) => {
          return res.json().map(el => D3.hierarchy(CatalogPart.fromJSON(el)));
        }).startWith([]);

      return Observable.combineLatest(...observables, net).map(arr => arr.reduce((a, b) => a.concat(b)));

    }
    return Observable.combineLatest(...observables).map(arr => arr.reduce((a:any[], b:any) => a.concat(b)));
  }

  moreDetail(id) {
    let path = '/data/part_catalogs/' + id
    let uri = '/core' + path + '.json';
    return this.http.get(uri).map(res => {
      console.log('res', res);
      return res.json();
    });
  }
}
