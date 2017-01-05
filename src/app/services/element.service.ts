import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

import {
  Repo,
  createGitRepo,
  //gitModes, 
  //gitIndexedDb, 
  //gitMemDb, 
  //gitCreateTree, 
  //gitPackOps, 
  //gitWalkers, 
  //gitReadCombiner, 
  //gitFormats, 
  //gitModesInv
} from '../resources/git';

import * as git from '../resources/git';

import {
  initObjectStore, 
  streamify, 
  promisify, 
  random
} from '../resources/util';

import { diff } from 'deep-diff';

import {
  ActivatedRouteSnapshot,
  Resolve,
  Router
} from '@angular/router';

import {
  ComponentElement,
  FolderDefinition,
  Location,
  BasedOn,
  FolderElement,
  Child,
  User,
  Collection
} from '../models/classes';

import {
  COMPONENT_STORE_NAME,
  INVALID_FOLDER_TYPES,
  LOCATION_STORE_NAME,
  FOLDER_STORE_NAME,
  USER_COLLECTION,
  JOB_STORE_NAME,
  STORE_VERSION,
  STORE_NAME,
  STORES,
  retrieveAllRecordsAs,
  retrieveRecordAs,
  saveRecordAs,
  countRecords,
  retrieveRecordArray,
  retrieveUniqueId
} from '../resources/indexedDB';


// useful
//indexedDB.webkitGetDatabaseNames().onsuccess = (res) => {console.log([].slice.call(res.target.result).forEach((e)=>{indexedDB.deleteDatabase(e)}))}

const classToStoreName = {
  Collection:       JOB_STORE_NAME,
  FolderElement:    FOLDER_STORE_NAME,
  Location:  LOCATION_STORE_NAME,
  Component: COMPONENT_STORE_NAME
};

@Injectable()
export class ElementService {
  repo: Repo;
  gitdb: IDBDatabase;
  db: IDBDatabase;

  public _users: BehaviorSubject<User[]> = new BehaviorSubject([]);
  public users: Observable<User[]> = this._users.asObservable();

  public jobMap: any;

  public _jobs: BehaviorSubject<Collection[]> = new BehaviorSubject([]);
  public jobs: Observable<Collection[]> = this._jobs.asObservable();
  public jobsSubject: BehaviorSubject<BehaviorSubject<Collection>[]>;

  constructor() { }

