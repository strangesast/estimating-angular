import { Optional, Injectable } from '@angular/core';

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
  ChildElement,
  ComponentElement,
  FolderElement,
  Collection,
  TreeConfig,
  Filter,
  NestConfig
} from '../models';

import { ElementService } from './element.service';
import { DataService } from './data.service';

import {
  hierarchy,
  HierarchyNode
} from 'd3-hierarchy';

import * as D3 from 'd3';
import { Nest } from 'd3';

// may change if collection format changes
const INIT_CONFIG = {
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
}

@Injectable()
export class JobService implements Resolve<Promise<any>> {
  nestConfigSubject: BehaviorSubject<NestConfig>;

  public collectionSubject: BehaviorSubject<Collection>;

  public trees; // { 'phase': BehaviorSubject, 'building': BehaviorSubject }
  public nestSubject: BehaviorSubject<Nest<any, any>>

  private openElements: BehaviorSubject<any> = new BehaviorSubject({});

  constructor(private db: DataService, private elementService: ElementService, private router: Router) { }

  async resolve(route: ActivatedRouteSnapshot) {
    let username = route.params['username'];
    let shortname = route.params['shortname'];

    let db = this.db;

    // need extra await for different dexie promise
    let collection = await db.collections.get({ '[owner.username+shortname]': [username, shortname] });

    if (!collection) {
      this.router.navigate(['/jobs']); // 404
      return false;
    }

    if (!collection.initialized) {
      await this.init(collection);
    }

    let collectionSubject = new BehaviorSubject(collection);

    this.collectionSubject = collectionSubject;
    this.collectionSubject.subscribe(collection => {
      db.collections.put(collection, <any>collection.id);
    });

    let nestConfigSubject = new BehaviorSubject(INIT_CONFIG);
    this.nestConfigSubject = nestConfigSubject;

    let nestSubject = this.elementService.buildNestSubject(collectionSubject, nestConfigSubject);

    return { collection, collectionSubject, nestConfigSubject, nestSubject };
  }

  async init(collection: Collection, createNExampleElements = 4) {
    let db = this.db;
    // if any root already defined
    if (collection.initialized) throw new Error('collection already initialized');

    collection.folders.roots = {};
    // create root folders, add ids to job
    let rootFolders = collection.folders.order.map(type => new FolderElement('root', '', type, collection.id));
    for(let i = 0; i < rootFolders.length; i++) {
      let folder = rootFolders[i];
      let id = await db.folderElements.add(folder);
      folder.id = id;
      collection.folders.roots[folder.type] = id;
    }
    await db.collections.put(collection); // update new roots

    if (createNExampleElements > 0) {
      let elements = await this.elementService.createExampleElements(collection, createNExampleElements);
      console.log('elements', elements);
    }

    return collection;
  }

  updateJob(job: Collection) {
    // should return observable that completes when observable is finished saving, errors if invalid
    this.collectionSubject.next(job);
  }

  openElement(element: ChildElement|ComponentElement|FolderElement) {
    let elements = this.openElements.getValue();
    if (element.id in elements) {
      elements[element.id].config.open = true;
      return Promise.resolve(elements[element.id]);
    }
    return this.elementService.loadElement(element.constructor, <any>element.id).then(bs => {
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

  addChildElement(to, what) {
    return this.elementService.addChildElement(this.collectionSubject.getValue(), to, what).then((res) => {
      if(res !== undefined) this.nestConfigSubject.next(this.nestConfigSubject.getValue()); // touch the config to trigger recalc
    });
  }

  createFolder(el, parentId) {
    let job = this.collectionSubject.getValue();
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
