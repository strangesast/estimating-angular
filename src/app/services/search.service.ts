import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

import { Observable, ReplaySubject, BehaviorSubject, Subscription } from 'rxjs';
import { HierarchyNode } from 'd3';
import * as D3 from 'd3';

import { ElementService } from '../services/element.service';

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

import { Collection } from '../models/classes';

@Injectable()
export class SearchService implements Resolve<HierarchyNode<any>> {
  public query: string;
  
  // used here because value may not be immediately available.  could use behaviorsubject([]) instead
  public results: ReplaySubject<HierarchyNode<any>[]> = new ReplaySubject(1);

  private currentJob: BehaviorSubject<Collection> = new BehaviorSubject(null);

  private jobSub: Subscription;
  private resultObservable: Observable<any>;

  constructor(private elementService: ElementService) { }

  startListening() {
    this.jobSub = this.elementService.isReady.distinct().switchMap(isReady => isReady ? this.currentJob.switchMap(job => {
      if(job) {
        let prom = this.elementService.retrieveCollectionComponents(job, 10).then(components => {
          let root = {
            name: 'Components in ' + job.name,
            type: 'filter',
            children: components.map(component => {
              return {
                name: component.name,
                data: component,
                type: 'component'
              };
            })
          };
          return [D3.hierarchy(root)];
        });
        let prom2 = Promise.resolve([
          { name: 'Create New Component', type: 'component' },
          { name: 'Create New Folder', type: 'folder' }
        ].map(n=>D3.hierarchy(n)));
        return Observable.fromPromise(Promise.all([prom, prom2]).then(results => results.reduce((a, b)=>a.concat(b))));
      } else {
        let getJobs = this.elementService.getJobs();
        return Observable.fromPromise(getJobs).flatMap(subject => {
          return subject.flatMap(jobs => {
            return Observable.combineLatest(...jobs).map(_jobs => {
              let root = {
                name: 'Create New Job',
                url: {
                  path: '/jobs'
                },
                type: 'job',
                children: _jobs.map(_job => {
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
          });
        });
      }
    }) : Observable.never()).subscribe((results:any) => {
      //console.log('results', results);
      this.results.next(results);
    });
    /*
    if(this.resultObservable) return this.resultObservable;
    let observ = this.elementService.isReady.switchMap(isReady => {
      if(!isReady) return Observable.never();
      return this.currentJob.switchMap(job => {
      });
    });
    
    let published = observ.share();
    
    published.subscribe(this.results);
    this.resultObservable = published;
    
    return published;

    if(this.resultObservable) return this.resultObservable;
    this.resultObservable = (this.currentJob || (this.currentJob = new BehaviorSubject(null))).switchMap(job => {
    }).share();
    this.jobSub = this.resultObservable.subscribe(this.results);
    
    return this.resultObservable;
    return (this.currentJob || (this.currentJob = new BehaviorSubject(null))).switchMap(job => {
    });
    */
  }

  resolve() {
    if(!this.jobSub) this.startListening();
    return Promise.resolve();
  }

  setJob(job: Collection) {
    this.currentJob.next(job);
  }
}
