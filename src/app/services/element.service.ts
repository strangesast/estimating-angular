import { Injectable } from '@angular/core';

import {
  Observable,
  BehaviorSubject,
  ReplaySubject
} from 'rxjs';

import {
  Repo,
  Commit,
  gitModes,
  createGitRepo,
  saveToHash,
  updateRef,
  loadHashAs,
  folderHashFromArray,
  readRef
} from '../resources/git';

import {
  initObjectStore
} from '../resources/util';

// import { diff } from 'deep-diff';

import {
  ComponentElement,
  Location,
  FolderElement,
  Child,
  User,
  Collection,
  NestConfig
} from '../models/classes';

import {
  DB_VERSION,
  DB_NAME,
  STORES,
  retrieveAllRecordsAs,
  retrieveRecordAs,
  saveRecordAs,
  countRecords,
  retrieveRecordArray,
  retrieveUniqueId,
  removeRecord,
  removeRecordAs
} from '../resources/indexedDB';

import { HierarchyNode, Nest } from 'd3';
import * as D3 from 'd3';

/* useful
indexedDB.webkitGetDatabaseNames().onsuccess = (res) =>\
{console.log([].slice.call(res.target.result).forEach((e) => {indexedDB.deleteDatabase(e)}))}
*/

@Injectable()
export class ElementService {
  repo: Repo;
  gitdb: IDBDatabase;
  db: IDBDatabase;

  public _users: BehaviorSubject<User[]> = new BehaviorSubject([]);
  public users: Observable<User[]> = this._users.asObservable();
  public isReady: BehaviorSubject<boolean> = new BehaviorSubject(false);

  public jobMap: any;
  public loaded: any = {};

  public _jobs: BehaviorSubject<Collection[]> = new BehaviorSubject([]);
  public jobs: Observable<Collection[]> = this._jobs.asObservable();
  public jobsSubject: BehaviorSubject<BehaviorSubject<Collection>[]>;

  constructor() { }

  // int db
  resolve(): Promise<any>|boolean {
    if (this.db == null || this.gitdb == null) {
      return Promise.all([
        <any>initObjectStore(DB_NAME, DB_VERSION, STORES), // w/ <any> hack
        createGitRepo()
      ]).then(([store, {repo, gitdb}]) => {
        this.db = store;
        this.repo = repo;
        this.gitdb = gitdb;
        this.isReady.next(true);
        return { store, repo };
      });
    } else {
      return Promise.resolve();
    }
  }

  /* return BehaviorSubject */
  // create job
  // create component
  // create child
  // create folder
  // load job
  // load component
  // load child
  // load folder
  /* Git */
  // save job
  //   add hash property to job/folder/location/child/component
  // load save

  getJobs(): Promise<BehaviorSubject<BehaviorSubject<Collection>[]>> {
    return retrieveAllRecordsAs(this.db, Collection).then(collections => {
      let arr = collections.map(collection => this.loaded[collection.id] || (this.loaded[collection.id] = new BehaviorSubject(collection)));
      if (this.jobsSubject) {
        this.jobsSubject.next(arr);
        return this.jobsSubject;
      }
      return this.jobsSubject = new BehaviorSubject(arr);
    });
  }

  loadElement(_class, id: string): Promise<BehaviorSubject<any>> {
    if (id in this.loaded) {
      return Promise.resolve(this.loaded[id]);
    }
    return retrieveRecordAs(this.db, _class, id).then(result => {
      if (result == null) {
        throw new Error('element with that id (' + id + ') does not exist');
      }
      return this.loaded[id] = new BehaviorSubject(result);
    });
  }

  loadJob(id: string): Promise<BehaviorSubject<Collection>> {
    if (id in this.loaded) {
      return Promise.resolve(this.loaded[id]);
    }
    return this.retrieveJob(id).then(job => {
      if (job == null) {
        throw Error('there is no job with that id');
      }
      return this.loaded[job.id] = new BehaviorSubject(job);
    });
  }

  retrieveJob(id: string): Promise<Collection> {
    return retrieveRecordAs(this.db, Collection, id).then(job => {
      if (job == null) { // check shortname too.  perhaps ugly
        return retrieveRecordAs(this.db, Collection, id, 'shortname');
      }
      return job;
    });
  }

  retrieveAllLocations(job) {
    return retrieveAllRecordsAs(this.db, Location, IDBKeyRange.only(job.id), 'job');
  }

