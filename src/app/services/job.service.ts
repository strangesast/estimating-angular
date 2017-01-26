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
  LocationElement,
  FolderElement,
  Collection,
  TreeConfig,
  Filter,
  NestConfig
} from '../models';

import { ElementService } from './element.service';
import { DataService } from './data.service';

import { ClassToStringPipe } from '../pipes';

import {
  hierarchy,
  HierarchyNode
} from 'd3-hierarchy';

import * as D3 from 'd3';
import { Nest } from 'd3';

@Injectable()
export class JobService implements Resolve<Promise<any>> {
  nestConfigSubject: BehaviorSubject<NestConfig>;

  public collectionSubject: BehaviorSubject<Collection>;

  public nestSubject: BehaviorSubject<any>;

  public editWindowsEnabled: BehaviorSubject<boolean>;

  private openElements: BehaviorSubject<any>;
  public  selectedElementSubject: BehaviorSubject<any>;

  constructor(
    private db: DataService,
    private elementService: ElementService,
    private router: Router,
    private pipe: ClassToStringPipe
  ) { }

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

    // create example elements for uninitialized job (no roots defined)
    if (!collection.initialized) {
      await this.init(collection);
    }

    let collectionSubject = this.collectionSubject = new BehaviorSubject(collection);

    // catch updates to collection and save them
    // TODO: add undo
    collectionSubject.subscribe(collection => {
      db.collections.put(collection.clean(), <any>collection.id);
    });

    // begin with basic config with no filters and everything enabled
    // TODO: alternatively use localstorage
    let config = {
      folders: {
        order: collection.folders.order.slice(),
        roots: {},
        enabled: {},
        filters: {}
      },
      component: {
        enabled: true,
        filters: []
      },
      filters: []
    }
    collection.folders.order.forEach(n => {
      config.folders.enabled[n] = true;
      config.folders.filters[n] = [];
    });

    let nestConfigSubject = this.nestConfigSubject = new BehaviorSubject(config);

    let trees = this.elementService.buildTreesSubject(collectionSubject, nestConfigSubject);

    let nestSubject = this.elementService.buildNestSubject(collectionSubject, nestConfigSubject);

    // for windowed elements
    let openElements = this.openElements = new BehaviorSubject({});
    let selectedElementSubject = this.selectedElementSubject = new BehaviorSubject(null);

    let editWindowsEnabled = this.editWindowsEnabled = new BehaviorSubject(false);

    return {
      editWindowsEnabled,
      collectionSubject,
      nestConfigSubject,
      selectedElementSubject,
      openElements,
      nestSubject,
      collection,
      trees
    };
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
    await db.collections.put(collection.clean()); // update new roots

    if (createNExampleElements > 0) {
      let elements = await this.elementService.createExampleElements(collection, createNExampleElements);
    }

    return collection;
  }

  async openElement(elementId: string|ChildElement|ComponentElement|FolderElement, kind?) {
    let db = this.db;
    let element;
    if(typeof elementId === 'string') {
      let Class = this.pipe.transform(kind);
      let collection = db[Class.store];
      element = await collection.get(elementId);

    } else {
      element = elementId;

    }
    if(!element) throw new Error('that element does not exist');

    let elements = this.openElements.getValue();

    if (element.id in elements) {
      elements[element.id].config.open = true;
      return elements[element.id];
    }

    // use this to update changes in the window
    let bs = new BehaviorSubject(element);
    let subscription = bs.subscribe(val => {
      db[val.constructor.store].put(val.clean());
    });

    // close other windows
    Object.keys(elements).forEach(id => {
      elements[id].config.open = false;
    });

    elements[element.id] = {
      subscription,
      config: { open: true },
      element: bs
    }
    this.openElements.next(elements);
    this.selectedElementSubject.next(bs);
    return bs;
  }

  addChildElement(to, what) {
    let db = this.db;
    let job = this.collectionSubject.getValue();

    if(to.id === what.id) return;

    return db.transaction('rw', db.folderElements, db.locationElements, db.childElements, db.componentElements, async() => {
      let currentPosition;
      if (what instanceof ChildElement || what instanceof FolderElement) {
        if (!what.id) {
          currentPosition = null;
        } else {
          currentPosition = await db.locationElements.get({ children: what.id });
        }
      }
      if (what instanceof FolderElement) {
        if (!what.id) {
          currentPosition = null;
        } else {
          currentPosition = await db.folderElements.get({ children: what.id });
        }
      }

      if (to instanceof FolderElement) {
        if (what instanceof ChildElement) {
          let i = job.folders.order.indexOf(to.type);
          let id = to.id;

          if (currentPosition) {
            let folders = currentPosition.folders;
            folders[i] = id;
            let keyName = folders.length > 1 ? ('[' + folders.map((n, _i) => 'folder' + _i).join('+') + ']') : 'folder' + i;
            let newPosition: LocationElement = await db.locationElements.get({ [keyName]: folders });
            if (!newPosition) {
              newPosition = new LocationElement(undefined, undefined, job.id, [], folders);
              await db.locationElements.add(newPosition);
            }

            // already in desired position
            if (currentPosition.id == newPosition.id) return;

            newPosition.children.push(what.id);
            currentPosition.children.splice(currentPosition.children.indexOf(what.id), 1);

            // save previous first (else children key error)
            await db.locationElements.put(currentPosition.clean());

            await db.locationElements.put(newPosition.clean());

            return true;

          } else {
            let folders = job.folders.order.map(name => job.folders.roots[name]);
            folders[i] = id;
            let keyName = folders.length > 1 ? ('[' + folders.map((n, _i) => 'folder' + _i).join('+') + ']') : 'folder' + i;
            let newPosition = await db.locationElements.get({ [keyName]: folders });
            if (!newPosition) {
              newPosition = new LocationElement(undefined, undefined, job.id, [], folders);
              await db.locationElements.add(newPosition);
            }

            if(!what.id) {
              let id = await db.childElements.add(what);
              what.id = id;
            }

            newPosition.children.push(what.id);
            await db.locationElements.put(newPosition.clean());

            return true;
          }
        } else if (what instanceof FolderElement) {
          if (currentPosition) {
            // already in desired position
            if (currentPosition.id == to.id) return;

            currentPosition.children.splice(currentPosition.children.indexOf(what.id), 1);
            to.children.push(what.id);

            await db.folderElements.put(currentPosition.clean());
            await db.folderElements.put(to.clean());
            
          } else {
            if(!what.id) {
              let id = await db.folderElements.add(what);
              what.id = id;
            }
            to.children.push(what.id);
            await db.folderElements.put(to.clean());

            return true;

          }
        }
      }

    }).then((res) => {
      if(res !== undefined) this.nestConfigSubject.next(this.nestConfigSubject.getValue()); // touch the config to trigger recalc
    }).catch(err => {
      console.error('drag error', err);
      alert('drag error');
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
      elements[id].subscription.unsubscribe();
      this.selectedElementSubject.next(null);
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
