import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

import { Repo, createGitRepo, gitModes, gitIndexedDb, gitMemDb, gitCreateTree, gitPackOps, gitWalkers, gitReadCombiner, gitFormats, gitModesInv } from './git';

import { initObjectStore, streamify, promisify, random } from './util';

import { diff } from 'deep-diff';

import {
  ActivatedRouteSnapshot,
  Resolve,
  Router
} from '@angular/router';

import {
  ComponentElement,
  FolderDef,
  Location,
  BasedOn,
  Folder,
  Child,
  User,
  Job
} from './classes';

import {
  COMPONENT_STORE_NAME,
  INVALID_FOLDER_TYPES,
  LOCATION_STORE_NAME,
  FOLDER_STORE_NAME,
  USER_COLLECTION,
  JOB_STORE_NAME,
  STORE_VERSION,
  STORE_NAME,
  STORES
} from './indexedDB';


// useful
//indexedDB.webkitGetDatabaseNames().onsuccess = (res) => {console.log([].slice.call(res.target.result).forEach((e)=>{indexedDB.deleteDatabase(e)}))}

const classToStoreName = {
  Job:       JOB_STORE_NAME,
  Folder:    FOLDER_STORE_NAME,
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

  public _jobs: BehaviorSubject<Job[]> = new BehaviorSubject([]);
  public jobs: Observable<Job[]> = this._jobs.asObservable();

  constructor() { }

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

  removeJob(job: Job): Promise<any> {
    return this.removeRecordFrom('jobs', job.id).then(res=> {
      return res;
    });
  }

  load(_class, id:string, key?:string) {
    if(typeof _class.create !== "function") throw new Error('need create method on class'); 
    let storeName = classToStoreName[_class];
    this.retrieveRecordFrom(storeName, id, key).then(record=>{
      let inst = _class.create(record);
      let bs = new BehaviorSubject(inst);
      bs.subscribe(val=>{
        console.log('val');
      });
    });
  }

  // should return observable
  loadJob(id: string): Promise<Job> {
    let args = [JOB_STORE_NAME, id], key = 'id';
    return this.retrieveRecordFrom.apply(this, args).then(record=>{ // try default key
      if(record != null) return record;
      key = 'shortname';
      return this.retrieveRecordFrom.apply(this, args.concat(key)); // try 'shortname'
    }).then(record => {
      if(record == null) throw new Error('job with that id "'+id+'" ( key "'+key+'") does not exist');
      return Job.create(record);
    });
  }

  // should return observable
  loadFolder(id: string): Promise<Folder> {
    return this.retrieveRecordFrom(FOLDER_STORE_NAME, id).then(record => {
      if(record == null) throw new Error('folder with that id "'+id+'" does not exist');
      return Folder.create(record);
    });
  }

  loadLocation(id: string): Promise<Location> {
    return this.retrieveRecordFrom(LOCATION_STORE_NAME, id).then(record => {
      if(record == null) throw new Error('location with that id"'+id+'" does not exist');
      return Location.create(record);
    });
  }

  loadComponent(id: string): Promise<ComponentElement> {
    return this.retrieveRecordFrom(COMPONENT_STORE_NAME, id).then(record => {
      if(record == null) throw new Error('component with that id"'+id+'" does not exist');
      return ComponentElement.create(record);
    });
  }

  loadComponentInChild(child: Child): Promise<Child> {
    return this.loadComponent(child.ref).then(comp=>{
      child.data = comp;
      return child;
    });
  }

  getJob(username: string, shortname: string): Promise<any> {
    return this.retrieveJob(username, shortname).then(({saved, current}:{saved: Job, current: Job}) => {
      if(saved == null) throw new Error('job with that username/shortname does not exist ("'+[username, shortname].join('/')+'")');
      return {saved: saved, current: current};
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
          if(tree['job.json'] == null) throw new Error('malformed job tree');
          return this.loadAs('text', tree['job.json'].hash).then((text)=>{
            let data = JSON.parse(text);
            data.commit = commitHash;
            // load the most recent (perhaps unsaved) version of the job
            return this.retrieveJobById(data.id).then(job => {
              if(job != null) return job;
              return Job.create(data); 
            });
          });
        });
      }));
    });
  };

  // should not auto-create user if in job but not in users col.
  getUsers(): Promise<User[]> {
    let db = this.db;
    return this.getAll(db, USER_COLLECTION).then(savedUsers => {
      return savedUsers.map(User.create);
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
      arr[0] = arr[0].map(ComponentElement.create);
      arr[1] = arr[1].map(Folder.create);
      arr[2] = arr[2].map(Location.create);
      let ob = {};
      storeNames.forEach((s, i)=>ob[s] = arr[i]);
      return ob;
    });
  }

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

  findChanges(job:Job) {
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

  retrieveComponent(id: string): Promise<ComponentElement|null> {
    return this.retrieveRecordFrom('components', id).then((res)=>{
      if(res != null) {
        return ComponentElement.create(res);
      }
      return null;
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
        let job = Job.create(JSON.parse(text), commitHash);
        return job;
      });
    }).then(saved => {
      return this.retrieveJobById(saved.id).then(current => {
        return {saved: saved, current: current};
      });
    });
  }

  retrieveLocation(id: string) {
    return this.retrieveRecordFrom('locations', id);
  }

  removeRecordFrom(storeName: string, id: string, index?:string) {
    return this.removeRecord(this.db, storeName, id, index);
  };

  retrieveRecordFrom(storeName: string, id: string, key?: string) {
    return this.retrieveRecord(this.db, storeName, id, key);
  }

  retrieveRecordFromAs(what:Folder|ComponentElement|Child|Job, storeName: string, id: string, key?: string) {
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

  createComponent(name, description, job): Promise<ComponentElement> {
    let id = random(); // should be unique
    let component = new ComponentElement(id, name, description, job.id, []);
    return this.addComponent(component, job, {}).then(result => {
      return component;
    });
  }

  createJob(owner: User, shortname: string, name?: string, description?: string):Observable<Job> {
    // should verify that job id is unique
    if(name == null) name = 'New Job';
    if(description == null) description = '(no description)';
    let folderDef = new FolderDef(['phase', 'building']);

    let job = new Job(
      random(),
      name,
      description,
      owner,
      shortname,
      folderDef
    );

    let components = [0, 1, 2].map(i=>{
      return new ComponentElement(
        random(),
        'Example Component ' + (i+1),
        'description',
        job.id, // job id
        [] // children
      );
    });
    let children = [0, 1, 2].map(i=>{
      let c = components[i];
      return new Child(
        random(), // id
        c.id, // 'ref' comp id
        1+Math.floor(Math.random()*4), // qty
        null, // _id
        c // data
      );
    });
    let folders = [0, 1, 2].map(i=>{
      let folderType = job.folders.types[i%2];
      return new Folder(
        random(), // id
        'Folder ' + (i+1) + ' (' + folderType + ')',   // name
        ['folder', i, 'description'].join(' '), // description
        folderType, // type
        job.id, // job id
        []
      );
    })

    return Observable.create(sub => {
      sub.next(job);
      this.saveNewJob(job, children, components, folders).then((res)=>{
        sub.next(res.jobs[0]);
        sub.complete();
      });
    });
  }

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
  
  baseJob(obj):BehaviorSubject<Job> {
    if(obj.name == null) throw new Error('name required');
    let job = new Job(
      random(),
      obj.name,
      obj.description,
      obj.owner,
      obj.shortname || obj.name.split(' ').join('_').toLowerCase(),
      new FolderDef(['phase', 'building'])
    );
    let bs = new BehaviorSubject(job);
    let sub = bs.subscribe(_job=>{
      console.log('saving', _job);
      this.saveRecord(this.db, JOB_STORE_NAME, _job)
    });
    return bs;
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
    return this.saveRecord(this.db, storeName, obj.toJSON(false));
  }

  updateJob(job: Job): Promise<string> {
    return this.updateRecord(job);
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

  //logWalkGen(startHash:string) {
  //  let g = function*(hash) {
  //    while(true) {
  //      yield this.loadAs('commit', hash)
  //    }
  //  }
  //  return g(startHash);
  //}

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
