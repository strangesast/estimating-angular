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

function random():string {
  return (Math.random().toString(36)+'00000000000000000').slice(2, 10+2);
}

// account of the user editing / saving job / components
class User {
  id: string;
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
}

function createRepo(prefix: string): any {
  let repo = {};
  gitIndexedDb(repo, prefix);
  gitCreateTree(repo);
  gitFormats(repo);
  gitPackOps(repo);
  gitReadCombiner(repo);
  gitWalkers(repo);
  return repo;
}

function readRefs(repo): string[] {
  return ['a', 'b'];
}

@Injectable()
export class ElementService {
  activeUser: string | null = null;
  indexedDbName: string = 'estimating';
  indexedDbVersion: number = 1;
  indexedDbRefPrefix: string = 'testing';
  repo: any;
  db: any;

  testRefs: string[] = ['test1', 'test2', 'test3'];

  public users: BehaviorSubject<string[]> = new BehaviorSubject([]);
  public projects: BehaviorSubject<string[]> = new BehaviorSubject([]);

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      gitIndexedDb.init(this.indexedDbName, this.indexedDbVersion, (err, db) => {
        if(err) return reject(err);
        this.repo = createRepo(this.indexedDbRefPrefix);
        this.db = db;

        this.readRefs().then((refs) => {
          let initUsers = [];
          let initProjects = [];
          for(let i=0; i<refs.length; i++) {
            let a = refs[i].split('/');
            if(a[0] == this.indexedDbRefPrefix) {
              let username = a[1];
              let projectShortId = a[2];
              if(initUsers.indexOf(username) == -1) initUsers.push(username);
              initProjects.push(initProjects);
            }
          }
          this.users.next(initUsers);
          this.projects.next(initProjects);

          return resolve({users: initUsers, projects: initProjects});
        });
      });
    });
  }

  readRefs(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if(this.db == null) throw new Error('db undefined, run init');
      let storeNames = [].slice.call(this.db.objectStoreNames);
      if(storeNames.indexOf('refs') == -1) {
        return reject(new Error('refs uninitialized, run init'));
      }
      let trans = this.db.transaction(['refs'], 'readwrite');
      trans.oncomplete = (e) => {
        console.log('transaction complete', e);
      };
      trans.onerror = (e) => {
        console.log('transaction error', e);
        return reject(e);
      };
      let store = trans.objectStore('refs');
      let req = store.getAllKeys();
      req.onsuccess = (e) => {
        return resolve(e.target.result);
      };
    }).then((arr: string[]) => {
      // filter out different prefixes
      return arr.filter((str) => {
        return str.startsWith(this.indexedDbRefPrefix) && str.split('/')[0] == this.indexedDbRefPrefix;
      }).map((str)=>{
        return str.substring(this.indexedDbRefPrefix.length + 1);
      });
    });
  }

  readRef(ref: string):Promise<any> {
    return new Promise((resolve, reject) => {
      this.repo.readRef(ref, (err, hash) => {
        if(err) return reject(err);
        resolve(hash);
      });
    });
  }

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

    return this.readRefs().then((refs: string[]) => {
      console.log('refs', refs);
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

      console.log(tree);

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
        console.log('commit', commitHash);
        return this.logWalk(commitHash);
      }).then((stream) => {
        new Promise((resolve, reject) => {
          function recurse(s, arr) {
            arr = arr || [];
            s.read((err, result) => {
              if(err) return reject(err);
              if(result == null) return resolve(arr);
              recurse(s, arr.concat(result));
            });
          };
        }).then((result) => {
          console.log('result', result);
        });
        return;
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

  saveToHash(kind: 'blob'|'tree'|'commit', body: any):Promise<string> {
    return new Promise((resolve, reject) => {
      this.repo.saveAs(kind, body, (err, hash, body) => {
        if(err) return reject(err);
        resolve(hash);
      });
    });
  }

  updateRef(ref: string, hash: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.repo.updateRef(ref, hash, (err) => {
        if(err) return reject(err);
        resolve();
      });
    });
  }

  constructor() {
    this.init().then(() => {
      let id = random();
      let id2 = random();
      console.log(id, id2);

      let user: User = {
        id: id2,
        name: 'Sam Zagrobelny',
        username: 'sazagrobelny',
        email: 'sazagrobelny@dayautomation.com'
      };

      //                short id        name            desc                     owner
      this.saveEmptyJob('test_job_123', 'Test job 123', 'this is a description', user).then(() => {

        console.log('done saving..');

      }).catch((err)=>{

        console.log('failed to save new job', err);

      });
    });
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