  retrieveComponent(id: string): Promise<ComponentElement> {
    return retrieveRecordAs(this.db, ComponentElement, id);
  }

  retrieveLocationsWith(job:Collection, folderName:string, id:string) {
    let i = job.folders.order.indexOf(folderName);
    if(i == -1) throw new Error('invalid folder name');
    let index = i == 0 ? 'folder1' : 'folder2';
    return retrieveAllRecordsAs(this.db, Location, IDBKeyRange.only(id), index);
  }

  retrieveLocation(id: string|string[]): Promise<Location> {
    if (typeof id === 'string') {
      return retrieveRecordAs(this.db, Location, id);
    } else if (Array.isArray(id)) {
      return retrieveRecordArray(this.db, Location.storeName, id, 'folders').then(result => {
        if (result == null) {
          return null;
        }
        return Location.fromObject(result);
      });
    } else {
      throw new Error('invalid type');
    }
  }

  retrieveCollectionComponents(collection: Collection, limit?:number): Promise<ComponentElement[]> {
    return retrieveAllRecordsAs(this.db, ComponentElement, IDBKeyRange.only(collection.id), 'job', limit);
  }

  createLocation(job, loc, children = []): Promise<Location> {
    let folders = Object.keys(job.folders.roots).map(n => n in loc ? loc[n] : job.folders.roots[n]);
    let _location = new Location(
      '',
      job.id,
      children,
      folders
    );
    return saveRecordAs(this.db, _location).then((locationId) => {
      _location.id = locationId;
      return _location;
    });
  }

  createChild(
    job: Collection,
    componentId: string|ComponentElement,
    loc = {},
    name?: string,
    description?: string,
    qty = 1
  ): Promise<Child> {
    return (typeof componentId === 'string' ? this.retrieveComponent(componentId) : Promise.resolve(componentId)).then(component => {
      if (component == null) {
        throw new Error('cannot create child if component does not exist');
      }
      name = name || component.name;
      description = description || component.description;

      for (let prop in job.folders.roots) {
        if (!(prop in loc)) {
          loc[prop] = job.folders.roots[prop];
        }
      }
      let q = job.folders.order.map(n => loc[n]);
      let child = new Child('', name, description, component.id, 1);
      return Promise.all([
        retrieveUniqueId(),
        this.retrieveLocation(q)
      ]).then(([childId, _location]: [string, any]) => {
        child.id = childId;
        if (_location != null) {
          return _location;
        }
        return this.createLocation(job, loc, []);
      }).then(_location => {
        _location.children = _location.children || [];
        _location.children.push(child);
        return saveRecordAs(this.db, _location);
      }).then(() => {
        return child;
      });
    });
  }

  createComponent(job, name, description, parentId?): Promise<ComponentElement> {
    let component = new ComponentElement(
      '',
      name,
      description,
      job.id, // job id
      [] // children
    );
    return Promise.all([
      saveRecordAs(this.db, component),
      parentId ? retrieveRecordAs(this.db, ComponentElement, parentId) : Promise.resolve(null)
    ]).then(([componentId, par]: [string, any]) => {
      component.id = componentId;
      if (par) {
        par.children = par.children || [];
        par.children.push(componentId);
        return saveRecordAs(this.db, par);
      }
    }).then(() => {
      return component;
    });
  }

  createFolder(job, _type, name, description = '(no description)', parentId?): Promise<FolderElement> {
    if (parentId == null && (!job.folders.roots || !(_type in job.folders.roots))) {
      // root case
      if (name !== 'root') {
        throw new Error('root folder name must be \'root\' (' + name + ')');
      }
      let folder = new FolderElement(
        '',
        name,
        'root folder (' + _type + ')',
        _type,
        job.id,
        []
      );
      return saveRecordAs(this.db, folder).then(folderId => {
        folder.id = folderId;
        job.folders.roots[_type] = folderId;
        return saveRecordAs(this.db, job);
      }).then(() => {
        return folder;
      });
    } else {
      if (!job.folders.roots) {
        throw new Error('root folders have not yet been defined');
      }
      if (!(_type in job.folders.roots)) {
        throw new Error('invalid type for this job');
      }
      // non-root case else
      parentId = parentId || job.folders.roots[_type];
      let folder = new FolderElement(
        '', // id
        name,
        description,
        _type,
        job.id,
        [] // children
      );
      return Promise.all([
        saveRecordAs(this.db, folder),
        retrieveRecordAs(this.db, FolderElement, parentId)
      ]).then(([folderId, par]: [string, any]) => {
        folder.id = folderId;
        par.children = par.children || [];
        par.children.push(folderId);
        return saveRecordAs(this.db, par);
      }).then(parResult => {
        return folder;
      });
    }
  }

