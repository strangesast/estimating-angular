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
  Child,
  ComponentElement,
  FolderElement,
  Collection,
  TreeConfig,
  Filter
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
  public nestConfigSubject: BehaviorSubject<any>;

  private openElements: BehaviorSubject<any> = new BehaviorSubject({});

  constructor(private elementService: ElementService, private router: Router) { }

  resolve(route: ActivatedRouteSnapshot): Promise<{job, tree, treeConfig}> {
    // TODO: validate username, redirect if incorrect
    // let username = route.params['username'];
    let shortname = route.params['shortname'];

    return this.elementService.loadJob(shortname).then(jobSubject => {
      // build trees
      // build nest
      this.jobSubject = jobSubject;
      let nestConfig = new BehaviorSubject({
        folders: {
          order: ['phase', 'building'],
          roots: {},
          enabled: { phase: true, building: true },
          filters: { phase: [], building: [] }
        },
        component: {
          enabled: true,
          filters: []
        },
        filters: []
      });
      this.nestConfigSubject = nestConfig;
      //let filteredConfig:any = nestConfig.switchMap(config => config.component.enabled ? Observable.of(config) : Observable.never());
      let buildNest = this.elementService.buildNest(jobSubject, nestConfig);
      let buildTrees = this.elementService.buildTrees(jobSubject, nestConfig);
      return {
        job: jobSubject,
        nest: buildNest,
        nestConfig,
        trees: buildTrees,
        openElements: this.openElements
      };

    }).catch(err => {
      if (err.message === 'invalid/nonexistant job') { // 404
        this.router.navigate(['/jobs']);
        return false;
      }
      throw err;
    });
  }

  updateJob(job: Collection) {
    // should return observable that completes when observable is finished saving, errors if invalid
    this.jobSubject.next(job);
  }

  openElement(element: Child|ComponentElement|FolderElement) {
    let elements = this.openElements.getValue();
    if (element.id in elements) {
      elements[element.id].config.open = true;
      return Promise.resolve(elements[element.id]);
    }
    return this.elementService.loadElement(element.constructor, element.id).then(bs => {
      Object.keys(elements).forEach(id => {
        elements[id].config.open = false;
      });
      elements[element.id] = {
        config: { open: true },
        element: bs
      }
      this.openElements.next(elements);
      return bs;
    });
  }

  retrieveElement(elementId, _class?) {
    return this.elementService.retrieveElement(typeof elementId === 'string' ? _class : elementId.constructor, typeof elementId === 'string' ? elementId : elementId.id);
  }

  loadElement(_class, id) {
    return this.elementService.loadElement(_class, id);
  }

  addChild(to, what) {
    return this.elementService.addChild(this.jobSubject.getValue(), to, what).then(() => {
      this.nestConfigSubject.next(this.nestConfigSubject.getValue()); // touch the config to trigger recalc
    });
  }

  createFolder(el, parentId) {
    let job = this.jobSubject.getValue();
    return this.elementService.createFolder(job.id, el.type, el.name, el.description || '(no description)', [], parentId);
  }

  closeOpenElement(both) {
    let elements = this.openElements.getValue();
    let id = both.element.getValue().id;
    if(id in elements) {
      delete elements[id];
      this.openElements.next(elements);
    }
  }

  removeFilter(filter: Filter) {
    let config = this.nestConfigSubject.getValue();

    let affects = filter.affects;
    delete filter.affects;

    if(Array.isArray(affects) && affects.length) {
      affects.forEach(name => {
        let filters;
        if(name == 'component') {
          filters = config.component.filters;
        } else if(config.folders.order.indexOf(name) !== -1) {
          filters = config.folders.filters[name];
        } else if(name === 'all') {
          filters = config.filters;
        } else {
          throw new Error('invalid affect prop ' + name);
        }
        if (!Array.isArray(filters)) throw new Error('misconfigured nest config');
        if (filter.type === 'property') {
          let existing = filters.find(f => f.type === 'property' && f.property == filter.property && f.method == filter.method);
          if (!existing) {
            throw new Error('already removed');
          }
          filters.splice(filters.indexOf(existing), 1);
          this.nestConfigSubject.next(config);
        } else if (filter.type === 'emptyFolders') {
          let existing = filters.find(f => f.type === 'emptyFolders');
          if(!existing) {
            throw new Error('already removed');
          }
          filters.splice(filters.indexOf(existing), 1);
          this.nestConfigSubject.next(config);

        } else {
          // unsupported
        }
      });
    } else {
      throw new Error('invalid affect prop ' + affects);
    }
  }

  addFilter(filter: Filter) {
    let config = this.nestConfigSubject.getValue();

    let affects = filter.affects;
    delete filter.affects;

    let changed = false;

    if(Array.isArray(affects) && affects.length) {
      affects.forEach(name => {
        let filters;
        if(name == 'component') {
          filters = config.component.filters;
        } else if(config.folders.order.indexOf(name) !== -1) {
          filters = config.folders.filters[name];
        } else if(name === 'all') {
          filters = config.filters;
        } else {
          throw new Error('invalid affect prop ' + name);
        }
        if(!Array.isArray(filters)) throw new Error('misconfigured nest config');
        if(filter.type === 'property') {
          let existing = filters.find(f => f.type === 'property' && f.property == filter.property && f.method == filter.method);
          if(existing) {
            filters.splice(filters.indexOf(existing), 1, filter);
          } else {
            filters.push(filter);
          }
          changed = true;
        } else if (filter.type === 'emptyFolders') {
          let existing = filters.find(f => f.type === 'emptyFolders');
          if(existing) {
            filters.splice(filters.indexOf(existing), 1, filter);
          } else {
            filters.push(filter);
          }
          changed = true;
        } else {
          // unsupported
        }
      });
    } else {
      throw new Error('invalid affect prop ' + affects);
    }

    if(changed) this.nestConfigSubject.next(config);
  }

  search(query) {
  }
}
