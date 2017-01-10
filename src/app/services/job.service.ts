import { Injectable } from '@angular/core';

import {
  Router,
  Resolve,
  ActivatedRouteSnapshot
} from '@angular/router';

import {
  BehaviorSubject,
  Subscription,
  Observable,
} from 'rxjs';

import {
  ComponentElement,
  FolderElement,
  Collection,
  TreeConfig
} from '../models/classes';

import { ElementService } from './element.service';

import {
  hierarchy,
  HierarchyNode
} from 'd3-hierarchy';

import * as D3 from 'd3';
import { Nest } from 'd3';

@Injectable()
export class JobService implements Resolve<Promise<any>> {
  public jobSubject: BehaviorSubject<Collection>;

  public trees; // { 'phase': BehaviorSubject, 'building': BehaviorSubject }
  public nestSubject: BehaviorSubject<Nest<any, any>>

  constructor(private elementService: ElementService, private router: Router) { }

  resolve(route: ActivatedRouteSnapshot): Promise<{job, tree, treeConfig}> {
    // TODO: validate username, redirect if incorrect
    // let username = route.params['username'];
    let shortname = route.params['shortname'];

    return this.elementService.loadJob(shortname).then(jobSubject => {
      // build trees
      // build nest
      let job = jobSubject.getValue();
      console.log('job', job);
      let nestConfig = new BehaviorSubject({
        folders: {
          order: ['phase', 'building'],
          roots: {},
          enabled: { phase: true, building: true },
          filters: []
        },
        component: {
          enabled: true,
          filters: []
        }
      });
      let buildNest = this.elementService.buildNest2(jobSubject, nestConfig);
      return {
        job: jobSubject,
        nest: buildNest,
        nestConfig,
      };

    }).catch(err => {
      if (err.message === 'invalid/nonexistant job') { // 404
        this.router.navigate(['/jobs']);
        return false;
      }
      throw err;
    });
  }
}
