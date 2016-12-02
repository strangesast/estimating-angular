import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import * as Rx from 'rxjs/Rx';

import * as gitModes        from 'js-git/lib/modes';
import * as gitIndexedDb    from 'js-git/mixins/indexed-db';
import * as gitMemDb        from 'js-git/mixins/mem-db';
import * as gitCreateTree   from 'js-git/mixins/create-tree';
import * as gitPackOps      from 'js-git/mixins/pack-ops';
import * as gitWalkers      from 'js-git/mixins/walkers';
import * as gitReadCombiner from 'js-git/mixins/read-combiner';
import * as gitFormats      from 'js-git/mixins/formats';

import * as DeepDiff from 'deep-diff';

import { Router, Resolve, ActivatedRouteSnapshot } from '@angular/router';

import {
  User,
  Element,
  Child,
  BasedOn,
  ComponentElement,
  Location,
  FolderDef,
  Folder,
  Job
} from './classes';

// useful
//indexedDB.webkitGetDatabaseNames().onsuccess = (res) => {console.log([].slice.call(res.target.result).forEach((e)=>{indexedDB.deleteDatabase(e)}))}

const USER_COLLECTION = 'users';
const INVALID_FOLDER_TYPES = ['component', 'location'];

const stores = [
  { name: 'users',      keypath: 'username', indexes: [{ on: 'name',      name: 'name',      unique: false },
                                                       { on: 'email',     name: 'email',     unique: true  }] },
  { name: 'components', keypath: 'id',       indexes: [{ on: 'children',  name: 'children',  unique: false, multiEntry: true },
                                                       { on: 'job',       name: 'job',       unique: false }] },
  { name: 'folders',    keypath: 'id',       indexes: [{ on: 'type',      name: 'type',      unique: false },
                                                       { on: 'job',       name: 'job',       unique: false }] },
  { name: 'locations',  keypath: 'id',       indexes: [{ on: 'children',  name: 'children',  unique: false, multiEntry: true },
                                                       { on: 'folders',   name: 'folders',   unique: true,  multiEntry: true },
                                                       { on: 'job',       name: 'job',       unique: false }] },
  { name: 'jobs',       keypath: 'id',       indexes: [{ on: 'shortname', name: 'shortname', unique: true  }] }
];

function streamify(stream): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let fn = (arr) => {
      stream.read((err, result) => {
        if(err) return reject(err); // error out
        if(result == null) return resolve(arr); // done
        fn(arr.concat(result));
      });
    };
    fn([]);
  });
};

function promisify(...args: any[]): Promise<any[]> {
  let fn = args[0];
  return new Promise((resolve, reject) => {
    let cb = function(err) {
      if(err) return reject(err);
      resolve([].slice.call(arguments, 1))
    };
    fn.apply(null, args.slice(1).concat(cb));
  });
}

function random():string {
  return (Math.random().toString(36)+'00000000000000000').slice(2, 10+2);
}

const STORE_NAME = 'estimating';
const STORE_VERSION = 1;
const GIT_STORE_NAME = 'estimating-git';
const GIT_STORE_VERSION = 1;
const GIT_STORE_REF_PREFIX = 'testing'; // replaced with ?

@Injectable()
export class ElementService {
  repo: any;
  gitdb: IDBDatabase;
  db: IDBDatabase;

  public _users: BehaviorSubject<User[]> = new BehaviorSubject([]);
  public users: Observable<User[]> = this._users.asObservable();

  public _jobs: BehaviorSubject<Job[]> = new BehaviorSubject([]);
  public jobs: Observable<Job[]> = this._jobs.asObservable();

  constructor() { }

  resolve(): Promise<any>|boolean {
    if(this.db == null || this.gitdb == null) {
      return Promise.all([
        this.initObjectStore(),
        this.createGitRepo()
      ]).then(both => {
        return {
          store: both[0],
          repo: both[1]
        };
      });
    } else {
      return Promise.resolve();
    }
  }

  findLocation(locArr) {
    return Promise.resolve();
  }

  findLocationWithFolder(folderId) {
    return new Promise((resolve, reject) => {
      let storeName = 'locations';
      let trans = this.db.transaction([storeName], 'readonly');
      let store = trans.objectStore(storeName);
      let index = store.index('folders');
      let range = IDBKeyRange.only(folderId);

      let req = index.openCursor(range);
      let vals = [];
      req.onsuccess = (e:any) => {
        let cursor = e.target.result;
        if(cursor) {
          vals.push(cursor.value);
          return cursor.continue();
        }
        resolve(vals)
      };
      req.onerror = (e:any) => {
        reject(e.target.error);
      }
    });
  }

