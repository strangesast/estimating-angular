import * as gitModes        from 'js-git/lib/modes';
import * as gitIndexedDb    from 'js-git/mixins/indexed-db';
import * as gitMemDb        from 'js-git/mixins/mem-db';
import * as gitCreateTree   from 'js-git/mixins/create-tree';
import * as gitPackOps      from 'js-git/mixins/pack-ops';
import * as gitWalkers      from 'js-git/mixins/walkers';
import * as gitReadCombiner from 'js-git/mixins/read-combiner';
import * as gitFormats      from 'js-git/mixins/formats';


import { promisify } from './util';

const gitModesInv = {
  33188: 'text',
  57344: 'commit',
  16384: 'tree'
};

type GitObjectType = 'tree'|'blob'|'file'|'exec'|'sym'|'commit';
export interface Repo {
  createTree(entries:any, callback):void;
  hasHash(hash:string, callback):void;
  loadAs(type:GitObjectType, hash:string, callback):void;
  logWalk(ref:string, callback):void;
  readRef(ref:string, callback):void;
  refPrefix:string;
  saveAs(type:GitObjectType, body:any, callback):void;
  treeWalk(hash:string, callback):void;
  updateRef(ref:string, hash:string, callback):void;
}

const GIT_STORE_NAME = 'estimating-git';
const GIT_STORE_REF_PREFIX = 'testing';
const GIT_STORE_VERSION = 1;

export function createGitRepo(): Promise<{repo: Repo, gitdb}> {
  return new Promise((resolve, reject) => {
    gitIndexedDb.init(GIT_STORE_NAME, GIT_STORE_VERSION, (err, gitdb) => {
      if(err) return reject(err);
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

export function logWalk(hash: string): Promise<any> {
  return new Promise((resolve, reject) => {
    this.repo.logWalk(hash, (err, stream) => {
      if(err) return reject(err);
      resolve(stream);
    });
  });
}

export function treeWalk(hash: string): Promise<any> {
  return new Promise((resolve, reject) => {
    this.repo.treeWalk(hash, (err, stream) => {
      if(err) return reject(err);
      resolve(stream);
    });
  });
}

export function loadAs(kind: 'blob'|'tree'|'commit'|'text', hash: string):Promise<any>{
  return promisify(this.repo.loadAs.bind(this.repo), kind, hash).then((res) => {
    return res[0]; //=body, res[1]=hash
  });
}

export function saveToHash(kind: 'blob'|'tree'|'commit', body: any):Promise<string> {
  return promisify(this.repo.saveAs.bind(this.repo), kind, body).then((res) => {
    return res[0];
  });
}

export function updateRef(ref: string, hash: string): Promise<void> {
  // repo.updateRef doesn't return anything
  return promisify(this.repo.updateRef.bind(this.repo), ref, hash).then((res)=>{
    return null;
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
