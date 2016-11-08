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

// useful
//indexedDB.webkitGetDatabaseNames().onsuccess = (res) => {console.log([].slice.call(res.target.result).forEach((e)=>{indexedDB.deleteDatabase(e)}))}

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
  //id?: string;
  _id?: string;
  name: string;
  username: string;
  email: string;
}

// root 'element' of phase, building, component, job, etc
class Element {
  id: string;          // generated clientside - 10 characters
  _id?: string|null;   // server id.  may be null if unsaved
  name: string;        // required 
  description?: string; // optional, default ''

  static exclude: string[] = [];

  constructor() {}

}

// how are other elements referenced
class Child {
  id: string;
  qty: number;
}

// optional but convienent/necessary to dispurse updates
class BasedOn {
  id?: string;     // local id
  hash: string;    // local hash (very specific version)
  _id?: string;    // server id
  version: string; // server version / version id
}

// components are generally exclusive to job unless ref-copied (probably wont happen) 
class Component extends Element {
  static type = 'component';
  job: string;            // see above
  children: Child[];
  basedOn?: BasedOn|null; // component it's based on
}

class FolderDef {
  types: string[]; // names of kinds of folders (buildings/phases/etc)
  roots?: string[]; // ids of root folders
}

class Folder extends Element {
  type: string;
  job: string;        // folders are always unique to jobs
  children: string[]; // id refs of other folders (phases/buildings)
}

class Phase extends Folder{
  static type = 'phase';
}

class Building extends Folder {
  static type = 'building';
}

class Job extends Element {
  owner: User;
  shortname: string;
  basedOn?: BasedOn|null;    // potentially ambigious, null vs undefined
  folders: FolderDef;
  commit?: string;