  getAllChildren(folder: Folder, maxLevel?):Promise<Folder> {
    maxLevel = maxLevel == null ? 2 : maxLevel;
    folder.children = folder.children || [];
    if(maxLevel < 1 || folder.children.length == 0) return Promise.resolve(folder);
    let promises = folder.children.map((childId)=>{
      return this.retrieveFolder(childId).then((child)=>{
        return this.getAllChildren(child, maxLevel - 1);
      });
    });
    return Promise.all(promises).then((children)=>{
      folder.children = children;
      return folder;
    });
  }

  addFolder(folder: Folder, parId, job: Job) {
    let types = job.folders.types;
    if(types.indexOf(folder.type) == -1) throw new Error('job does not have this type of folder');
    return this.retrieveFolder(parId || job.folders.roots[job.folders.types.indexOf(folder.type)]).then((par)=>{
      if(par.job != folder.job) throw new Error('cannot add folder to folder of another job ('+par.job+' and '+folder.job+')');
      if(par instanceof Folder) {
        // should not already be child
        par.children = par.children || [];
        if(par.children.indexOf(folder.id) != -1) throw new Error('already child of this folder');
        par.children.push(folder.id);
        return Promise.all([
          this.saveRecord(this.db, 'folders', folder.toJSON()),
          this.saveRecord(this.db, 'folders', par.toJSON())
        ]);

      } else {
        throw new Error('invalid root folder');
      }
    });
  }


