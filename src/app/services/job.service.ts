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
import { TreeService } from './tree.service';
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
  public selectedElementSubject: BehaviorSubject<string>;

  constructor(
    private db: DataService,
    private elementService: ElementService,
    private router: Router,
    private pipe: ClassToStringPipe,
    private treeService: TreeService
  ) { }

  async resolve(route: ActivatedRouteSnapshot): Promise<boolean|{ editWindowsEnabled, collectionSubject, nestConfigSubject, selectedElementSubject, openElements, nestSubject, collection, trees }> {
    let username = route.params['username'];
    let shortname = route.params['shortname'];

    let db = this.db;

    // need extra await for different dexie promise
    let collection = await db.collections.get({ '[owner.username+shortname]': [username, shortname] });

    if (!collection) {
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
        enabled: false,
        filters: []
      },
      filters: []
    }
    collection.folders.order.forEach(n => {
      config.folders.filters[n] = [];
    });
    config.folders.enabled[config.folders.order[0]] = true;

    let nestConfigSubject = this.nestConfigSubject = new BehaviorSubject(config);

    let nestSubject2 = this.treeService.test(collectionSubject, nestConfigSubject);

    let trees = this.elementService.buildTreesSubject(collectionSubject, nestConfigSubject);

    let nestSubject = this.elementService.buildNestSubject(collectionSubject, nestConfigSubject);

    // for windowed elements
    let openElements = this.openElements = new BehaviorSubject({});
    let selectedElementSubject = this.selectedElementSubject = new BehaviorSubject(undefined);

    let editWindowsEnabled = this.editWindowsEnabled = new BehaviorSubject(false);

    return {
      editWindowsEnabled,
      collectionSubject,
      nestConfigSubject,
      selectedElementSubject,
      openElements,
      nestSubject,
      nestSubject2,
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
      this.selectedElementSubject.next(element.id);
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
    this.selectedElementSubject.next(element.id);
    return bs;
  }

  addChildElement(to, what, config) {
    let job = this.collectionSubject.getValue();
    return this.elementService.addChildElement(job, to, what, config).then((res) => {
      if(res !== undefined) this.nestConfigSubject.next(this.nestConfigSubject.getValue()); // touch the config to trigger recalc
    }).catch(err => {
      console.error('drag error', err);
      alert('drag error');
    });

    /*
    let db = this.db;

    if(to.id === what.id) return;
    let job = this.collectionSubject.getValue();

    return db.transaction('rw', db.folderElements, db.locationElements, db.childElements, db.componentElements, async() => {
      let currentPosition;
      if (what instanceof ChildElement) {
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
          if (i == -1) throw new Error('invalid job folder state');
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
            let childIndex = currentPosition.children.indexOf(what.id);
            if(childIndex == -1) throw new Error('malformed');
            currentPosition.children.splice(childIndex, 1);

            // save previous first (else children key error)
            await db.locationElements.put(currentPosition.clean());

            await db.locationElements.put(newPosition.clean());

            return true;

          } else {
            let folders = job.orderedFolders;
            config.folders.order.filter(n => config.folders.roots[n]).forEach(n => folders[job.folders.order.indexOf(n)] = config.folders.roots[n]);
            folders[i] = id;
            let keyName = folders.length > 1 ? ('[' + folders.map((n, _i) => 'folder' + _i).join('+') + ']') : 'folder' + i;
            let newPosition = await db.locationElements.get({ [keyName]: folders });
            if (!newPosition) {
              newPosition = new LocationElement(undefined, undefined, job.id, [], folders);
              await db.locationElements.add(newPosition);
            }

            if(!what.id) {
              what.id = await db.childElements.add(what);
            }

            newPosition.children.push(what.id);
            await db.locationElements.put(newPosition.clean());

            return true;
          }
        } else if (what instanceof ComponentElement) {
          if (!what.id) {
            what.collection = to.collection;
            what.id = await db.componentElements.add(what);
          }

          let child = new ChildElement(what.name, what.description, what.collection, what.id);
          child.id = await db.childElements.add(child);

          let folders = job.orderedFolders;
          config.folders.order.filter(n => config.folders.roots[n]).forEach(n => folders[job.folders.order.indexOf(n)] = config.folders.roots[n]);
          let i = job.folders.order.indexOf(to.type);
          folders[i] = to.id;

          let keyName = folders.length > 1 ? ('[' + folders.map((n, _i) => 'folder' + _i).join('+') + ']') : 'folder' + i;
          let newPosition = await db.locationElements.get({ [keyName]: folders });
          if (!newPosition) {
            newPosition = new LocationElement(undefined, undefined, job.id, [], folders);
            await db.locationElements.add(newPosition);
          }

          newPosition.children.push(child.id);
          await db.locationElements.put(newPosition.clean());

          return true;

        } else if (what instanceof FolderElement) {
          if (currentPosition) {
            // already in desired position
            if (currentPosition.id == to.id) return;

            let childIndex = currentPosition.children.indexOf(what.id);
            if(childIndex == -1) throw new Error('malformed');
            currentPosition.children.splice(childIndex, 1);
            to.children.push(what.id);

            await db.folderElements.put(currentPosition.clean());
            await db.folderElements.put(to.clean());
            
          } else {
            if(!what.id) {
              what.type = to.type;
              what.collection = to.collection;
              what.id = await db.folderElements.add(what);
            }
            to.children.push(what.id);
            await db.folderElements.put(to.clean());

            return true;

          }
        }
      } else if (to instanceof ChildElement) {
        if(!(what instanceof ChildElement || what instanceof ComponentElement)) throw new Error('invalid drag');

        // potentially unwanted: dragged element copies location of destination.  confusing when only one folder is visible

        let desiredPosition: LocationElement|ComponentElement = (await db.locationElements.get({ children: to.id })) || (await db.componentElements.get({ children: to.id }));
        if(!desiredPosition) {
          throw new Error('invalid or malformed destination');
        }

        if (what instanceof ChildElement) {
          if (!what.id) {
            what.collection = to.collection;
            what.id = await db.childElements.add(what);
          }
          
          if (currentPosition.id == desiredPosition.id) return;

          if (currentPosition) {
            let childIndex = currentPosition.children.indexOf(what.id);
            if(childIndex == -1) throw new Error('malformed');
            currentPosition.children.splice(childIndex, 1)
            await db[(<any>currentPosition.constructor).store].put(currentPosition);
          }

          (<(string|number)[]>desiredPosition.children).push(what.id);
          await db[(<any>desiredPosition.constructor).store].put(desiredPosition);

          return true;

        } else if (what instanceof ComponentElement) {
          if(!what.id) {
            what.collection = to.collection;
            what.id = await db.componentElements.add(what);
          }

          let child = new ChildElement(what.name, what.description, what.collection, what.id);
          child.id = await db.childElements.add(child);

          (<(string|number)[]>desiredPosition.children).push(child.id);
          await db[(<any>desiredPosition.constructor).store].put(desiredPosition);

          return true;
        }
      }

    }).then((res) => {
      if(res !== undefined) this.nestConfigSubject.next(this.nestConfigSubject.getValue()); // touch the config to trigger recalc
    }).catch(err => {
      console.error('drag error', err);
      alert('drag error');
    });
    */
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

        } else if (filter.type === 'root') {
          let existing = filters.find(f => f.type === 'root');
          if (!existing) {
            throw new Error('already removed');
          }
          config.folders.roots[name] = null;
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
        } else if (filter.type === 'root') {
          let existing = filters.find(f => f.type === 'root');
          if (existing) {
            filters.splice(filters.indexOf(existing), 1, filter);
          } else {
            filters.push(filter);
          }
          config.folders.roots[name] = filter.value;
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

  async getParentFolderPath(folderId: string) {
    let db = this.db;
    let table = db.folderElements;

    let path = [];
    let ret = [];

    let par, id = folderId;

    let first = await table.get(<any>folderId);
    if (!first) throw new Error('folder with that id does not exist');

    ret.unshift({ name: first.name, id });

    do {
      par = await table.get({ children: id })
      path.unshift(id);
      if (par) {
        id = par.id;
        if (path.indexOf(id) !== -1) {
          throw new Error('parent loop');
        }
        ret.unshift({ id, name: par.name });
      }
    } while (par != null);

    return ret.slice(1); // don't send the root

  }

  async getParentFolderCandidates() {
    let db = this.db;
    let job = this.collectionSubject.getValue();
    let id = job.id;
    let folders = await db.folderElements.where('collection').equals(id).toArray();

    return folders.map(f => ({ value: f.id, key: f.name, type: f.type }));
  }

  async getParentChildCandidates() {
    let db = this.db;
    let children = await db.childElements.toArray();

    return children.map(f => ({ value: f.id, key: f.name }));
  }

  async getComponentCandidates() {
    let db = this.db;
    let components = await db.componentElements.toArray();

    return components.map(c => ({ value: c.id, key: c.name }));
  }

  async createElement(props, Class) {
    let job = this.collectionSubject.getValue();
    let db = this.db;
    let parent;
    if (Class === FolderElement) {
      if (props.parent != null) {
        parent = await db.folderElements.get(props.parent);
        if(parent == null) throw new Error('parent with that id does not exist');
        if(parent.type !== props.type) throw new Error('incompatible parent folder type');
      }
    } else if (Class === ComponentElement) {
      if (props.parent != null) {
        parent = await db.childElements.get(props.parent);
        if(parent == null) throw new Error('parent with that id does not exist');
      }
    }
    let instance = Class.fromJSON(props).clean();
    instance.collection = job.id;

    instance.id = await db[Class.store].add(instance);

    if (parent) {
      parent.children.push(instance.id);
      await db[parent.constructor.store].put(parent);
    }

    return instance;
  }

  async getFolder(id) {
    let db = this.db;
    return db.folderElements.get(<any>id);
  }
}
