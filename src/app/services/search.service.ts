import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

import { Observable, BehaviorSubject } from 'rxjs';
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
export class SearchService implements Resolve<any> {
  public query: string;
  public results: BehaviorSubject<HierarchyNode<any>[]> = new BehaviorSubject([]);
  private currentJob: BehaviorSubject<Collection>;

  constructor(private elementService: ElementService) { }

  resolve() {
    this.elementService.isReady
    let sub = (this.currentJob = new BehaviorSubject(null)).flatMap(job => {
      if(job) {
        let getComponents = this.elementService.retrieveCollectionComponents(job, 10).then(components => {
          let root = {
            name: 'Components in ' + job.name,
            children: components
          };
          return D3.hierarchy(root);
        });
        return Observable.fromPromise(Promise.all([getComponents]));
      } else {
        let getJobs = this.elementService.getJobs().then(bs => bs.map(jobs => {
          let root = {
            name: 'Create New Job',
            url: {
              path: '/jobs'
            },
            children: jobs.map(_bs => {
              let job = _bs.getValue()
              return {
                name: '... based on ' + job.name,
                url: {
                  path: '/jobs',
                  fragment: job.id
                }
              };
            })
          };
          return D3.hierarchy(root);
        }));
        return Observable.fromPromise(getJobs);
      }
    });


    sub.subscribe(this.results);

    return sub.take(1);
  }

  setJob(job: Collection) {
    this.currentJob.next(job);
  }
}
