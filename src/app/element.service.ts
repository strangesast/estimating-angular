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
  TreeElement,
  Element,
  Child,
  BasedOn,
  Component,
  Location,
  FolderDef,
  Folder,
  Job
} from './classes';

// useful
//indexedDB.webkitGetDatabaseNames().onsuccess = (res) => {console.log([].slice.call(res.target.result).forEach((e)=>{indexedDB.deleteDatabase(e)}))}

const USER_COLLECTION = 'users';

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
      ]);
    } else {
      return Promise.resolve();
    }
  }

  buildTree(job, roots?) {
    roots = roots || job.folders.roots; // order important
    return Promise.all([
      Promise.all(roots.map((id)=>this.retrieveFolder(id))),
      this.allLocations(job.id) // should add filter for the above roots
    ]).then((res:any)=>{
      let folders:Folder[] = res[0];
      let locations = res[1];
      console.log('locations', locations);

      return Promise.all(folders.map((folder)=>{
        return this.getAllChildren(folder);
      })).then((rootFolders)=>{
        // may want to duplicate locations
        return this.mergeTrees(job, rootFolders, locations, 0, 3);
      });
    });
  }

  mergeTrees(job, folders, locations, level:number, maxLevel:number, ctx?): Promise<TreeElement[]> {
    if(level > maxLevel) return Promise.resolve([]);
    if(folders.length) {
      let arr = []
      if(ctx == null) {
        ctx = {};
        folders.forEach((folder)=>{
          ctx[folder['type']] = folder.id;
        });
      }
      ctx = Object.assign({}, ctx);
      let folder = folders[0];
      let rest = folders.slice(1);

      let el = TreeElement.fromElement(folder, ctx, level);
      arr.push(el);

      ctx[folder['type']] = folder.id;

      let nextLevel = this.mergeTrees(job, rest, locations, level+1, maxLevel, ctx);

      let sameKindNextLevel = Promise.all(folder.children.map((child)=>{
        return this.mergeTrees(job, [child].concat(rest), locations, level+1, maxLevel, ctx);

      })).then((arrs: any[])=>{
        return arrs.reduce((a,b)=>a.concat(b), []);
      });

      return Promise.all([nextLevel, sameKindNextLevel]).then((res)=>{
        return arr.concat(res.reduce((a, b)=>a.concat(b),[]));
      });

    } else {
      // assumes order of filters
      let locs = locations.filter((loc)=>{
        return Object.keys(ctx).every((prop) => {
          return loc.folders[job.folders.types.indexOf(prop)] == ctx[prop];
        });
      });
      return Promise.all(locs.map((loc)=>{
        return Promise.all(loc.children.map((child)=>{
          return this.retrieveComponent(child.id).then((component)=>{
            return TreeElement.fromElement(component, ctx, level);
          });
        }));
      })).then((results:any[])=>{
        if(results.length == 0) return [];
        return results.reduce((a,b)=>a.concat(b));
      });
    }
  }

  findLocation(locArr) {
    console.log('arr', locArr);
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
  addComponent(component: Component, job: Job, folders) {
    folders = folders || {};
    let locId = Location.createId(folders, job);
    return this.retrieveRecord(this.db, 'locations', locId).then((obj) => {
      // get record, create if not exists
      let prom;
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
      arr[0] = arr[0].map(Component.create);
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
    console.log('here 1');
    return this.retrieveRecordFrom('folders', id).then((res)=>{
      if(res != null) {
        return Folder.create(res);
      }
      return null;
    });
  }

  retrieveComponent(id: string): Promise<Component|null> {
    console.log('here 2');
    return this.retrieveRecordFrom('components', id).then((res)=>{
      if(res != null) {
        return Component.create(res);
      }
      return null;
    });
  }

  retrieveUser(username: string): Promise<User|null> {
    console.log('here 3');
    return this.retrieveRecordFrom('users', username).then(res => {
      if(res != null) {
        return User.create(res);
      } else {
        return null;
      }
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
    console.log('here 5');
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

  createJob(owner: User, shortname: string, name?: string, description?: string):Promise<Job> {
    // should verify that job id is unique
    let id = random();
    if(name == null) name = 'New Job';
    if(description == null) description = '(no description)';
    let folders = new FolderDef(['phase', 'building']);

    let job = new Job(id, name, description, owner, shortname, folders);

    return this.saveNewJob(job).then((res)=>{
      let id = random();
      let component = new Component(
        id,
        'blank component',
        'description',
        res.job.id,
        []
      )
      return this.addComponent(component, res.job, {}).then((res2)=>{
        console.log(res2);
        return res.job;
      });
    });
  }

  saveNewJob(job: Job): Promise<any> {
    let tree = {};
    let folders = [];
    let folderTypes = job.folders.types;

    for(let i=0,folderType; folderType=folderTypes[i],i<folderTypes.length; i++) {
      // should check that id is unique
      let folder: Folder = new Folder(
        random(), // id
        'root', // name
        '', // description
        folderType, // type
        job.id, // job
        [] // children
      );
      folders.push(folder);
      let folderText = JSON.stringify(folder.toJSON());
      let folderPath = [folderType, folder.id + '.json'].join('/');
      tree[folderPath] = {
        mode: gitModes.file,
        content: folderText
      };
    }

    if(folders.length != folderTypes.length) throw new Error('wtf');

    job.folders.roots = folders.map((f)=>f.id);
    let jobText = JSON.stringify(job.toJSON());
    tree['job.json'] = {
      mode: gitModes.file,
      content: jobText
    };

    return promisify(this.repo.createTree.bind(this.repo), tree).then((both)=>{
      let hash = both[0], tree = both[1];

      return this.saveToHash('commit', {
        author: {
          name: job.owner.username,
          email: job.owner.email
        },
        tree: hash,
        message: 'first'
      });
    }).then((commit)=>{
      let ref = [job.owner.username, job.shortname].join('/');

      return this.updateRef(ref, commit).then(()=>{
        job.commit = commit;
        return Promise.all([this.updateRecord(job), Promise.all(folders.map((folder)=>this.updateRecord(folder)))]).then((ids)=>{
          let newids = ids.slice(0, 1).concat(ids[1]);
          return {job: job, folders: folders};
        });
      });
    });
  };

  updateRecord(obj) {
    let storeName;
    if(obj instanceof Job) {
      storeName = 'jobs';
    } else if (obj instanceof Folder) {
      storeName = 'folders';
    } else if (obj instanceof Component) {
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