  // int db
  resolve(): Promise<any>|boolean {
    if(this.db == null || this.gitdb == null) {
      return Promise.all([
        <any>initObjectStore(STORE_NAME, STORE_VERSION, STORES), // w/ <any> hack
        createGitRepo()
      ]).then(([store, {repo, gitdb}]) => {
        this.db = store;
        this.repo = repo;
        this.gitdb = gitdb;
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

  /*
  // returns [componentRecordId, locationRecordId]
  addComponent(component: ComponentElement, job: Collection, folders) {
    folders = folders || {};
    let locId = Location.createId(folders, job);
    return this.retrieveRecord(this.db, 'locations', locId).then((obj) => {
      // get record, create if not exists
      if(obj == null) {
        let loc = Location.fromJob(job, folders, []);
        if(locId != loc.id) throw new Error('wtf');
        return this.saveRecord(this.db, 'locations', loc.toJSON()).then((recordId)=>{
          return this.retrieveRecord(this.db, 'locations', recordId);
        });
      }
      return obj;
    }).then((locRecord)=>{
      let loc = Location.fromObject(locRecord);
      let childIds = loc.children.map((c)=>c.id);
      let i = childIds.indexOf(component.id);
      if(i != -1) {
        loc.children[i].qty = loc.children[i].qty + 1;
      } else {
        let child = new Child(random(), component.id, 1);
        loc.children.push(child);
      }
      component.saveState = 'saved:uncommitted';
      return Promise.all([
        this.saveRecord(this.db, 'components', component.toJSON(false)),
        this.saveRecord(this.db, 'locations', loc.toJSON())
      ]);
    });
  }
  */

  removeJob(job: Collection): Promise<any> {
    return this.removeRecordFrom('jobs', job.id).then(res=> {
      return res;
    });
  }

  load(_class, id:string, key?:string) {
    if(typeof _class.fromObject !== "function") throw new Error('need create method on class'); 
    let storeName = classToStoreName[_class];
    this.retrieveRecordFrom(storeName, id, key).then(record=>{
      let inst = _class.fromObject(record);
      let bs = new BehaviorSubject(inst);
      bs.subscribe(val=>{
        console.log('val');
      });
    });
  }

  // should return observable
  loadJob(shortname: string): Promise<BehaviorSubject<Collection>> {
    return retrieveRecordAs(this.db, Collection, shortname, 'shortname').then((job:Collection) => {
      if(job == null || job.kind != 'job') throw new Error('invalid/nonexistant job');
      let arr = [];
      if(this.jobsSubject) {
        arr = this.jobsSubject.getValue();
        for (let i=0; i<arr.length; i++) {
          if(arr[i].getValue().id == job.id) {
            return arr[i];
          }
        }
      }
      let bs = new BehaviorSubject(job);
      if(this.jobsSubject) this.jobsSubject.next(arr.concat(bs));
      return bs;
    });
  }

  loadElement(_class, id) {
    // use loaded instance instead
    return retrieveRecordAs(this.db, _class, id);
  }

  // should return observable
  loadFolder(id: string): Promise<FolderElement> {
    return this.retrieveRecordFrom(FOLDER_STORE_NAME, id).then(record => {
      if(record == null) throw new Error('folder with that id "'+id+'" does not exist');
      return FolderElement.fromObject(record);
    });
  }

  loadLocation(id: string): Promise<Location> {
    return this.retrieveRecordFrom(LOCATION_STORE_NAME, id).then(record => {
      if(record == null) throw new Error('location with that id"'+id+'" does not exist');
      return Location.fromObject(record);
    });
  }

  loadComponent(id: string): Promise<ComponentElement> {
    return this.retrieveRecordFrom(COMPONENT_STORE_NAME, id).then(record => {
      if(record == null) throw new Error('component with that id"'+id+'" does not exist');
      return ComponentElement.fromObject(record);
    });
  }

  loadComponentInChild(child: Child): Promise<Child> {
    return this.loadComponent(child.ref).then(comp=>{
      child.data = comp;
      return child;
    });
  }

  /*
  getJob(username: string, shortname: string): Promise<any> {
    return this.retrieveJob(username, shortname).then(({saved, current}:{saved: Collection, current: Collection}) => {
      if(saved == null) throw new Error('job with that username/shortname does not exist ("'+[username, shortname].join('/')+'")');
      return {saved: saved, current: current};
    });
  }

  getJobs(): Promise<Collection[]> {
    return this.readRefs(this.gitdb).then((refs) => {
      // read all refs -> many may point to same job
      return Promise.all(refs.map((ref)=>this.readRef(ref)));

    }).then((jobs) => {
      return Promise.all(jobs.map((commitHash)=>{
        return this.loadAs('commit', commitHash).then((commit) => {
          return this.loadAs('tree', commit.tree);
        }).then((tree)=>{
          if(tree['job.json'] == null) throw new Error('malformed job tree');
          return this.loadAs('text', tree['job.json'].hash).then((text)=>{
            let data = JSON.parse(text);
            data.commit = commitHash;
            // load the most recent (perhaps unsaved) version of the job
            return this.retrieveJobById(data.id).then(job => {
              if(job != null) return job;
              return Collection.fromObject(data); 
            });
          });
        });
      }));
    });
  };
  */

  getJobs(): Promise<BehaviorSubject<BehaviorSubject<Collection>[]>> {
    return retrieveAllRecordsAs(this.db, Collection).then(collections => {
      let arr = collections.map(collection => new BehaviorSubject(collection));
      if(this.jobsSubject) this.jobsSubject.next(arr);
      return this.jobsSubject || (this.jobsSubject = new BehaviorSubject(arr));
    });
  }

  aboutJob(job: Collection): Observable<any> {
    // count components / children / folders
    // get git save state
    let about = {};

    return Observable.create(subscriber => {
      // should also search history
      let ref = [job.owner.username, job.shortname].join('/');
      let isHeadCommit = this.readRef(ref).then(commitHash => commitHash == job.commit).then(val => {
        about['isHead'] = val;
        subscriber.next(about);
      });
      let componentCount = countRecords(this.db, ComponentElement.storeName, job.id, 'job').then(val => {
        about['components'] = val
        subscriber.next(about);
      });
      let folderCount = countRecords(this.db, FolderElement.storeName, job.id, 'job').then(val => {
        about['folders'] = val;
        subscriber.next(about);
      });
      Promise.all([isHeadCommit, componentCount, folderCount]).then(() => {
        subscriber.complete();
      }).catch(err => {
        subscriber.error(err);
      });
    }).debounceTime(100);
  }

  getAllOfJob(jobid):Promise<any> {
    let db = this.db;
    let storeNames = ['components', 'folders', 'locations'];
    return Promise.all(storeNames.map((store)=>{
      return new Promise((resolve, reject)=> {
        let r = IDBKeyRange.only(jobid);
        let req = db.transaction([store], 'readonly')
          .objectStore(store)
          .index('job')
          .openCursor(r);
        let res = [];
        req.onsuccess = (e:any) => {
          let cursor = e.target.result;
          if(cursor) {
            res.push(cursor.value);
            cursor.continue();
          } else {
            resolve(res);
          }
        }
        req.onerror = (e:any) => reject(e.target.error);
      });
    })).then((arr:any)=>{
      arr[0] = arr[0].map(ComponentElement.fromObject);
      arr[1] = arr[1].map(FolderElement.fromObject);
      arr[2] = arr[2].map(Location.fromObject);
      let ob = {};
      storeNames.forEach((s, i)=>ob[s] = arr[i]);
      return ob;
    });
  }

  /*
  resolveTree(hash:string) {
    return this.loadAs('tree', hash).then(tree=>{
      return this.fn2(tree);
    });
  }

  fn2(tree) {
    let ob = {};
    let proms = [];
    for(let name in tree) {
      let mode = gitModesInv[tree[name].mode];
      proms.push(this.loadAs(mode, tree[name].hash).then(res => {
        if(mode == 'text') {
          ob[name] = JSON.parse(res);
        } else if (mode == 'tree') {
          this.fn2(res).then(res2 => {
            ob[name] = res2;
          });
        }
      }));
    }
    return Promise.all(proms).then(() => {
      return ob;
    });
  }

  compareTrees(newTree, oldTree) {
    let p1 = this.resolveTree(newTree);
    let p2 = this.resolveTree(oldTree);
    return Promise.all([p1, p2]).then(trees => {
      return diff.diff(trees[1], trees[0]);
    });
  }

  findChanges(job:Collection) {
    return this.getAllOfJob(job.id).then(res => {
      return Promise.all([
        this.buildTree(job, res.components, res.folders, res.locations),
        this.loadAs('commit', job.commit)
      ]).then(both => {
        let newTree = both[0];
        let commit = both[1];

        return this.compareTrees(newTree, commit.tree);
      });
    });
  }

  retrieveComponentCommitHistory(inpt: ComponentElement|string): Promise<any[]> {
    let id = inpt instanceof ComponentElement ? inpt.id : inpt
    return this.retrieveComponent(id).then(comp => {
      if(comp == null) throw new Error('that component with id "" does not exist');
      let hash = comp.hash;
      if(hash == null) return [];
      return this.retrieveJobById(comp.job).then(job => {
        let recurse = (commit, arr?) => {
          arr = arr || [];
          return this.loadAs('commit', commit).then(c=>{
            return this.loadAs('tree', c.tree).then(t=>{
              return this.loadAs('tree', t['component'].hash).then(t2=>{
                let name = comp.id + '.json';
                let obj = {
                  commit: c,
                  present: name in t2,
                  same: (name in t2) ? t2[name].hash == comp.hash : false
                };
                if(c.parents && c.parents.length) {
                  return recurse(commit.parents[0], arr.concat(obj));
                } else {
                  return arr.concat(obj);
                }
              });
            });
          });
        }
        return recurse(job.commit)
      });
    });
  }
  */

  retrieveComponent(id: string): Promise<ComponentElement|null> {
    return this.retrieveRecordFrom('components', id).then((res)=>{
      if(res != null) {
        return ComponentElement.fromObject(res);
      }
      return null;
    });
  }

  retrieveFolder(id: string): Promise<FolderElement|null> {
    return this.retrieveRecordFrom('folders', id).then((res)=>{
      if(res != null) {
        return FolderElement.fromObject(res);
      }
      return null;
    });
  }

  retrieveUser(username: string): Promise<User|null> {
    return this.retrieveRecordFrom('users', username).then(res => {
      if(res != null) {
        return User.fromObject(res);
      } else {
        return null;
      }
    });
  }

  retrieveJobById(id: string): Promise<Collection|null> {
    return this.retrieveRecordFrom('jobs', id).then(obj => {
      if(obj == null) throw new Error('job with that id ("'+id+'") does not exist');
      return Collection.fromObject(obj);
    });
  }

  /*
  retrieveJob(username:string, shortname:string): Promise<any> {
    let ref = [username, shortname].join('/');
    return this.readRef(ref).then(commitHash => {
      if(commitHash == null) return null;
      return this.loadAs('commit', commitHash).then(commit => {
        if(commit == null) throw new Error('ref read error!');
        return this.loadAs('tree', commit.tree);
      }).then(tree =>{
        let jobRef = tree['job.json'];
        if(jobRef == null) throw new Error('malformed tree');
        return this.loadAs('text', jobRef.hash);
      }).then(text => {
        let job = Collection.fromObject(JSON.parse(text), commitHash);
        return job;
      });
    }).then(saved => {
      return this.retrieveJobById(saved.id).then(current => {
        return {saved: saved, current: current};
      });
    });
  }
  */

  /*
  retrieveLocation(id: string) {
    return this.retrieveRecordFrom('locations', id);
  }
  */

  removeRecordFrom(storeName: string, id: string, index?:string) {
    return this.removeRecord(this.db, storeName, id, index);
  };

  retrieveRecordFrom(storeName: string, id: string, key?: string) {
    return this.retrieveRecord(this.db, storeName, id, key);
  }

  retrieveRecordFromAs(what:FolderElement|ComponentElement|Child|Collection, storeName: string, id: string, key?: string) {
  }

  retrieveRecord(db: IDBDatabase, storeName: string, id: string, key?: string) {
    return new Promise((resolve, reject)=> {
      let trans = this.db.transaction([storeName]);
      let req:any = trans.objectStore(storeName);
      if(key!=null) req = req.index(key);
      req = req.get(id);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  removeRecord(db: any, storeName: string, id: string, index?:string) {
    return new Promise((resolve, reject) => {
      let trans = db.transaction(storeName, 'readwrite');
      let store = trans.objectStore(storeName);
      let req = store.delete(id);
      req.onsuccess = (e) => {
        resolve(e.target.result);
      }
      req.onerror = (e) => {
        reject(e.target.error);
      }
    });
  } 

  saveRecord(db: any, storeName: string, obj: any): Promise<string> {
    return new Promise((resolve, reject) => {
      let trans = db.transaction(storeName, 'readwrite');
      let store = trans.objectStore(storeName);
      let req = store.put(obj);
      req.onsuccess = (e) => {
        resolve(e.target.result)
      };
      req.onerror = (e) => {
        reject(e.target.error);
      }
    });
  }

  retrieveLocation(id:string|string[]): Promise<Location> {
    if(typeof id === 'string') {
      return retrieveRecordAs(this.db, Location, id);
    } else if (Array.isArray(id)) {
      return retrieveRecordArray(this.db, Location.storeName, id, 'folders').then(result => {
        if(result == null) return null;
        return Location.fromObject(result);
      });
    } else {
      throw new Error('invalid type');
    }
  }

  createLocation(job, loc, children=[]):Promise<Location> {
    let folders = Object.keys(job.folders.roots).map(n => n in loc ? loc[n] : job.folders.roots[n]);
    let _location = new Location(
      '',
      job.id,
      children,
      folders
    );
    return saveRecordAs(this.db, _location).then((locationId)=>{
      _location.id = locationId;
      return _location;
    });
  }

  // TODO: Allow passing of component instead of id
  //                                               { 'phase': 123123 ... }
  createChild(job:Collection, componentId:string|ComponentElement, loc={}, name?:string, description?:string, qty=1): Promise<Child> {
    return (typeof componentId === 'string' ? this.retrieveComponent(componentId) : Promise.resolve(componentId)).then(component => {
      if(component == null) throw new Error('cannot create child if component does not exist');
      name = name || component.name;
      description = description || component.description;

      for(let prop in job.folders.roots) if(!(prop in loc)) loc[prop] = job.folders.roots[prop];
      let q = job.folders.order.map(n=>loc[n]);
      let child = new Child('', name, description, component.id, 1);
      return Promise.all([
        retrieveUniqueId(),
        this.retrieveLocation(q)
      ]).then(([childId, _location]:[string, any])=>{
        child.id = childId;
        if(_location != null) return _location;
        return this.createLocation(job, loc, []);
      }).then(_location => {
        _location.children = _location.children || [];
        _location.children.push(child);
        return saveRecordAs(this.db, _location);
      }).then(()=> {
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
    ]).then(([componentId, par]:[string, any]) => {
      component.id = componentId;
      if(par) {
        par.children = par.children || [];
        par.children.push(componentId);
        return saveRecordAs(this.db, par);
      }
    }).then(() => {
      return component;
    });
  }

  createFolder(job, _type, name, description='(no description)', parentId?): Promise<FolderElement> {
    if(parentId == null && (!job.folders.roots || !(_type in job.folders.roots))) {
      // root case
      if(name !== 'root') throw new Error('root folder name must be \'root\' ('+name+')');
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
      if(!job.folders.roots) throw new Error('root folders have not yet been defined');
      if(!(_type in job.folders.roots)) throw new Error('invalid type for this job');
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
      ]).then(([folderId, par]:[string, any])=>{
        folder.id = folderId;
        par.children = par.children || [];
        par.children.push(folderId);
        return saveRecordAs(this.db, par);
      }).then(parResult => {
        return folder;
      });
    }
  }

  createExampleElements(job, n=3) {
    let arr = [...Array(n).keys()];
    let components, folders, children;

    let createFolders = Promise.all(arr.map(i => {
      let types = Object.keys(job.folders.roots);
      let _type = types[i%types.length]
      let name = ['Example Folder ', i, ' (', _type, ')'].join('');
      return this.createFolder(
        job,
        _type,
        name,
        'description',
      );
    })).then(_folders=>folders=_folders);

    let createComponents = Promise.all(arr.map(i => {
      return this.createComponent(
        job,
        'Example Component ' + (i+1),
        'description'
      );
    })).then(_components => components = _components);

    return this.createLocation(job, job.folders.roots).then(_location => {
      let createChildren = createComponents.then(components => {
        // create example children
        return Promise.all(components.map(component => arr.map(i => this.createChild(
          job,
          component.id,
          undefined, // loc
          undefined, // name
          undefined, // description
          1+Math.floor(Math.random()*4), // qty
        ))).reduce((a,b)=>a.concat(b))).then(_children => children = _children)
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

  createJob(owner: User, shortname: string, name='New Job', description='(no description)', folderNames=['phase', 'building']):BehaviorSubject<Collection> {
    shortname = shortname || name.replace(' ', '_').replace(/[^\w-]/gi, '').substring(0, 50); // by default remove non-alphanumerics and shorten to < 50
    let folderDefinition = { order: folderNames }

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

    if(!shortname) {
      bs.error(new Error('invalid shortname'));
    }
    if(shortname.length < 4) {
      bs.error(new Error('shortname must be at least 4 characters long'));
    }

    saveRecordAs(this.db, job).then(jobId => {
      job.id = jobId;

      job.folders.roots = {};
      return Promise.all(job.folders.order.map(_type => {
        return this.createFolder(job, _type, 'root');

      })).then(rootFolders => {
        return this.createExampleElements(job);

      }).then(() => {
        job.saveState = 'saved:uncommitted';
        bs.next(job);
        this.jobsSubject.next(this.jobsSubject.getValue().concat(bs))
      });
    }).catch(err => {
      bs.error(err);
    });

    return bs;
  }

  /*
  buildTree(job, components, folders, locations) {
    let tree = {};
    folders = folders || [];
    components = components || [];
    let locObj = {};
    job.folders.roots = job.folders.roots || [];

    folders.forEach(folder => {
      let obj = folder.toJSON();
      // like 'phase/ba8dad.json':'{ ... }'
      let path = [folder['type'], folder.id + '.json'].join('/');
      tree[path] = {
        mode: gitModes.file,
        content: JSON.stringify(obj)
      };
    });

    locations.forEach(loc => {
      let obj = loc.toJSON();
      let path = ['location', loc.id + '.json'].join('/');
      tree[path] = {
        mode: gitModes.file,
        content: JSON.stringify(obj)
      };
    });

    components.forEach(comp => {
      let obj = comp.toJSON();
      let path = ['component', comp.id + '.json'].join('/');
      tree[path] = {
        mode: gitModes.file,
        content: JSON.stringify(obj)
      };
    });

    tree['job.json'] = {
      mode: gitModes.file,
      content: JSON.stringify(job.toJSON())
    };

    let jobs = [job];

    return promisify(this.repo.createTree.bind(this.repo), tree).then((both)=>{
      let hash = both[0], tree = both[1];
      return hash;
    });
  }
  
  saveNewJob(job: Collection, children?:Child[], components?:ComponentElement[], folders?:FolderElement[]): Promise<any> {
    let tree = {};
    folders = folders || [];
    children = children || [];
    components = components || [];
    let locObj = {};
    job.folders.roots = job.folders.roots || [];

    // create root folder for each type. add children from 'folders' of similar type
    job.folders.order.forEach(folderType => {
      if(INVALID_FOLDER_TYPES.indexOf(folderType) != -1)
        throw new Error('invalid folder type');
      let folder = new FolderElement(
        random(), // id
        'root',   // name
        'root "'+folderType+'" folder', // description
        folderType, // type
        job.id, // job id
        folders.filter(f=>f['type']==folderType).map(f=>f.id) // child folders
      );
      folders.push(folder);
      job.folders.roots.push(folder.id);
    });

    folders.forEach(folder => {
      let obj = folder.toJSON();
      // like 'phase/ba8dad.json':'{ ... }'
      let path = [folder['type'], folder.id + '.json'].join('/');
      tree[path] = {
        mode: gitModes.file,
        content: JSON.stringify(obj)
      };
    });

    // extract components from children that arent in 'components'
    let componentIds = components.map(c=>c.id);
    children.forEach(child => {
      let folders = child.folders;
      let comp = child.data;
      if(comp == null || !(comp instanceof ComponentElement))
        throw new Error('unexpected child data format (or null)');

      if(componentIds.indexOf(comp.id) == -1) {
        components.push(child.data);
      }

      // use child-specified folder or job-root-specified
      child.folders = child.folders || [];
      let locId = Location.createId(child.folders, job);
      locObj[locId] = locObj[locId] || [];
      locObj[locId].push(child);
    });

    let locations:Location[] = Object.keys(locObj).map(locId => {
      return new Location(
        locId,
        job.id,
        locObj[locId],
        locId.split('-')
      );
    });

    locations.forEach(loc => {
      let obj = loc.toJSON();
      let path = ['location', loc.id + '.json'].join('/');
      tree[path] = {
        mode: gitModes.file,
        content: JSON.stringify(obj)
      };
    });

    components.forEach(comp => {
      let obj = comp.toJSON();
      let path = ['component', comp.id + '.json'].join('/');
      tree[path] = {
        mode: gitModes.file,
        content: JSON.stringify(obj)
      };
    });

    tree['job.json'] = {
      mode: gitModes.file,
      content: JSON.stringify(job.toJSON())
    };

    let jobs = [job];

    return promisify(this.repo.createTree.bind(this.repo), tree).then((both)=>{
      let hash = both[0], tree = both[1];

      let updateHashesPromise = this.loadAs('tree', hash).then(tree => {
        job.hash = tree['job.json'].hash
        let p1 = Promise.all(job.folders.order.map(t=>{
          return this.loadAs('tree', tree[t].hash).then(t2 => {
            folders.filter(f=>f['type']==t).forEach(f=>{
              let obj = t2[f.id + '.json'];
              if(obj == null) throw new Error('folder save error, id "'+f.id+'" type "'+f['type']+'" not found');
              f.hash = obj.hash;
            });
          });
        }));
        let p2 = this.loadAs('tree', tree['component'].hash).then(t2 => {
          components.forEach(c=>{
            let obj = t2[c.id + '.json'];
            if(obj == null) throw new Error('component save error, id "'+c.id+'" not found');
            c.hash = obj.hash;
          });
        });
        let p3 = this.loadAs('tree', tree['location'].hash).then(t2 => {
          locations.forEach(l=>{
            let obj = t2[l.id + '.json'];
            if(obj == null) throw new Error('location save error, id "'+l.id+'" not found');
            l.hash = obj.hash;
          });
        });
        return Promise.all([p1, p2, p3]);
      });

      let saveCommitRefPromise = this.saveToHash('commit', {
        author: {
          name: job.owner.username,
          email: job.owner.email
        },
        tree: hash,
        message: 'first'
      }).then(commit => {
        let ref = [job.owner.username, job.shortname].join('/');
        job.commit = commit;
        return this.updateRef(ref, commit);
      });

      return Promise.all([updateHashesPromise, saveCommitRefPromise]).then(()=>{
        return Promise.all([].concat(jobs, folders, locations, components).map(this.updateRecord.bind(this)));
      }).then(()=>{
        return {
          jobs: jobs,
          folders: folders,
          components: components,
          locations: locations
        };
      });
    });
  };
  */
  updateRecord(obj) {
    let storeName;
    if(obj instanceof Collection) {
      storeName = 'jobs';
    } else if (obj instanceof FolderElement) {
      storeName = 'folders';
    } else if (obj instanceof ComponentElement) {
      storeName = 'components';
    } else if (obj instanceof Location) {
      storeName = 'locations';
    } else {
      throw new Error('unknown obj type');
    }
    return this.saveRecord(this.db, storeName, obj.toJSON(false));
  }

  updateJob(job: Collection): Promise<string> {
    return this.updateRecord(job);
  }

  /*
  saveJob(job: Collection, message: string): Promise<Collection> {
    return this.loadAs('commit', job.commit).then((commit) => {
      let jobText = JSON.stringify(job.toJSON());
      let changes:any = [{
        path: 'job.json',
        mode: gitModes.file,
        content: jobText
      }];
      changes.base = commit.tree;

      return promisify(this.repo.createTree.bind(this.repo), changes).then((res)=>{
        return res[0];
      }).then((treeHash) => {
        // if tree hasn't changed _nothing_ has changed
        if(treeHash == commit.tree) throw new Error('nothing has changed');

        return this.saveToHash('commit', {
          author: {
            name: job.owner.username,
            email: job.owner.email
          },
          tree: treeHash,
          message: message,
          parents: [job.commit]
        });
      }).then((commitHash)=> {
        let ref = [job.owner.username, job.shortname].join('/');

        return this.updateRef(ref, commitHash).then(()=>{
          job.commit = commitHash;
          return this.updateRecord(job);
        }).then((key)=>{
          return job;
        });
      });
    });
  };
  */
  readRefs(db: any): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if(db == null) throw new Error('db undefined, run init');
      if(!db.objectStoreNames.contains('refs')) {
        return reject(new Error('refs uninitialized, run init'));
      }
      let trans = db.transaction(['refs']);
      let store = trans.objectStore('refs');
      let req = store.getAllKeys();
      req.onsuccess = (e) => {
        resolve(e.target.result);
      };
      req.onerror = (e) => {
        reject(e.target.error);
      }
    }).then((arr: string[]) => {
      // filter out different prefixes
      return arr.filter((str) => {
        return str.startsWith(this.repo.refPrefix) && str.split('/')[0] == this.repo.refPrefix;
      }).map((str)=>{
        return str.substring(this.repo.refPrefix.length + 1);
      });
    });
  }

  readRef(ref: string):Promise<any> {
    return promisify(this.repo.readRef.bind(this.repo), ref).then((res)=>{
      return res[0];
    });
  }


}