  createExampleElements(job, n = 3) {
    //let arr = [...Array(n).keys()];
    let arr = Array.from(Array(n).keys());
    let components, folders, children;

    let createFolders = Promise.all(arr.map(i => {
      let types = Object.keys(job.folders.roots);
      let _type = types[i % types.length];
      let name = ['Example Folder ', i, ' (', _type, ')'].join('');
      return this.createFolder(
        job,
        _type,
        name,
        'description',
      );
    })).then(_folders => folders = _folders);

    let createComponents = Promise.all(arr.map(i => {
      return this.createComponent(
        job,
        'Example Component ' + (i + 1),
        'description'
      );
    })).then(_components => components = _components);

    return this.createLocation(job, job.folders.roots).then(_location => {
      let createChildren = createComponents.then(_components => {
        // create example children
        return Promise.all(_components.map(component => arr.map(i => this.createChild(
          job,
          component,
          undefined, // loc
          undefined, // name
          undefined, // description
          1 + Math.floor(Math.random() * 4), // qty
        ))).reduce((a, b) => a.concat(b))).then(_children => {
          _location.children = _children;
          children = _children
          return saveRecordAs(this.db, _location);
        });
      });

      return Promise.all([createFolders, createChildren]).then(() => {
        return {
          folders: folders,
          components: components,
          children: children
        };
      });

    });
  }

  createJob(
    owner: User,
    shortname: string,
    name = 'New Job',
    description = '(no description)',
    folderNames = ['phase', 'building']
  ): BehaviorSubject<Collection> {
    // by default remove non-alphanumerics and shorten to < 50
    shortname = shortname || name.replace(' ', '_').replace(/[^\w-]/gi, '').substring(0, 50);
    let folderDefinition = { order: folderNames };

    let job = new Collection(
      '',
      name,
      description,
      owner,
      shortname,
      folderDefinition,
      'job'
    );

    let bs = new BehaviorSubject(job);

    if (!shortname) {
      bs.error(new Error('invalid shortname'));
    }
    if (shortname.length < 4) {
      bs.error(new Error('shortname must be at least 4 characters long'));
    }

    saveRecordAs(this.db, job).then(jobId => {
      job.id = jobId;
      this.loaded[jobId] = bs;

      job.folders.roots = {};
      return Promise.all(job.folders.order.map(_type => {
        return this.createFolder(job, _type, 'root');

      })).then(rootFolders => {
        return this.createExampleElements(job);

      }).then((elements) => {
        job.saveState = 'saved:uncommitted';
        bs.next(job);
        this.jobsSubject.next(this.jobsSubject.getValue().concat(bs));
      });
    }).catch(err => {
      bs.error(err);
    });

    return bs;
  }

  retrieveElementChildren(root, array = []): Promise<any[]> {
    if (!root.children || root.children.length === 0) {
      return Promise.resolve(array);
    }
    return Promise.all(root.children.map(id => retrieveRecordAs(this.db, root.constructor, id).then(child => {
      if (array.indexOf(child) === -1) {
        array.push(child);
      }
      return this.retrieveElementChildren(child, array);
    }))).then(() => {
      return array;
    });
  }

  compareTree(a, b?) {
  }

