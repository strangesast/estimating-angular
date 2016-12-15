import * as gitModes        from 'js-git/lib/modes';
import * as gitIndexedDb    from 'js-git/mixins/indexed-db';
import * as gitMemDb        from 'js-git/mixins/mem-db';
import * as gitCreateTree   from 'js-git/mixins/create-tree';
import * as gitPackOps      from 'js-git/mixins/pack-ops';
import * as gitWalkers      from 'js-git/mixins/walkers';
import * as gitReadCombiner from 'js-git/mixins/read-combiner';
import * as gitFormats      from 'js-git/mixins/formats';

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
