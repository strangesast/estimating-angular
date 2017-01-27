import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

import { Observable, ReplaySubject, BehaviorSubject, Subscription } from 'rxjs';
import { HierarchyNode } from 'd3';
import * as D3 from 'd3';

import { ElementService } from '../services/element.service';
import { DataService } from '../services/data.service';

/*
import { Http, Response, Headers } from '@angular/http';

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
*/

import { FolderElement, ComponentElement, Collection } from '../models';

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

  constructor(private elementService: ElementService, private db: DataService) { }

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
          new ComponentElement('New Component', '', 0.0, 0.0, ''),
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

  async search(query) {
    let db = this.db;

    let types = this.currentTypes.getValue();
    let arr = (await Promise.all(types.map(name => db[name].where('name').startsWithIgnoreCase(query).distinct().toArray()))).reduce((a, b) => a.concat(b), []).sort((a, b) => {
      return a.name.length > b.name.length ? 1 : -1;
    }).map(element => {
      return D3.hierarchy(element);
    });

    return arr;
  }
}