  saveGitTree(collection: Collection) {
    let baseObj = {};

    // toJSON may be extraneous when using stringify
    let createJobHash = saveToHash(this.repo, 'blob', JSON.stringify(collection.toJSON())).then(hash => {
      baseObj['job.json'] = { mode: gitModes.file, hash: hash };
    });

    // get root+descendant folders, save in folders/phase, folders/building
    let roots = collection.folders.roots;
    let createFoldersTree = Promise.all(Object.keys(roots).map(name => {
      return retrieveRecordAs(this.db, FolderElement, roots[name]).then(folder => {
        return this.retrieveElementChildren(folder).then(children => {
          return children.concat(folder);
        });
      }).then(folders => {
        return folderHashFromArray(this.repo, folders).then(hash => {
          return [name, hash];
        });
      });
    })).then(folderTrees => {
      let folderObj = {};
      folderTrees.forEach(([name, hash]) => {
        folderObj[name + 's'] = { mode: gitModes.tree, hash: hash };
      });
      return saveToHash(this.repo, 'tree', folderObj);
    }).then(hash => {
      baseObj[FolderElement.storeName] = { mode: gitModes.tree, hash: hash };
    });

    // get locations, save in locations/.  should eventually identify empty/unused
    let createLocationsTree = retrieveAllRecordsAs(this.db, Location, IDBKeyRange.only(collection.id), 'job').then(locations => {
      return folderHashFromArray(this.repo, locations).then(hash => {
        baseObj[Location.storeName] = { mode: gitModes.tree, hash: hash };
      });
    });

    // gets complicated when multiple commits (different version, same id) are in db
    // should only grab objects without commits.  modifying objects should remove commit attribute
    let createComponentsTree = this.retrieveCollectionComponents(collection).then(components => {
      return folderHashFromArray(this.repo, components).then(hash => {
        baseObj[ComponentElement.storeName] = { mode: gitModes.tree, hash: hash };
      });
    });

    // build tree
    return Promise.all([
      createJobHash,
      createFoldersTree,
      createLocationsTree,
      createComponentsTree
    ]).then(() => {
      // save tree
      return saveToHash(this.repo, 'tree', baseObj);
    });
  }

  saveJob(collection: Collection, message): Promise<{ job: Collection, commit: Commit }> {
    return this.saveGitTree(collection).then(tree => {
      // save commit
      let commitObj = {
        author: collection.owner,
        tree,
        message,
        parents: []
      };
      collection.hash = tree;
      if (collection.commit) {
        commitObj.parents.push(collection.commit);
      }
      return saveToHash(this.repo, 'commit', commitObj);
    }).then(hash => {
      // update ref
      collection.commit = hash;
      return Promise.all([
        loadHashAs(this.repo, 'commit', hash),
        saveRecordAs(this.db, collection),
        updateRef(this.repo, collection.shortname, hash)
      ]).then(([commit]:[Commit]) => {
        return {
          commit,
          job: collection
        };
      });
    });
  }

  removeJob(id: string): Promise<any> {
    if (id in this.loaded) {
      return removeRecordAs(this.db, this.loaded[id].getValue()).then(res => {
        let arr = this.jobsSubject.getValue();
        let i = arr.indexOf(this.loaded[id]);
        if (i > -1) {
          arr.splice(i, 1);
          this.jobsSubject.next(arr);
        }
        delete this.loaded[id];
        return res;
      });
    }
    // this should almost never happen
    return removeRecord(this.db, Collection.storeName, id);
  }

  aboutJob(job: Collection): Observable<any> {
    // count components / children / folders
    // get git save state
    let about = {};

    return Observable.create(subscriber => {
      // should also search history
      let ref = job.shortname;
      let isHeadCommit = readRef(this.repo, ref).then(commitHash => commitHash === job.commit).then(val => {
        about['isHead'] = val;
        subscriber.next(about);
      });
      /*
      let isSaved = Promise.all([
        // will break when no commit exists
        readRef(this.repo, job.shortname).then(commit => commit ? loadHashAs(this.repo, 'commit', commit) : Promise.resolve({tree: null})),
        this.saveGitTree(job)
      ]).then(([commit, treeHash]) => commit.tree == treeHash).then(val => {
        about['isSaved'] = val;
        subscriber.next(about);
      });
      */
      let componentCount = countRecords(this.db, ComponentElement.storeName, job.id, 'job').then(val => {
        about['components'] = val;
        subscriber.next(about);
      });
      let folderCount = countRecords(this.db, FolderElement.storeName, job.id, 'job').then(val => {
        about['folders'] = val;
        subscriber.next(about);
      });
      Promise.all([
        isHeadCommit,
        componentCount,
        folderCount,
        /*
        isSaved
        */
      ]).then(() => {
        subscriber.complete();
      }).catch(err => {
        subscriber.error(err);
      });
    }).debounceTime(100);
  }

  resolveChildren(root) {
    if (!Array.isArray(root.children) || root.children.length === 0) {
      return root;
    }
    return Promise.all(root.children.filter(child=>typeof child === 'string').map(childId => this.loadElement(FolderElement, childId).then(child => {
      let val = child.getValue();
      let i = root.children.indexOf(val.id);
      root.children.splice(i, 1, val);
      return this.resolveChildren(val);
    }))).then(() => {
      return root;
    });
  }

