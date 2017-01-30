import * as gitModes        from 'js-git/lib/modes';
import * as gitIndexedDb    from 'js-git/mixins/indexed-db';
import * as gitMemDb        from 'js-git/mixins/mem-db';
import * as gitCreateTree   from 'js-git/mixins/create-tree';
import * as gitPackOps      from 'js-git/mixins/pack-ops';
import * as gitWalkers      from 'js-git/mixins/walkers';
import * as gitReadCombiner from 'js-git/mixins/read-combiner';
import * as gitFormats      from 'js-git/mixins/formats';


import { Observable } from 'rxjs/Rx';
import { promisify } from './util';

const gitModesInv = {
  33188: 'text',
  57344: 'commit',
  16384: 'tree'
};

type GitObjectType = 'tree'|'blob'|'file'|'exec'|'sym'|'commit';
export interface Repo {
  refPrefix: string;
  createTree(entries: any, callback?): void;
  hasHash(hash: string, callback?): void;
  loadAs(type: GitObjectType, hash: string, callback?): void;
  logWalk(ref: string, callback?): void;
  readRef(ref: string, callback?): void;
  saveAs(type: GitObjectType, body: any, callback?): void;
  treeWalk(hash: string, callback?): any;
  updateRef(ref: string, hash: string, callback?): void;
}

export interface Commit {
  author: { date: Date, email: string, name: string };
  committer: { date: Date, email: string, name: string };
  message: string;
  parents: string[];
  tree: string;
}

const GIT_STORE_NAME = 'estimating-git';
const GIT_STORE_REF_PREFIX = 'testing';
const GIT_STORE_VERSION = 1;

export function createGitRepo(): Promise<{repo: Repo, gitdb}> {
  return new Promise((resolve, reject) => {
    gitIndexedDb.init(GIT_STORE_NAME, GIT_STORE_VERSION, (err, gitdb) => {
      if (err) {
        return reject(err);
      }
      let repo = {};
      gitIndexedDb(repo, GIT_STORE_REF_PREFIX);
      gitCreateTree(repo);
      gitFormats(repo);
      gitPackOps(repo);
      gitReadCombiner(repo);
      gitWalkers(repo);
      resolve({gitdb, repo});
    });
  });
}

export function logWalk(repo, hash: string): Promise<any> {
  return new Promise((resolve, reject) => {
    repo.logWalk(hash, (err, stream) => {
      if (err) {
        return reject(err);
      }
      resolve(stream);
    });
  });
}

/*
export function* treeWalk(repo: Repo, treeHash: string) {
  // Observable.from((function* () { ... })())
}
*/

export function loadHashAs(repo: Repo, kind: 'blob'|'tree'|'commit'|'text', hash: string): Promise<any> {
  return promisify(repo.loadAs.bind(repo), kind, hash).then((res) => {
    return res[0];
  });
}

export function saveToHash(repo: Repo, kind: 'blob'|'tree'|'commit', body: any): Promise<string> {
  return promisify(repo.saveAs.bind(repo), kind, body).then((res) => {
    return res[0];
  });
}

export function updateRef(repo: Repo, ref: string, hash: string): Promise<void> {
  // repo.updateRef doesn't return anything
  return promisify(repo.updateRef.bind(repo), ref, hash);
}

export function folderHashFromArray(repo: Repo, array: any[]): Promise<string> {
  let folder = {};
  return Promise.all(array.map(element => {
    let text = JSON.stringify(element.toJSON());
    return saveToHash(repo, 'blob', text).then(hash => {
      folder[element.id + '.json'] = { mode: gitModes.file, hash: hash };
    });
  })).then(() => {
    return saveToHash(repo, 'tree', folder);
  });
}

export function readRefs(db: any): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains('refs')) {
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
    };
  }).then((arr: string[]) => {
    // filter out different prefixes
    return arr.filter((str) => {
      return str.startsWith(this.repo.refPrefix) && str.split('/')[0] === this.repo.refPrefix;
    }).map((str) => {
      return str.substring(this.repo.refPrefix.length + 1);
    });
  });
}

export function readRef(repo: Repo, ref: string): Promise<any> {
  return promisify(repo.readRef.bind(repo), ref).then((res) => {
    return res[0];
  });
}

export {
  gitModes,
  gitIndexedDb,
  gitMemDb,
  gitCreateTree,
  gitPackOps,
  gitWalkers,
  gitReadCombiner,
  gitFormats,
  gitModesInv
};
