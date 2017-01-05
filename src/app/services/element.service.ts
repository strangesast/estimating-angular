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
  INVALID_FOLDER_TYPES,
  USER_COLLECTION,
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


// useful
//indexedDB.webkitGetDatabaseNames().onsuccess = (res) => {console.log([].slice.call(res.target.result).forEach((e)=>{indexedDB.deleteDatabase(e)}))}

@Injectable()
export class ElementService {
  repo: Repo;
  gitdb: IDBDatabase;
  db: IDBDatabase;

  public _users: BehaviorSubject<User[]> = new BehaviorSubject([]);
  public users: Observable<User[]> = this._users.asObservable();

  public jobMap: any;
  public loaded: any = {};

  public _jobs: BehaviorSubject<Collection[]> = new BehaviorSubject([]);
  public jobs: Observable<Collection[]> = this._jobs.asObservable();
  public jobsSubject: BehaviorSubject<BehaviorSubject<Collection>[]>;

  constructor() { }

  // int db
  resolve(): Promise<any>|boolean {
    if(this.db == null || this.gitdb == null) {
      return Promise.all([
        <any>initObjectStore(DB_NAME, DB_VERSION, STORES), // w/ <any> hack
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

  /*
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
      let arr = collections.map(collection => this.loaded[collection.id] || (this.loaded[collection.id] = new BehaviorSubject(collection)));
      if(this.jobsSubject) this.jobsSubject.next(arr);
      return this.jobsSubject || (this.jobsSubject = new BehaviorSubject(arr));
    });
  }

  loadElement(_class, id:string): Promise<BehaviorSubject<any>> {
    if(id in this.loaded) return Promise.resolve(this.loaded[id]);
    return retrieveRecordAs(this.db, _class, id).then(result => {
      if (result == null) throw new Error('element with that id ('+id+') does not exist');
      return this.loaded[id] = new BehaviorSubject(result);
    });
  }

  loadJob(id:string): Promise<BehaviorSubject<Collection>> {
    if(id in this.loaded) return Promise.resolve(this.loaded[id]);
    return this.retrieveJob(id).then(job => {
      if(job == null) throw Error('there is no job with that id');
      return this.loaded[job.id] = new BehaviorSubject(job);
    });
  }

  retrieveJob(id:string): Promise<Collection> {
    return retrieveRecordAs(this.db, Collection, id).then(job => {
      if(job == null) { // check shortname too.  perhaps ugly
        return retrieveRecordAs(this.db, Collection, id, 'shortname');
      }
      return job;
    });
  }

  retrieveComponent(id:string): Promise<ComponentElement> {
    return retrieveRecordAs(this.db, ComponentElement, id);
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
      this.loaded[jobId] = bs;

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

  removeJob(id:string): Promise<any> {
    if(id in this.loaded) {
      return removeRecordAs(this.db, this.loaded[id].getValue()).then(res=> {
        let arr = this.jobsSubject.getValue();
        let i = arr.indexOf(this.loaded[id]); 
        if(i > -1) {
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