  buildTree(job: Collection, root?:string|FolderElement): Promise<BehaviorSubject<HierarchyNode<any>>> {
    return (typeof root === 'string' ? this.loadElement(FolderElement, root) : Promise.resolve(root)).then(folderSubject => {
      let folder = folderSubject.getValue();
      if(!(folder instanceof FolderElement)) throw new Error('invalid folder');
      if(folder.job != job.id) throw new Error('incompatible job/folder');
      return this.resolveChildren(folder);

    }).then(folder => {
      let node = D3.hierarchy(folder);
      return Promise.resolve(new BehaviorSubject(node));
    });
  }

  buildTreeSubject(jobSubject: BehaviorSubject<Collection>, rootSubject: Observable<string>) {
    return rootSubject.withLatestFrom(jobSubject).switchMap(([root, job]) => {
      let folderSubject = this.loadElement(FolderElement, root);
      return Observable.fromPromise(folderSubject).flatMap(x=>x).switchMap(folder => {
        if(!(folder instanceof FolderElement)) {
          throw new Error('invalid folder root"' + root + '"');
        }
        return Observable.fromPromise(this.resolveChildren(folder).then(()=>D3.hierarchy(folder)));
      });
    });
  }

  buildComponentTree(job: Collection, root?) {
  }

  loadComponentsFromRoot(job, folderNodes) {
  };

  loadChildrenAtRoot2(jobSubject: BehaviorSubject<Collection>, configSubject: BehaviorSubject<any>) {
    return Observable.combineLatest(jobSubject, configSubject).switchMap(([job, config]) => {
      let rootFolderNames = job.folders.order;
      let rootFolderIds = rootFolderNames.map(n => config.folders.roots[n]||job.folders.roots[n]);
      let getRootFolders = Promise.all(rootFolderIds.map(id => this.buildTree(job, id).then(bs=>bs.getValue())));

      let rootFolders;
      let getPairs = getRootFolders.then(folders => {
        rootFolders = folders;
        let descendants = folders.map((folder:any)=>folder.descendants());

        let recurse = (arr, curr=[]) => {
          if (!arr.length) {
            return [curr];
          }
          let a = arr[0];
          let next = arr.slice(1);
          return a.map(x => recurse(next, curr.concat(x))).reduce((a,b)=>a.concat(b));
        }
        return recurse(descendants);
      });

      let combine = getPairs.then(pairs => {

        let getLocations = rootFolders.length ? Promise.all(pairs.map(pair => {
          if(pair.length == 1) return this.retrieveLocationsWith(job, rootFolderNames[0], pair[0].data.id);
          return this.retrieveLocation(pair.map(x=>x.data.id));
        })).then((locations:any[]) => locations.reduce((a, b) => Array.isArray(a) ? a.concat(b) : [a].concat(b)).filter((x,i,arr)=>x != null && arr.indexOf(x) === i)) : this.retrieveAllLocations(job);

        let getChildren = getLocations.then(locations => {
          return locations.map(loc => loc.children ? loc.children.map(child => {
            let folders = {};
            job.folders.order.map((name, i) => {
              folders[name] = loc['folder' + (i+1)];
            });
            child.folders = folders;
            return child;
          }) : []).reduce((a,b) => a.concat(b));
        });

        return getChildren.then(children => {
          return D3.hierarchy({
            name: 'Components',
            children: children
          });
        });
      });
      return Observable.fromPromise(combine);
    });
  }

