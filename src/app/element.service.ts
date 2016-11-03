import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs/Rx';

import * as TsGit from 'ts-git';

import * as jsgitModes        from 'js-git/lib/modes';
//import * as jsgitMemDb        from 'js-git/mixins/mem-db';
//import * as jsgitFsDb         from 'js-git/mixins/fs-db';
import * as jsgitIndexedDb    from 'js-git/mixins/indexed-db';
//import * as jsgitIndexedDb    from 'git-indexeddb';
//import * as jsgitWebSql       from 'js-git/mixins/websql-db';
import * as jsgitCreateTree   from 'js-git/mixins/create-tree';
import * as jsgitPackOps      from 'js-git/mixins/pack-ops';
import * as jsgitWalkers      from 'js-git/mixins/walkers';
import * as jsgitReadCombiner from 'js-git/mixins/read-combiner';
import * as jsgitFormats      from 'js-git/mixins/formats';

@Injectable()
export class ElementService {
  //private initializeRepo(repo) {
  //  jsgitIndexedDb(repo);
  //  jsgitCreateTree(repo);
  //  jsgitPackOps(repo);
  //  jsgitWalkers(repo);
  //  jsgitReadCombiner(repo);
  //}

  constructor() {
    console.log('tsgit', TsGit);
    let repo:any = {};

    //this.initializeRepo(repo);

    let modes = jsgitModes;

    console.log(modes);
    console.log(repo);

    //repo.listRefs('', function(err, res) {
    //  console.log('refs', res);
    //});

    

    jsgitIndexedDb.init((err)=> {
      jsgitIndexedDb(repo, 'toast');
      //jsgitWebSql(repo, 'toast');
      //jsgitMemDb(repo);
      //jsgitFsDb(repo);
      jsgitCreateTree(repo);
      jsgitPackOps(repo);
      jsgitWalkers(repo);
      jsgitReadCombiner(repo);
      jsgitFormats(repo);

      repo.createTree({
        "www/index.html": {
          mode: modes.file,
          content: "<h1>Hello</h1>\n<p>This is an HTML page?</p>\n"
        },
        "README.md": {
          mode: modes.file,
          content: "# Sample repo\n\nThis is a sample\n"
        }
      }, function(err, treeHash) {
        console.log(treeHash);

        repo.treeWalk(treeHash, function(err, treeStream) {
          treeStream.read(function(err, res1) {
            console.log(res1);
            treeStream.read(function(err, res2) {
              console.log(res2);
              treeStream.read(function(err, res3) {
                console.log(res3);
                treeStream.read(function(err, res4) {
                  console.log(res4);
                  treeStream.read(function(err, res5) {
                    repo.saveAs('commit', {
                      author: {
                        name: "sam",
                        email: "sam@zag"
                      },
                      tree: treeHash,
                      message: 'first!'
                    }, function(err, commitHash) {
                      repo.updateRef('master', commitHash, function(err, result) {
                        console.log(result);

                        repo.logWalk(commitHash, function(err, stream) {
                          stream.read(function(err, result) {
                            console.log(result);
                            stream.read(function(err, result) {
                              console.log(result);
                            });

                          });
                        });

                      })
                    });
                  });
                });
              });
            });
          })
        });
      });

      let gen = function* (): any {
        let treeHash = yield repo.createTree({
          "www/index.html": {
            mode: modes.file,
            content: "<h1>Hello</h1>\n<p>This is an HTML page?</p>\n"
          },
          "README.md": {
            mode: modes.file,
            content: "# Sample repo\n\nThis is a sample\n"
          }
        });

        console.log('treehash', treeHash);
      };

      //let source = Rx.Observable.from(gen());
      //source.subscribe((res)=>{
      //  console.log(res);
      //});
      let g = gen();
      g.next();
      g.next();
      g.next();
      g.next();

    });


    //let source = Rx.Observable.from(function* (): any {
    //  let treeHash = yield repo.createTree({
    //    "www/index.html": {
    //      mode: modes.file,
    //      content: "<h1>Hello</h1>\n<p>This is an HTML page?</p>\n"
    //    },
    //    "README.md": {
    //      mode: modes.file,
    //      content: "# Sample repo\n\nThis is a sample\n"
    //    }
    //  });
    //  // We can also loop through all the files of each commit version.
    //  console.log(treeHash, 'treeHash');
    //  let treeStream = yield repo.treeWalk(treeHash);
    //  let object;
    //  while (object = yield treeStream.read(), object !== undefined) {
    //    console.log(object);
    //  }
    //}());

    //source.subscribe((res) => {
    //  console.log('res', res);
    //});


  }

}
