import { Injectable } from '@angular/core';

import {
  Subject,
  Observable,
  Subscription,
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
  saveRecordAsSubject,
  countRecords,
  retrieveRecordArray,
  retrieveUniqueId,
  removeRecord,
  removeRecordAs,
  retrieveRecordsInAs
} from '../resources/indexedDB';

import { HierarchyNode, Nest } from 'd3';
import * as D3 from 'd3';

function product(arr) {
  return arr.reduce((a, b) =>
    a.map((x) =>
      b.map((y) =>
        x.concat(y)
      )
    ).reduce((a, b) =>
      a.concat(b), []),
  [[]]);
}

function applyMethod(method, val, test) {
  if(['includes', 'startsWith', 'endsWith'].indexOf(method) !== -1) {
    return (<any>String.prototype[method]).call(test, val);
  } else if (method === 'lessThan') {
    return !isNaN(test) && Number(test) < val;
  } else if (method === 'greaterThan') {
    return !isNaN(test) && Number(test) > val;
  } else if (method === 'equal') {
    return !isNaN(test) && Number(test) == val;
  } else {
    return true;
  }
}

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

  private _jobs: BehaviorSubject<Collection[]> = new BehaviorSubject([]);
  public jobs: Observable<Collection[]> = this._jobs.asObservable();
  public jobsSubject: BehaviorSubject<BehaviorSubject<Collection>[]>;

  private updateSubject: Subject<BehaviorSubject<any>[]> = new Subject(); // array of loaded elements
  private updateSubjectSub: Subscription;

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
        this.init();
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
  init() {
    if(this.updateSubjectSub) throw new Error('already initialized');
    this.updateSubjectSub = this.updateSubject.switchMap(elements => {
      // if updateSubjct updated before finishing save bad things happen
      return Observable.merge(...elements).flatMap(element => {
        // TODO: improve this.  should change save state, save, then reset to correct savestate
        //return saveRecordAs(this.db, element);
        return saveRecordAsSubject(this.db, element);
      });
    }).subscribe();
  }

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
      if(!(result instanceof _class)) throw new Error('invalid load');
      this.loaded[id] = new BehaviorSubject(result);
      this.updateLoaded();
      return this.loaded[id];
    });
  }

  retrieveElement(_class, id: string) {
    return retrieveRecordAs(this.db, _class, id);
  }

  loadJob(id: string): Promise<BehaviorSubject<Collection>> {
    if (id in this.loaded) {
      return Promise.resolve(this.loaded[id]);
    }
    return this.retrieveJob(id).then(job => {
      if (job == null) {
        throw Error('there is no job with that id');
      }
      this.loaded[job.id] = new BehaviorSubject(job);
      this.updateLoaded();
      return this.loaded[job.id];
    });
  }

  updateLoaded() {
    this.updateSubject.next(Object.keys(this.loaded).map(key => this.loaded[key]));
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

  retrieveChild(id: string): Promise<Child> {
    return retrieveRecordAs(this.db, Child, id);
  }

  retrieveChildrenIn(ids: string[]): Promise<Child[]> {
    return ids.length ? retrieveRecordsInAs(this.db, Child, ids) : Promise.resolve([]);
  }

  retrieveComponentsIn(ids: string[], prev={}): Promise<ComponentElement[]> {
    return ids.length ? retrieveRecordsInAs(this.db, ComponentElement, ids).then(components => {
      let parents = {};
      components.forEach(component => Array.isArray(component.children) ? component.children.forEach(c => parents[c] = null) : null);
      return this.retrieveChildrenIn(Object.keys(parents)).then(arr => {
        arr.forEach(c => parents[c.id] = c);
        components.forEach(c => c.children = c.children.map(_c => typeof _c === 'string' ? parents[_c] : _c));
        return components;
      })
    }) : Promise.resolve([]);
  }

  retrieveLocationsWith(job:Collection, folderName:string, id:string) {
    let i = job.folders.order.indexOf(folderName);
    if(i == -1) throw new Error('invalid folder name ' + folderName);

    let index = i == 0 ? 'folder1' : 'folder2';
    return retrieveAllRecordsAs(this.db, Location, IDBKeyRange.only(id), index);
  }

  retrieveLocation(id: string[]): Promise<Location> {
    return retrieveRecordAs(this.db, Location, id, 'folders');
  }

  retrieveCollectionComponents(collection: Collection, limit?:number): Promise<ComponentElement[]> {
    return retrieveAllRecordsAs(this.db, ComponentElement, IDBKeyRange.only(collection.id), 'job', limit);
  }

  createLocation(job, loc, children:string[] = []): Promise<Location> {
    let folders = job.folders.order.map(name => loc[name] || job.folders.roots[name]);

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

  createChild(job: Collection, componentId: string|ComponentElement, loc?, name?: string, description?: string, qty = 1): Promise<Child> {
    return (typeof componentId === 'string' ? this.retrieveComponent(componentId) : Promise.resolve(componentId)).then(component => {
      if (component == null) {
        throw new Error('cannot create child if component does not exist');
      }

      // use component name, description.  should probably add (copy) or something
      name = name || component.name;
      description = description || component.description;

      let child = new Child('', name, description, job.id, component.id, qty);

      let saveChild = saveRecordAs(this.db, child).then(childId => {
        child.id = childId;
        return child;
      });

      // if loc is unspecified, create location manually
      if(loc == undefined) {
        return saveChild;

      } else {
        let folders = job.folders.order.map(name => loc[name] || job.folders.roots[name]);

        return Promise.all([
          <Promise<Child>>saveChild,
          this.retrieveLocation(folders).then(_location => _location || this.createLocation(job, loc, []))
        ]).then(([child, _location]:[any, any]) => {
          _location.children = _location.children || [];
          _location.children.push(child.id);

          return saveRecordAs(this.db, _location).then(() => child);
        });;
      }
    });
  }

  createComponent(job, name, description, parentId?): Promise<ComponentElement> {
    let component = new ComponentElement(
      '',
      name,
      description,
      Math.ceil(Math.random()*100000)/100, // sell
      Math.ceil(Math.random()*10000)/100,  // buy
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

  createFolder(job, _type, name, description = '(no description)', children = [], parentId?): Promise<FolderElement> {
    let folder = new FolderElement('', name, description, _type, job.id, children);

    let saveFolder = saveRecordAs(this.db, folder).then(folderId => {
      folder.id = folderId;
      return folder;
    });

    if(parentId === undefined) {
      return saveFolder;

    } else {
      let getParentFolder:Promise<FolderElement> = retrieveRecordAs(this.db, FolderElement, parentId);

      return Promise.all([
        saveFolder,
        getParentFolder
      ]).then(([child, _parent]) => {
        _parent.children = _parent.children || [];
        _parent.children.push(child.id);

        return saveRecordAs(this.db, _parent).then(() => child);
      });
    }
  }

  createExampleElements(job, n = 3) {
    let arr = Array.from(Array(n).keys());
    let ret:any = {};

    let createFolders: Promise<FolderElement[]> = Promise.all(arr.map(i => {
      let types = Object.keys(job.folders.roots);
      let _type = types[i % types.length];
      let name = ['Example Folder ', i, ' (', _type, ')'].join('');
      return this.createFolder(
        job,
        _type,
        name,
        'description',
      );
    })).then(folders => {
      let types = folders.map(f => f.type).filter((t, i, arr) => arr.indexOf(t) === i);
      ret.folders = folders
      return Promise.all(types.map(t => {
        return retrieveRecordAs(this.db, FolderElement, job.folders.roots[t]).then((rootFolder:FolderElement) => {
          rootFolder.children = rootFolder.children || [];
          rootFolder.children.push(...folders.filter(f => f.type == t).map(f => f.id));
          return saveRecordAs(this.db, rootFolder);
        });
      })).then(() => folders);
    });

    let createComponents = Promise.all(arr.map(i => this.createComponent(
      job,
      'Example Component ' + (i + 1),
      'description'
    ))).then(components => ret.components = components);

    let createChildren: Promise<Child[]> = createComponents.then(components => {
      return Promise.all(components.map(component => arr.map(i => this.createChild(
        job,
        component,
        undefined,
        component.name + ' (Child '+(i+1)+')',
        component.description + ' (Child '+(i+1)+')',
        Math.ceil(Math.random()*4)
      ))).reduce((a, b)=>a.concat(b)));
    }).then(children => ret.children = children);

    let createLocations = Promise.all([createFolders, createChildren]).then(([folders, children]) => {
      let groups = product(job.folders.order.map(t => folders.filter((f:any) => f.type === t).map(f => f.id)));
      let copy = children.map(c => c.id);
      return Promise.all(groups.map((pair, i) => {
        let ob = {};
        job.folders.order.forEach((name, j) => ob[name] = pair[j]);
        let chil = copy.splice(0, groups.length);
        return this.createLocation(job, ob, chil);
      }));
    }).then(locations => ret.locations = locations);

    return createLocations.then(() => ret);
  }

  createJob(
    owner: User,
    shortname: string,
    name = 'New Job',
    description = '(no description)',
    folderNames = ['phase', 'building'],
    exampleElements = true
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
        return this.createFolder(job, _type, 'root').then(folder => {
          job.folders.roots[_type] = folder.id;
        });

      })).then(rootFolders => {
        // add a few example components (folders, components, children)
        return exampleElements ? this.createExampleElements(job, 5) : Promise.resolve({});

      }).then((elements) => {
        console.log('created', elements);
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
      return Promise.all(<any>[
        loadHashAs(this.repo, 'commit', hash),
        saveRecordAs(this.db, collection),
        updateRef(this.repo, collection.shortname, hash)
      ]).then(([commit]:[any]) => {
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

  retrieveChildren(root) {
    return Promise.all(root.children.filter(c => typeof c === 'string').map((id, i) => retrieveRecordAs(this.db, root.constructor, id).then(child => {
      root.children.splice(i, 1, child);
      return this.retrieveChildren(child);
    }))).then(() => root);
  }

  retrieveChildChildren(rootId:string|Child) {
    return (typeof rootId === 'string' ? this.retrieveChild(rootId) : Promise.resolve(rootId)).then((root:Child) => {
      return this.retrieveComponent(root.ref).then(component => {
        root.data = component;
        return Promise.all((root.data.children || []).map(this.retrieveChildChildren.bind(this))).then((res) => {
          root.data.children = res;
          return root;
        });
      });
    });
  }

  retrieveAllChildren(job, rootFolder) {
    // load folder tree
    let getFolderTree = this.retrieveChildren(rootFolder).then(() => {
      return D3.hierarchy(rootFolder)
    })
    // load locations for each folder in tree
    let i = job.folders.order.indexOf(rootFolder.type);
    if (i == -1) throw new Error('invalid folder type for this job "'+rootFolder.type+'"');
    let getLocations = getFolderTree.then(node => {
      let folderIds = node.descendants().map(f => f.data.id);
      let keyName = 'folder' + (i + 1);
      return retrieveRecordsInAs(this.db, Location, folderIds, keyName);
    });
    // load children of those locations
    let childrenToFolder = {};
    let getChildren = getLocations.then(locations => {
      locations.forEach(loc => loc.children.forEach(cid => childrenToFolder[cid] = loc.folders[i]));
      return retrieveRecordsInAs(this.db, Child, Object.keys(childrenToFolder));
    });
    // load tree for each child
    let getChildrenChildren = getChildren.then(children => {
      return Promise.all(children.map(child => this.retrieveChildChildren(child))).then(() => {
        let folderToChildren = {};
        children.forEach(child => {
          let f = childrenToFolder[child.id];
          let a = folderToChildren[f];
          if (a) {
            a.push(child)
          } else {
            folderToChildren[f] = [child];
          }
        });
        return folderToChildren;
      });
    });
    // load whole tree
    return getChildrenChildren.then(ob => {
      let node = D3.hierarchy(rootFolder, (d) => {
        if (d instanceof FolderElement) {
          let more = ob[d.id] || [];
          return d.children.concat(more);
        } else if (d instanceof Child) {
          return d.data ? d.data.children : [];
        } else if (d instanceof ComponentElement) {
          return d.children;
        } else {
          throw new Error('unexpected type');
        }
      });
      return node;
    })
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
    let subject = new BehaviorSubject(null);
    rootSubject.withLatestFrom(jobSubject).switchMap(([root, job]) => {
      let folderSubject = this.loadElement(FolderElement, root);
      return Observable.fromPromise(folderSubject).flatMap(x=>x).switchMap(folder => {
        if(!(folder instanceof FolderElement)) {
          throw new Error('invalid folder root"' + root + '"');
        }
        return Observable.fromPromise(this.retrieveChildren(folder).then(()=>{
          let node =  D3.hierarchy(folder);
          return node;
        }));
      });
    }).subscribe(subject);
    return subject;
  }

  loadRootFolderNodes(folderIds): Promise<HierarchyNode<FolderElement>[]> {
    return Promise.all(folderIds.map(id => (typeof id === 'string' ? retrieveRecordAs(this.db, FolderElement, id) : Promise.resolve(id)).then(this.retrieveChildren.bind(this)))).then(folders => folders.map(folder => D3.hierarchy(folder)));
  }
  
  loadChildrenAtRoot(nodes, filters=[]): Promise<HierarchyNode<Child>[]> {
    // get all combinations of locations
    let pairs = product(nodes.map(node => node.descendants().map((n:any) => n.data.id)));
    return Promise.all(pairs.map(pair => this.retrieveLocation(pair))).then((locations:Location[]) => {
      // filter null locations (no children yet), get children at those locations
      let validLocs = locations.filter(l => l != null && l.children && l.children.length);
      let childIds = validLocs.map(l => l.children).reduce((a, b)=>a.concat(b));

      let map = {};
      validLocs.forEach(loc => {
        loc.children.forEach(id => map[id] = loc.folders);
      });

      return this.retrieveChildrenIn(childIds).then(children => {
        let components = {};
        children.forEach((child:any) => {
          child.folders = map[child.id];
          components[child.ref] = null
        });
        return this.retrieveComponentsIn(Object.keys(components)).then(compArr => {
          compArr.forEach((component:ComponentElement) => {
            components[component.id] = component;
          });
          return children.filter(child => {
            return filters.every(f => applyMethod(f.method, f.value, child[f.property]));
          }).map((child:Child) => {
            child.data = components[child.ref];
            return D3.hierarchy(child, (d) => d.data ? d.data.children : []);
          });
        });
      });
    });
  }

  buildNest(jobSubject: BehaviorSubject<Collection>, configSubject: BehaviorSubject<NestConfig>) {
    return configSubject.withLatestFrom(jobSubject).switchMap(([config, job]) => {
      let rootFolderIds = config.folders.order.map(name => config.folders.roots[name]||job.folders.roots[name]);
      let promise = this.loadRootFolderNodes(rootFolderIds).then(nodes => {
        return this.loadChildrenAtRoot(nodes, config.filters.concat(config.component.filters).filter(f => f.type == 'property')).then(children => {
          let nodesEnabled = config.folders.order.map(name => config.folders.enabled[name]);
          return {
            keys: nodes.filter((n, i) => nodesEnabled[i]),
            entries: children,
            config
          };
        });
      });
      return Observable.fromPromise(promise);
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
          let idSubject = configSubject.map(_config => _config.folders.roots[name]||job.folders.roots[name]);
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