  loadChildrenAtRoot(job: Collection, roots) {
    let rootFolderNames = Object.keys(roots);
    let rootFolderIds = rootFolderNames.map(n => roots[n]);

    let getRootFolders = Promise.all(rootFolderIds.map(id => this.buildTree(job, id).then(bs=>bs.getValue())));

    let rootFolders;
    let getPairs = getRootFolders.then(folders => {
      rootFolders = folders;
      let descendants = folders.map((folder:any)=>folder.descendants());

      let recurse = (arr, curr=[]) => {
        if (!arr.length) {
          return [curr];
        }
        let a = arr[0];
        let next = arr.slice(1);
        return a.map(x => recurse(next, curr.concat(x))).reduce((a,b)=>a.concat(b));
      }
      return recurse(descendants);
    });

    let combine = getPairs.then(pairs => {

      let getLocations = rootFolders.length ? Promise.all(pairs.map(pair => {
        if(pair.length == 1) return this.retrieveLocationsWith(job, rootFolderNames[0], pair[0].data.id);
        return this.retrieveLocation(pair.map(x=>x.data.id));
      })).then((locations:any[]) => locations.reduce((a, b) => Array.isArray(a) ? a.concat(b) : [a].concat(b)).filter((x,i,arr)=>x != null && arr.indexOf(x) === i)) : this.retrieveAllLocations(job);

      let getChildren = getLocations.then(locations => {
        return locations.map(loc => loc.children ? loc.children.map(child => {
          let folders = {};
          job.folders.order.map((name, i) => {
            folders[name] = loc['folder' + (i+1)];
          });
          child.folders = folders;
          return child;
        }) : []).reduce((a,b) => a.concat(b));
      });

      return getChildren;
    });
    return combine;
  }

  buildNest(jobSubject: BehaviorSubject<Collection>, configSubject: BehaviorSubject<any>) {
    // find root folders
    // build folder trees based on roots / each folder filters
    // get locations for folder intersection
    // get components based on locations + component filters

    // return { entries: entries, keys: keys }

    return Observable.combineLatest(jobSubject, configSubject).switchMap(([job, config]) => {
      let rootFolderNames = config.folders.order
        .filter(name=>config.folders.enabled[name])
      let rootFolderIds = rootFolderNames
        .map(name=>config.folders.roots[name]||job.folders.roots[name]);

      let getRootFolders = Promise.all(rootFolderIds.map(id => this.buildTree(job, id).then(bs=>bs.getValue())));

      let rootFolders;
      let getPairs = getRootFolders.then(folders => {
        rootFolders = folders;
        let descendants = folders.map((folder:any)=>folder.descendants());

        let recurse = (arr, curr=[]) => {
          if (!arr.length) {
            return [curr];
          }
          let a = arr[0];
          let next = arr.slice(1);
          return a.map(x => recurse(next, curr.concat(x))).reduce((a,b)=>a.concat(b));
        }
        return recurse(descendants);
      });

      let combine = getPairs.then(pairs => {

        let getLocations = rootFolders.length ? Promise.all(pairs.map(pair => {
          if(pair.length == 1) return this.retrieveLocationsWith(job, rootFolderNames[0], pair[0].data.id);
          return this.retrieveLocation(pair.map(x=>x.data.id));
        })).then((locations:any[]) => locations.reduce((a, b) => Array.isArray(a) ? a.concat(b) : [a].concat(b)).filter((x,i,arr)=>x != null && arr.indexOf(x) === i)) : this.retrieveAllLocations(job);

        let getChildren = getLocations.then(locations => {
          return locations.map(loc => loc.children ? loc.children.map(child => {
            let folders = {};
            job.folders.order.map((name, i) => {
              folders[name] = loc['folder' + (i+1)];
            });
            child.folders = folders;
            return child;
          }) : []).reduce((a,b) => a.concat(b));
        });

        return getChildren.then(children => {
          return {
            entries: children,
            keys: rootFolders
          }
        });
      });

      return Observable.fromPromise(combine);

    });
  }

  buildTrees(jobSubject: BehaviorSubject<Collection>, configSubject: BehaviorSubject<any>) {
    let subject = new ReplaySubject(1);
    let roots = {};
    configSubject.withLatestFrom(jobSubject).switchMap(([config, job]) => {
      // detect root prop add/remove
      let n = Object.keys(Object.assign({}, job.folders.roots, config.folders.roots));
      let m = Object.keys(roots);
      let rootPropsChanged = n.some(el=>m.indexOf(el) === -1) || m.some(el=>n.indexOf(el) === -1);
      if(rootPropsChanged) {
        n.forEach(name => {
          let idSubject = configSubject.map(_config => _config.folders.roots[name]||job.folders.roots[name]).startWith('').distinctUntilChanged().pairwise().map(([a, b]) => {
            return b;
          });
          roots[name] = this.buildTreeSubject(jobSubject, idSubject);
        });
        Object.keys(roots).forEach(_n => {
          if(n.indexOf(_n) == -1) {
            delete roots[_n];
          }
        });
        return Observable.of(roots);

      } else {
        return Observable.never();
      }
    }).subscribe(subject);
    return subject;
  }
}
