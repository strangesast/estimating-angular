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

// useful
//indexedDB.webkitGetDatabaseNames().onsuccess = (res) => {console.log([].slice.call(res.target.result).forEach((e)=>{indexedDB.deleteDatabase(e)}))}

const stores = [
  { name: 'users',      keypath: 'username', indexes: [{ on: 'name',      name: 'name',      unique: false },
                                                       { on: 'email',     name: 'email',     unique: true  }] },
  { name: 'components', keypath: 'id',       indexes: [{ on: 'children',  name: 'children',  unique: false, multiEntry: true }] },
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

// account of the user editing / saving job / components
class User {
  _id?: string;

  constructor(
    public name: string,
    public username: string,
    public email: string
  ) { }

  static create(obj) {
    let user = new User(obj.name, obj.username, obj.email);
    if(obj._id) {
      user._id = obj._id;
    }
    return user;
  }
}

class TreeElement {
  // reference component or folder
  constructor(public refid: string, public reftype: 'component'|'phase'|'building'|'folder', public level: number, public ctx: any) { }

  static fromElement(obj, ctx, level:number):TreeElement {
    let t;
    if(obj instanceof Component) {
      t = 'component';
    } else if (obj instanceof Folder) {
      t = obj['type'] || 'folder'; // perhaps undesirable
    } else {
      console.error('unrecognized type', obj);
      throw new Error('unrecognized type');
    }
    return new TreeElement(obj.id, t, level, ctx);
  }
}

// root 'element' of phase, building, component, job, etc
class Element {
  _id?: string|null;   // server id.  may be null if unsaved

  constructor(
    public id: string, 
    public name: string, 
    public description: string
  ) { }

  static exclude: string[] = [];
}

// how are other elements referenced
class Child {
  constructor(
    public id: string,
    public qty: number,
    public _id?: string
  ) { }
  toJSON() {
    let copy = Object.assign({}, this);
    return copy;
  }
  static create(obj) {
    return new Child(obj.id, obj.qty, obj._id);
  }
}

// optional but convienent/necessary to dispurse updates
class BasedOn {
  constructor(
    public id: string, 
    public hash: string, 
    public _id: string, 
    public version: string
  ) { }
}

// components are generally exclusive to job unless ref-copied (probably wont happen) 
class Component extends Element {
  constructor(
    id,
    name,
    description,
    public job: string, 
    public children?: Child[], 
    public basedOn?: BasedOn|null
  ) {
    super(id, name, description);
    if(children == null) this.children = [];
  }

  static create(obj) {
    return new Component(obj.id, obj.name, obj.description, obj.job, obj.children || [], obj.basedOn);
  }

  static exclude: string[] = ['commit'];

  toJSON(removeExcluded?:Boolean) {
    if(removeExcluded == null) removeExcluded = true;
    let copy = Object.assign({}, this);
    if(removeExcluded) {
      Component.exclude.forEach((e)=>{
        if(e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }
}

class Location {
  constructor(public id: string, public job: string, public children: Child[], public folders: string[]) { }

  static createId(obj, job) {
    return job.folders.types.map((name, i)=>obj[name] || job.folders.roots[i]).join('-');
  }

  static fromJob(job: Job, folders, children?: Child[]) {
    let id = Location.createId(folders, job);
    let jobId = job.id;
    return new Location(id, jobId, children || [], job.folders.types.map((name, i)=>folders[name] || job.folders.roots[i]));
  }

  static create(obj) {
    return new Location(obj.id, obj.job, obj.children, obj.folders);
  }

  toJSON(removeExcluded?: Boolean) {
    let copy = Object.assign({}, this);
    for(var prop in copy) {
      if(typeof copy[prop].toJSON == 'function') {
        copy[prop] = copy[prop].toJSON();
      } else if (Array.isArray(copy[prop])) {
        copy[prop] = copy[prop].map((el)=>typeof el.toJSON == 'function' ? el.toJSON() : el);
      }
    }
    return copy;
  }
}

class FolderDef {
  constructor(
    public types: string[], // names of kinds of folders (buildings/phases/etc)
    public roots?: string[] // ids of root folders
  ) { }
}

class Folder extends Element {
  constructor(
    id,
    name,
    description,
    public type: string,
    public job: string,
    public children: any[]
  ) {
    super(id, name, description);
  }

  static exclude: string[] = ['commit'];

  toJSON(removeExcluded?:Boolean) {
    if(removeExcluded == null) removeExcluded = true;
    let copy = Object.assign({}, this);
    if(removeExcluded) {
      Folder.exclude.forEach((e)=>{
        if(e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }

  static create(obj) {
    let children = obj.children || [];
    return new Folder(obj.id, obj.name, obj.description, obj.type, obj.job, children);
  }
}

class Job extends Element {
  constructor(
    id,
    name,
    description,
    public owner: User,
    public shortname: string,
    public folders: FolderDef,
    public basedOn?: BasedOn|null,    // potentially ambigious, null vs undefined
    public commit?: string
  ) {
    super(id, name, description);
  }

  static exclude: string[] = ['commit'];

  toJSON(removeExcluded?:Boolean) {
    if(removeExcluded == null) removeExcluded = true;
    let copy = Object.assign({}, this);
    if(removeExcluded) {
      Job.exclude.forEach((e)=>{
        if(e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }

  static create(obj, commit?: string) {
    if(!obj.owner) throw new Error('object owner required');
    let owner = User.create(obj.owner);
    ['id', 'name', 'description', 'owner', 'shortname', 'folders'].forEach((t)=>{
      if(obj[t] == null) throw new Error('key ' + t + ' required');
    });
    return new Job(obj.id, obj.name, obj.description, owner, obj.shortname, obj.folders, obj.basedOn, commit);
  }
}

let TEST_USER: User = new User(
  'Sam Zagrobelny', // name
  'sazagrobelny', // username
  'sazagrobelny@dayautomation.com' // email
);

let TEST_JOB: Job = new Job(
  random(), // id
  'Test Job 123', // name
  '', // description
  TEST_USER, // owner
  'test_job_123', // shortname
  { // folders
    types: ['phase', 'building']
  }
);

@Injectable()
export class ElementService {
  activeUser: string | null = null;

  objectStoreName : string = 'estimating';
  objectStoreVersion : number = 1;

  gitStoreName: string = 'estimating-git';
  gitStoreVersion: number = 1;
  gitStoreRefPrefix: string = 'testing';

  repo: any;
  gitdb: any;
  db: any;

  public users: BehaviorSubject<User[]> = new BehaviorSubject([]);
  public jobs: BehaviorSubject<Job[]> = new BehaviorSubject([]);

  init(): Promise<any> {
    return Promise.all([this.initObjectStore(), this.createGitRepo()]).then(() => {

      return Promise.resolve().then(()=> {
        // user creation
        return this.getUsers().then((users) => {
          let usernames = users.map((u)=>u.username);
          if(usernames.indexOf(TEST_USER.username) == -1) {
            return this.saveUser(TEST_USER);
          }
        });
      }).then(() => {
        // job creation
        return this.getJobs().then((jobs)=>{
          let i = jobs.map((j)=>j.shortname).indexOf(TEST_JOB.shortname);
          if(i == -1) {
            return this.saveNewJob(TEST_JOB).then((obj)=>{
              return obj.job;
            });
          } else {
            return jobs[i];
          }
        }).then((job)=>{

          // try changing description
          job.description = 'new description';

          let message = 'updated description';
          return this.saveJob(job, message).catch((err)=>{
            console.error(err);
          }).then(()=>{
            return job;
          });
        });
      }).then((job)=>{
        let component = new Component(
          random(), // id
          'first component', // name
          '', // description
          job.id // job id
        );
        let folder = new Folder(
          random(),
          'New Phase*',
          'folder',
          'phase',
          job.id,
          []
        );
        this.addFolder(folder, null, job).then((result)=>{
          console.log('added folder', result);
        });
        this.addComponent(component, job, {}).then((results)=>{
          console.log('added component', results);
          this.buildTree(job).then((res)=>{
            Promise.all(res.map((el)=>{
              return (el.reftype == 'component' ? this.retrieveComponent(el.refid) : this.retrieveFolder(el.refid)).then((doc)=>{
                return Object.assign({}, el, doc);
              });
            })).then((arr)=>{
              for(let i=0; i<arr.length; i++) {
                let r = arr[i];
                console.log(r.level + Array(+r.level+1).join('--') + '(' + r.reftype + ') ' + r.refid + ' ' + r.name);
              }
            });
          });
        });

      });
    });
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
    if(folders.length && level < maxLevel) {
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
      req.onsuccess = (e) => {
        let cursor = e.target.result;
        if(cursor) {
          vals.push(cursor.value);
          return cursor.continue();
        }
        resolve(vals)
      };
      req.onerror = (e) => {
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
    if(db == null) throw new Error('db undefined, run init');
    return this.getAll(db, 'users');
  }

  getAll(db: any, storeName: string): Promise<any[]> {
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

  allLocations(jobId:string) {
    return new Promise((resolve, reject) => {
      let storeName = 'locations';
      let trans = this.db.transaction([storeName], 'readonly');
      let store = trans.objectStore(storeName);

      let q = IDBKeyRange.only(jobId);
      let index = store.index('job');
      let req = index.openCursor(q);
      let results = [];
      req.onsuccess = (e) => {
        let cursor = e.target.result;
        if(cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results)
        }
      };
      req.onerror = (e) => {
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

  retrieveComponent(id: string): Promise<Component|null> {
    return this.retrieveRecordFrom('components', id).then((res)=>{
      if(res != null) {
        return Component.create(res);
      }
      return null;
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

  saveOrRetrieve(db: any, storeName: string, obj: any, key): Promise<string> {
    if(key == null) key = 'id';
    let id = obj[key];
    return this.retrieveRecord(db, storeName, id).then((res)=>{
      if(res == null) {
        return this.saveRecord(db, storeName, obj);
      }
      return res[key];
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
    let name = this.objectStoreName;
    let version = this.objectStoreVersion;
    return new Promise((resolve, reject) => {
      let request = indexedDB.open(name, version);


      request.onupgradeneeded = (e:any) => {
        let db = e.target.result;
        let createStore = (name, keypath, indexes) => {
          return new Promise((resolve, reject) => {
            let store = db.createObjectStore(name, { keyPath: keypath });
            store.transaction.oncomplete = resolve;
            indexes.forEach((index)=> {
              store.createIndex(index.name, index.on, { unique: index.unique, multiEntry: !!index.multiEntry });
            });
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
      gitIndexedDb.init(this.gitStoreName, this.gitStoreVersion, (err, db) => {
        if(err) return reject(err);
        let repo = {};
        gitIndexedDb(repo, this.gitStoreRefPrefix);
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
        return str.startsWith(this.gitStoreRefPrefix) && str.split('/')[0] == this.gitStoreRefPrefix;
      }).map((str)=>{
        return str.substring(this.gitStoreRefPrefix.length + 1);
      });
    });
  }

  readRef(ref: string):Promise<any> {
    return promisify(this.repo.readRef.bind(this.repo), ref).then((res)=>{
      return res[0];
    });
  }

  getJobTree(job: Job): Promise<any> {
    return Promise.resolve();
  }

  saveNewJob(job: Job): Promise<any> {
    let tree = {};
    let folders = [];
    let folderTypes = job.folders.types;

    for(let i=0,folderType; folderType=folderTypes[i],i<folderTypes.length; i++) {
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
        return Promise.all([this.updateRecord(job), folders.map((folder)=>this.updateRecord(folder))]).then((ids)=>{

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

  constructor() {
    this.init();
  }

}