  // returns [componentRecordId, locationRecordId]
  addComponent(component: ComponentElement, job: Job, folders) {
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
      let loc = Location.create(locRecord);
      let childIds = loc.children.map((c)=>c.id);
      let i = childIds.indexOf(component.id);
      if(i != -1) {
        loc.children[i].qty = loc.children[i].qty + 1;
      } else {
        let child = new Child(component.id, 1);
        loc.children.push(child);
      }
      return Promise.all([
        this.saveRecord(this.db, 'components', component.toJSON()),
        this.saveRecord(this.db, 'locations', loc.toJSON())
      ]);
    });
  }

  treeToObject(tree) {
    let promises = [];
    Object.keys(tree).forEach((key)=>{
      if(tree[key].hash != null) {
        let hash = tree[key].hash;
        let mode = tree[key].mode;
        if(mode == gitModes.file) {
          let prom = this.loadAs('text', hash).then((text) => {
            return [key, JSON.parse(text)];
          });
          promises.push(prom);

        } else if (mode == gitModes.tree) {
          let prom = this.loadAs('tree', hash).then((tree)=> {
            return this.treeToObject(tree).then((obj)=>{
              return [key, obj];
            });
          });
          promises.push(prom);
        }
      }
    });
    let obj = {};
    return Promise.all(promises).then((pairs)=>{
      pairs.forEach((pair)=>{
        obj[pair[0]] = pair[1];
      });
      return obj;
    });
  }

  compareTrees(trees: string[]): Promise<any[]> {
    return Promise.all(trees.map((t)=>{
      return this.loadAs('tree', t).then((tree) => this.treeToObject(tree));
    })).then((arr)=>{
      return DeepDiff.diff.apply(null, arr);
    });
  }

  getJob(username: string, shortname: string): Promise<Job> {
    return this.retrieveJob(username, shortname).then(job => {
      if(job == null) throw new Error('job with that username/shortname does not exist ("'+[username, shortname].join('/')+'")');
      return job;
    });
  }

  getJobs(): Promise<Job[]> {
    return this.readRefs(this.gitdb).then((refs) => {
      // read all refs -> many may point to same job
      return Promise.all(refs.map((ref)=>this.readRef(ref)));

    }).then((jobs) => {
      return Promise.all(jobs.map((commitHash)=>{
        return this.loadAs('commit', commitHash).then((commit) => {
          return this.loadAs('tree', commit.tree);
        }).then((tree)=>{
          return this.loadAs('text', tree['job.json'].hash).then((text)=>{
            let job = Job.create(JSON.parse(text), commitHash);
            return job;
          });
        });
      }));
    });
  };

  getUsers(): Promise<User[]> {
    let db = this.db;
    return this.getAll(db, USER_COLLECTION).then(savedUsers => {
      let savedUsernames = savedUsers.map(user => user.username);
      return this.getJobs().then(jobs => {
        let owners = jobs.map(job => job.owner);
        return Promise.all(owners.map(owner => {
          let i = savedUsernames.indexOf(owner.username);
          return i == -1 ? this.saveRecord(this.db, USER_COLLECTION, owner).then(this.retrieveUser) : Promise.resolve(User.create(savedUsers[i]));
        }));
      });
    });
  }

  getAll(db: any, storeName: string): Promise<any[]> {
    if(db == null) throw new Error('db undefined, run init');
    return new Promise((resolve, reject) => {
      let trans = db.transaction([storeName]);
      let store = trans.objectStore(storeName);
      let req = store.getAll();
      req.onsuccess = (e) => {
        resolve(e.target.result);
      };
      req.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  getAllOfJob(jobid):Promise<any> {
    let db = this.db;
    let stores = ['components', 'folders', 'locations'];
    return Promise.all(stores.map((store)=>{
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
      arr[0] = arr[0].map(ComponentElement.create);
      arr[1] = arr[1].map(Folder.create);
      arr[2] = arr[2].map(Location.create);
      let ob = {};
      stores.forEach((s, i)=>ob[s] = arr[i]);
      return ob;
    });
  }

  allLocations(jobId:string) {
    return new Promise((resolve, reject) => {
      let storeName = 'locations';
      let trans = this.db.transaction([storeName], 'readonly');
      let store = trans.objectStore(storeName);

      let q = IDBKeyRange.only(jobId);
      let index = store.index('job');
      let req = index.openCursor(q);
      let results = [];
      req.onsuccess = (e:any) => {
        let cursor = e.target.result;
        if(cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results)
        }
      };
      req.onerror = (e:any) => {
        reject(e.target.error);
      }
    });
  }

  retrieveFolder(id: string): Promise<Folder|null> {
    return this.retrieveRecordFrom('folders', id).then((res)=>{
      if(res != null) {
        return Folder.create(res);
      }
      return null;
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

  retrieveComponent(id: string): Promise<ComponentElement|null> {
    return this.retrieveRecordFrom('components', id).then((res)=>{
      if(res != null) {
        return ComponentElement.create(res);
      }
      return null;
    });
  }

  retrieveUser(username: string): Promise<User|null> {
    return this.retrieveRecordFrom('users', username).then(res => {
      if(res != null) {
        return User.create(res);
      } else {
        return null;
      }
    });
  }

  retrieveJobById(id: string): Promise<Job|null> {
    return this.retrieveRecordFrom('jobs', id).then(obj => {
      if(obj == null) throw new Error('job with that id ("'+id+'") does not exist');
      return Job.create(obj);
    });
  }

  retrieveJob(username:string, shortname:string): Promise<Job|null> {
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
        let job = Job.create(JSON.parse(text), commitHash);
        return job;
      });
    });
  }

  retrieveLocation(id: string) {
    return this.retrieveRecordFrom('locations', id);
  }

  retrieveRecordFrom(storeName: string, id: string) {
    return this.retrieveRecord(this.db, storeName, id);
  }

  retrieveRecord(db: any, storeName: string, id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let trans = db.transaction(storeName);
      let store = trans.objectStore(storeName);
      let req = store.get(id);
      req.onsuccess = (e) => {
        resolve(e.target.result)
      };
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

  // returns keypath of created user
  saveUser(user: User): Promise<string> {
    return this.saveRecord(this.db, 'users', user);
  }

  initObjectStore(): Promise<any> {
    let name = STORE_NAME;
    let version = STORE_VERSION;
    return new Promise((resolve, reject) => {
      let request = indexedDB.open(name, version);

      request.onupgradeneeded = (e:any) => {
        let db = e.target.result;
        let createStore = (name, keypath, indexes) => {
          return new Promise((resolve, reject) => {
            let store = db.createObjectStore(name, { keyPath: keypath });
            indexes.forEach((index)=> {
              store.createIndex(index.name, index.on, { unique: index.unique, multiEntry: !!index.multiEntry });
            });
            resolve(store);
          });
        }

        Promise.all(stores.map((store)=> {
          if(db.objectStoreNames.contains(store.name)) {
            db.deleteObjectStore(store.name);
          }
          return createStore(store.name, store.keypath, store.indexes);

        })).then(()=>{
          this.db = db;
          resolve(db);
        });
      };

      request.onsuccess = (e:any) => {
        let db = e.target.result;
        this.db = db;
        resolve(db);
      };
    });
  }

  createGitRepo(): Promise<any> {
    return new Promise((resolve, reject) => {
      gitIndexedDb.init(GIT_STORE_NAME, GIT_STORE_VERSION, (err, db) => {
        if(err) return reject(err);
        let repo = {};
        gitIndexedDb(repo, GIT_STORE_REF_PREFIX);
        gitCreateTree(repo);
        gitFormats(repo);
        gitPackOps(repo);
        gitReadCombiner(repo);
        gitWalkers(repo);

        this.repo = repo
        this.gitdb = db;
        resolve(this.repo);
      });
    });
  }

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
        return str.startsWith(GIT_STORE_REF_PREFIX) && str.split('/')[0] == GIT_STORE_REF_PREFIX;
      }).map((str)=>{
        return str.substring(GIT_STORE_REF_PREFIX.length + 1);
      });
    });
  }

  readRef(ref: string):Promise<any> {
    return promisify(this.repo.readRef.bind(this.repo), ref).then((res)=>{
      return res[0];
    });
  }

  createComponent(name, description, job): Promise<ComponentElement> {
    let id = random(); // should be unique
    let component = new ComponentElement(id, name, description, job.id, []);
    return this.addComponent(component, job, {}).then(result => {
      return component;
    });
  }

  createJob(owner: User, shortname: string, name?: string, description?: string):Promise<Job> {
    // should verify that job id is unique
    if(name == null) name = 'New Job';
    if(description == null) description = '(no description)';
    let folders = new FolderDef(['phase', 'building']);

    let job = new Job(
      random(),
      name,
      description,
      owner,
      shortname,
      folders
    );

    let component = new ComponentElement(
      random(),
      'blank component',
      'description',
      job.id,
      []
    )

    let child = new Child(
      component.id, // comp id
      1, // qty
      null, // _id
      component // data
    );

    return this.saveNewJob(job, [child], [component], []).then((res)=>{
      return res.jobs[0];
    });
  }

  saveNewJob(job: Job, children?:Child[], components?:ComponentElement[], folders?:Folder[]): Promise<any> {
    let tree = {};
    folders = folders || [];
    children = children || [];
    components = components || [];
    let locObj = {};
    job.folders.roots = job.folders.roots || [];

    // create root folder for each type. add children from 'folders' of similar type
    job.folders.types.forEach(folderType => {
      if(INVALID_FOLDER_TYPES.indexOf(folderType) != -1)
        throw new Error('invalid folder type');
      let folder = new Folder(
        random(), // id
        'root',   // name
        'root "'+folderType+'" folder', // description
        folderType, // type
        job.id, // job id
        folders.filter(f=>f['type']==folderType) // child folders
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
        let p1 = Promise.all(job.folders.types.map(t=>{
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

  updateRecord(obj) {
    let storeName;
    if(obj instanceof Job) {
      storeName = 'jobs';
    } else if (obj instanceof Folder) {
      storeName = 'folders';
    } else if (obj instanceof ComponentElement) {
      storeName = 'components';
    } else if (obj instanceof Location) {
      storeName = 'locations';
    } else {
      throw new Error('unknown obj type');
    }
    return this.saveRecord(this.db, storeName, obj.toJSON(false)).then((key)=>{
      return key;
    });
  }

  saveJob(job: Job, message: string): Promise<Job> {
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

  logWalk(hash: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.repo.logWalk(hash, (err, stream) => {
        if(err) return reject(err);
        resolve(stream);
      });
    });
  }

  logWalkGen(startHash:string) {
    let g = function*(hash) {
      while(true) {
        yield this.loadAs('commit', hash)
      }
    }
    return g(startHash);
  }

  treeWalk(hash: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.repo.treeWalk(hash, (err, stream) => {
        if(err) return reject(err);
        resolve(stream);
      });
    });
  }

  loadAs(kind: 'blob'|'tree'|'commit'|'text', hash: string):Promise<any>{
    return promisify(this.repo.loadAs.bind(this.repo), kind, hash).then((res) => {
      return res[0]; //=body, res[1]=hash
    });
  }

  saveToHash(kind: 'blob'|'tree'|'commit', body: any):Promise<string> {
    return promisify(this.repo.saveAs.bind(this.repo), kind, body).then((res) => {
      return res[0];
    });
  }

  updateRef(ref: string, hash: string): Promise<void> {
    // repo.updateRef doesn't return anything
    return promisify(this.repo.updateRef.bind(this.repo), ref, hash).then((res)=>{
      return null;
    });
  }

}