  static exclude: string[] = ['commit'];
}

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

  testRefs: string[] = ['test1', 'test2', 'test3'];

  public users: BehaviorSubject<User[]> = new BehaviorSubject([]);
  public jobs: BehaviorSubject<Job[]> = new BehaviorSubject([]);

  init(): Promise<any> {
    return Promise.all([this.initObjectStore(), this.createGitRepo()]).then(() => {
      let user: User = {
        name: 'Sam Zagrobelny',
        username: 'sazagrobelny',
        email: 'sazagrobelny@dayautomation.com'
      };

      let job: Job = {
        id: random(),
        name: 'Test Job 123',
        description: '',
        owner: user,
        shortname: 'test_job_123',
        folders: {
          types: ['phase', 'building']
        }
      };

      Promise.resolve().then(()=> {
        return this.getUsers().then((users) => {
          let usernames = users.map((u)=>u.username);
          if(usernames.indexOf(user.username) == -1) {
            return this.saveUser(user);
          }
        });
      }).then(() => {
        return this.getJobs().then((jobs)=>{

          if(jobs.map((j)=>j.shortname).indexOf(job.shortname) == -1) {
            return this.saveNewJob(job);
          }
        }).then(()=>{
          this.getJobs().then((jobs)=>{
            let job = jobs[0];

            job.description = 'new description';

            return this.saveJob(job, 'updated description');

          }).then((hash)=>{
            this.debugCommit(hash);

          });
        });
      });

    });
  }

  debugCommit(hash: string) : void {
    this.logWalk(hash).then(streamify).then((commits)=> {
      Promise.all(commits.map((c)=>{
        return this.loadAs('tree', c.tree);
      })).then((arr)=>{
        return Promise.all(arr.map((o)=>this.loadAs('text', o['job.json'].hash)));
      }).then((arr)=>{
        console.log(arr.map((o)=>JSON.parse(o)));
      });
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
            let job : Job = JSON.parse(text);
            job.commit = commitHash;
            return this.saveToStore(this.db, 'jobs', job).then((key)=>{
              return job;
            });
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

  saveToStore(db: any, storeName: string, obj: any): Promise<string> {
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
    return this.saveToStore(this.db, 'users', user);
  }

  readUsersJobs(): Promise<any> {
    return this.readRefs(this.gitdb).then((refs) => {
      let initUsers = [];
      let initProjects = [];
      for(let i=0; i<refs.length; i++) {
        let a = refs[i].split('/');
        if(a[0] == this.gitStoreRefPrefix) {
          let username = a[1];
          let projectShortId = a[2];
          if(initUsers.indexOf(username) == -1) initUsers.push(username);
          initProjects.push(initProjects);
        }
      }
      this.users.next(initUsers);
      this.jobs.next(initProjects);

      return {users: initUsers, projects: initProjects};

    });
  }

  initObjectStore(): Promise<any> {
    let name = this.objectStoreName;
    let version = this.objectStoreVersion;
    return new Promise((resolve, reject) => {
      let request = indexedDB.open(name, version);

      request.onupgradeneeded = (e:any) => {
        let db = e.target.result;

        let stores = ['users', 'components', 'folders'];
        for(let i=0,store; store=stores[i],i<stores.length; i++) {
          if(db.objectStoreNames.contains(store)) {
            db.deleteObjectStore(store);
          }
        }
        Promise.all([
          new Promise((resolve) => {
            // users
            let userStore = db.createObjectStore('users', {keyPath: 'username'});
            userStore.createIndex('name',      'name',     {unique: false});
            //userStore.createIndex('username',  'username', {unique: true});
            userStore.createIndex('email',     'email',    {unique: true});
            userStore.transaction.oncomplete = (e) => {
              resolve();
            };
          }),
          new Promise((resolve) => {
            // components
            let componentStore = db.createObjectStore('components', {keyPath: 'id'});
            componentStore.createIndex('children', 'children', { unique: false, multiEntry: true });
            componentStore.transaction.oncomplete = (e) => {
              resolve();
            };
          }),
          new Promise((resolve) => {
            let store = db.createObjectStore('jobs', {keyPath: 'id'});
            store.createIndex('shortname', 'shortname', { unique: true });
            store.transaction.oncomplete = (e) => {
              resolve();
            }
          }),
          new Promise((resolve) => {
            let folderStore = db.createObjectStore('folders', {keyPath: 'id'});
            folderStore.transaction.oncomplete = (e) => {
              resolve();
            }
          })
        ]).then(()=>{

          this.db = db;
          resolve(db);
        }); // may not resolve
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
    let jobText = JSON.stringify(job);
    let tree = {
      'job.json': {
        mode: gitModes.file,
        content: jobText
      }
    };
    let folderTypes = job.folders.types;
    for(let i=0,folderType; folderType=folderTypes[i],i<folderTypes.length; i++) {
      let folder: Folder = {
        id: random(),
        job: job.id,
        type: folderType,
        name: 'root',
        children: []
      };
      let folderText = JSON.stringify(folder);
      let folderPath = [folderType, folder.id + '.json'].join('/');
      tree[folderPath] = {
        mode: gitModes.file,
        content: folderText
      };
    }
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

      return this.updateRef(ref, commit);
    });
  };

  saveJob(job: Job, message: string): Promise<any> {
    if(job.commit == null || job.commit == '') throw new Error('job must have first commit');
    return this.loadAs('commit', job.commit).then((commit) => {
      let jobText = JSON.stringify(job);
      let changes:any = [{
        path: 'job.json',
        mode: gitModes.file,
        content: jobText
      }];
      changes.base = commit.tree;

      return promisify(this.repo.createTree.bind(this.repo), changes).then((res)=>{
        return res[0];
      });

    }).then((treeHash)=> {
      console.log('new tree', treeHash);
      return this.saveToHash('commit', {
        author: {
          name: job.owner.username,
          email: job.owner.email
        },
        tree: treeHash,
        message: message,
        parents: [job.commit]
      }).then((commitHash)=> {
        let ref = [job.owner.username, job.shortname].join('/');

        return this.updateRef(ref, commitHash).then(()=>{
          return commitHash;
        });
      });
    });
  };

  saveEmptyJob(shortname: string, name: string, description: string, owner: User): Promise<void> {
    if(/\s/g.test(shortname)) throw new Error('invalid job shotname - no spaces');

    if(this.repo == null) throw new Error('repo undefined, run init');

    let jobId = random(); // should check that this is unique - no jobs have this id
    let job: Job = {
      id: jobId,
      name: name,
      shortname: shortname,
      description: description,
      owner: owner,
      folders: {
        types: ['phase', 'building'] // probably perm default, but allow others later
      }
    };

    let jobBlob:string = JSON.stringify(job);
    let ref = [job.owner.username, job.shortname].join('/');

    return this.readRefs(this.gitdb).then((refs: string[]) => {
      if(refs.indexOf(ref) != -1) throw new Error('username / job id combination already exists');

      // create root phase / building
      let ftypes = job.folders.types;
      let folderPromises = Promise.all(ftypes.map((ftype) => {
        let folderName = ftype + 's';
        let fid = random();
        let rootFolder: Folder = {
          id: fid,
          type: ftype,
          name: 'root',
          job: job.id,
          children: []
        }
        job.folders.roots = [] || job.folders.roots;
        job.folders.roots.push(rootFolder.id);

        let fileName = rootFolder.id + '.json'
        let fileBlob = JSON.stringify(rootFolder);

        return this.saveToHash('blob', fileBlob).then((fileHash) => {
          let tree = {};
          tree[fileName] = { mode: gitModes.file, hash: fileHash};
          return this.saveToHash('tree', tree);
        }).then((treeHash) => {
          return [folderName, treeHash];
        });
      }));

      let fileName = 'job.json';
      let filePromise = this.saveToHash('blob', jobBlob).then((fileHash) => {
        return [fileName, fileHash];
      });

      return Promise.all([filePromise, folderPromises]);

    }).then((both: any[]) => {
      let jobPair = both[0];
      let folderPairs = both[1];

      let tree = {};

      tree[jobPair[0]] = { mode: gitModes.file, hash: jobPair[1] };
      folderPairs.forEach((pair)=>{
        tree[pair[0]] = { mode: gitModes.tree, hash: pair[1] };
      });


      return this.saveToHash('tree', tree);

    }).then((treeHash) => {

      return this.saveToHash('commit', {
        author: {
          name: job.owner.username,
          email: job.owner.email
        },
        tree: treeHash,
        message: 'first - created by form'
      });

    }).then((commitHash) => {
      this.updateRef(ref, commitHash);

    }).catch((err) => {
      console.error('error!', err);


    }).then(() => {
      this.readRef(ref).then((commitHash) => {

        return this.logWalk(commitHash);

      }).then(streamify).then((arr) => {
        // arr = commits

        return promisify(this.repo.treeWalk.bind(this.repo), arr[0].tree)
      }).then((result) => {
        // args applied to cb
        let stream = result[0]
        return streamify(stream);
      }).then((result) => {
      });
    });
  }

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
/*
this.repo.readRef(refName, (err, ref) => {
  console.log('ref', ref);
  if(err) return reject(err);
  if(ref == null) {
    this.repo.createTree({
      "www/index.html": {
        mode: gitModes.file,
        content: "<h1>Hello</h1>\n<p>This is an HTML page?</p>\n"
      },
      "README.md": {
        mode: gitModes.file,
        content: "# Sample repo\n\nThis is a sample\n"
      }
    }, (err, treeHash) => {
      if(err) return reject(err);
      console.log(treeHash);

      this.repo.treeWalk(treeHash, (err, treeStream) => {
        if(err) return reject(err);
        treeStream.read((err, res1) => {
          if(err) return reject(err);
          console.log(res1);
          treeStream.read((err, res2) => {
            if(err) return reject(err);
            console.log(res2);
            treeStream.read((err, res3) => {
              if(err) return reject(err);
              console.log(res3);
              treeStream.read((err, res4) => {
                if(err) return reject(err);
                console.log(res4);
                treeStream.read((err, res5) => {
                  if(err) return reject(err);
                  this.repo.saveAs('commit', {
                    author: {
                      name: "sam",
                      email: "sam@zag"
                    },
                    tree: treeHash,
                    message: 'first!'
                  }, (err, commitHash) => {
                    if(err) return reject(err);
                    this.repo.updateRef(refName, commitHash, (err, result) => {
                      console.log(result);

                      this.repo.logWalk(commitHash, (err, stream) => {
                        stream.read((err, result) => {
                          console.log(result);
                          stream.read((err, result) => {
                            console.log(result);
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  } else {
    console.log(ref)
    this.repo.logWalk
  }
});
*/
