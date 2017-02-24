import { Injectable } from '@angular/core'; import { DataService } from './data.service';

import * as D3 from 'd3';

import { NestConfig, Collection, ComponentElement, ChildElement, FolderElement } from '../models';
import { product } from '../resources/util';

@Injectable()
export class TreeService {

  constructor(private db: DataService) { }

  async nest(job: Collection, config: NestConfig) {
    let db = this.db;
    let fc = job.folders.order.length;
    let rootFolderIds = config.folders.order.map(name => config.folders.roots[name] || job.folders.roots[name]);

    let folders = (await db.folderElements.where('id').anyOf(rootFolderIds).toArray()).sort((a, b) => rootFolderIds.indexOf(a.id) < rootFolderIds.indexOf(b.id) ? -1 : 1);
    if (folders.length != rootFolderIds.length) throw new Error('invalid folder state');

    await Promise.all(folders.map(async(folder) => await this.resolveFolderChildren(folder)));

    let rootFolderNodes = folders.map(folder => D3.hierarchy(folder));

    let pairs = product(rootFolderNodes.map(node => node.descendants().map(n => n.data.id)));

    if (job.folders.order.length == 1) {
      pairs = pairs.map(p => p[0]);
    }

    let keyName = fc > 1 ? '[' + job.folders.order.map((name, i) => 'folder' + i).join('+') + ']' : 'folder0';

    let locs = await db.locationElements.where(keyName).anyOf(pairs).toArray();

    let children = (await Promise.all(locs
      .map(async(loc) =>(await db.childElements
      .where('id')
      .anyOf((<any[]>loc.children).filter(child => typeof child === 'string'))
      .toArray())
      .map((child: ChildElement) => (child.folders = loc.folders) && child))))
      .reduce((a, b) => a.concat(b), []);

    let components = {};
    // refresh totals doesn't need to be run every time
    await Promise.all(children.map(child => this.resolveComponentChildren(child, components).then(this.refreshComponentTotals.bind(this))));

    folders.forEach((folder, i) => this.refreshFolderTotals(folder, i, children.slice()));

    return { children, components, folders };
  }

  async resolveFolderChildren(root, prev = []) {
    let db = this.db;
    let children = await db.folderElements.where('id').anyOf(root.children.filter(child => typeof child == 'string')).toArray();
    if (children.some(child => prev.indexOf(child.id) != -1)) throw new Error('infinite loop');

    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      await this.resolveFolderChildren(child, prev.concat(child.id));
      let j = root.children.indexOf(child.id);
      if (j == -1) throw new Error('inconsitent prim. key');
      root.children[j] = child;
    }

    return root;
  }

  async resolveComponentChildren(root, prev = {}) {
    let db = this.db;
    if (root instanceof ChildElement) {
      if (!root.data || root.data.id !== root.ref) {
        if (root.ref in prev) {
          root.data = prev[root.ref];
        } else {
          root.data = await db.componentElements.get({ id: root.ref });
          if (!root.data) throw new Error('child ref invalid or nonexistant');
          await this.resolveComponentChildren(root.data, prev)
          prev[root.ref] = root.data;
        }
      }
    } else if (root instanceof ComponentElement) {
      if (root.children && root.children.length) {
        let children = await db.childElements.where('id').anyOf((<string[]>root.children).filter(child => typeof child == 'string')).toArray();
        await Promise.all(children.map(async(child) => {
          let i = (<string[]>root.children).indexOf(child.id);
          if (i == -1) throw new Error('inconsistent prim. key');
          await this.resolveComponentChildren(child, prev);
          root.children[i] = child;
        }));
        if (!children.every(child => child instanceof ChildElement)) throw new Error('all children not retrieved');
      }

    } else {
      throw new Error('passed invalid root');
    }
    return root;
  }

  async refreshComponentTotals(root, prev = {}) {
    if (!root.id) throw new Error('invalid root');
    let vals = prev[root.id];
    if (root instanceof ChildElement) {
      if (!root.ref || !root.data) throw new Error('invalid or unresolved child');
      // components may be used (ref'd by child) in many locations.  only resolve the tree once
      if (!vals) {
        await this.refreshComponentTotals(root.data, prev);
        vals = {
          sell: root.data.totalSell,
          buy:  root.data.totalBuy
        }
        prev[root.ref] = vals;
      }
      let totalSell = root.qty * root.sellFac * vals.sell + +root.sell;
      let totalBuy =  root.qty * root.buyFac *  vals.buy +  +root.buy;
      let update = root.totalSell !== totalSell || root.totalBuy !== totalBuy;
      root.totalSell = totalSell;
      root.totalBuy = totalBuy;
      if (update) {
        await this.db.childElements.put(root.clean());
      }

    } else if (root instanceof ComponentElement) {
      if (!vals) {
        await Promise.all((<any[]>root.children).map(child => {
          if (child instanceof ChildElement) {
            return this.refreshComponentTotals(child, prev);
          } else {
            throw new Error('invalid or unresolved child');
          }
        }));
        vals = {
          sell: (<any[]>root.children).map(child => child.totalSell).reduce((a, b) => a + b, +root.sell),
          buy: (<any[]>root.children).map(child => child.totalBuy).reduce((a, b) => a + b,  +root.buy)
        }
        prev[root.id] = vals;
      }
      let update = root.totalSell !== vals.sell || root.totalBuy !== vals.buy;
      root.totalSell = vals.sell;
      root.totalBuy =  vals.buy;
      if (update) await this.db.componentElements.put(root.clean());

    } else {
      throw new Error('invalid root');
    }

    if (isNaN(root.totalBuy) || isNaN(root.totalSell)) {
      throw new Error('invalid computation');
    }
    return root;
  }

  refreshFolderTotals(folder, folderIndex, children) {
    let sell = 0, buy = 0;
    if (folder.children && folder.children.length) {
      folder.children.forEach(child => {
        if (child instanceof FolderElement) {
          this.refreshFolderTotals(child, folderIndex, children);
        } else {
          throw new Error('invalid or unresolved child');
        }
      });

      sell = folder.children.map(child => child.totalSell).reduce((a, b) => a + b, 0);
      buy =  folder.children.map(child => child.totalBuy ).reduce((a, b) => a + b, 0);
    }

    let arr = [];
    for (let i=0; i < children.length; i++) {
      if (children[i].folders[folderIndex] === folder.id) {
        arr.push(...children.splice(i, 1));
      }
    }

    folder.totalSell = arr.map(child => child.totalSell).reduce((a, b) => a + b, sell);
    folder.totalBuy =  arr.map(child => child.totalBuy ).reduce((a, b) => a + b, buy);
  }

  async getParent(object) {
    let db = this.db;
    if (typeof object === 'string') {
      return (await Promise.all([db.folderElements.get({ children: object }), db.childElements.get({ ref: object })])).reduce((a, b) => a || b);
    } else if ((object instanceof FolderElement || object instanceof ChildElement) && object.id) {
      return await db[(<any>object.constructor).store].get({ children: object.id });
    } else {
      console.error(object);
      throw new Error('invalid/ incompatible object');
    }
  }

  test(jobS, configS) {
    let rootFolders = {};

    let folderMap = {};
    let folderIds = [];

    let folderTrees = {};
    let folderTreeOrders = {};

    let locMap = {};
    let locIds = [];
    let locPairs = [];

    let childMap = {};
    let childIds = [];

    let componentMap = {};
    let componentIds = [];

    let maxCache = 100;

    return configS.withLatestFrom(jobS).switchMap(async([config, job]) => {
      let folderNames = config.folders.order; // may need to be moved below if order is dynamic
      let rootFolderIds = folderNames.map(name => config.folders.roots[name] || job.folders.roots[name]);

      // check for root folder changes
      let checkLocs = (await Promise.all(folderNames.map(async(name, i) => {
        let rootFolderId = rootFolderIds[i];

        if (rootFolders[name] !== rootFolderId) {
          let newIds = [];
          await this.buildFolderTree(rootFolderId, newIds, folderIds, folderMap)

          // keep at least the folders necessary
          folderIds = newIds.concat(folderIds.filter(_id => newIds.indexOf(_id) == -1)).slice(0, Math.max(newIds.length, maxCache));

          for (let id in folderMap) {
            if (folderIds.indexOf(id) == -1) {
              delete folderMap[id];
            }
          }

          rootFolders[name] = rootFolderId;
          folderTrees[name] = D3.hierarchy(folderMap[rootFolderId], (d) => d._children);
          folderTreeOrders[name] = folderTrees[name].descendants().map(n => n.data.id);
          return 1;
        }
        return 0;
      }))).some(x => x == 1);

      if (checkLocs) {
        let trees = folderNames.map(name => folderTrees[name]);

        locPairs = product(trees.map(node => node.descendants().map(el => el.data.id))).map(arr => arr.join('+'));

        let db = this.db;

        let newLocIds = locPairs.filter(id => locIds.indexOf(id) == -1).map(e => e.split('+'));
        if (newLocIds.length ) {
          let keyName = folderNames.length > 1 ?
            `[${folderNames.map((n, i) => 'folder' + i).join('+')}]` :
            'folder0';

          let newLocs = await db.locationElements.where(keyName).anyOf(newLocIds).toArray();
          
          newLocs.forEach(loc => {
            let id = loc.folders.join('+');
            locMap[id] = loc;
          });
        }

        locPairs.forEach(id => {
          if (locMap[id] === undefined) {
            locMap[id] = null; // location doesn't exist (different than uncached)
          } 
        });

        let cids = locPairs.map(id => locMap[id] && locMap[id].children).reduce((a, b) => b ? a.concat(b) : a, []);

        await Promise.all(cids.map(async(id) => {
          if (childIds.indexOf(id) == -1) {
            let child = await db.childElements.get(id);
            childMap[id] = child;
          }
        }));

        let coids = cids.map(id => childMap[id].ref).filter((r, i, arr) => r && arr.indexOf(r) == i);

        let newCoids = coids.filter(id => componentIds.indexOf(id) == -1);

        let newComponents = await db.componentElements.where('id').anyOf(newCoids).toArray();
        if (newComponents.length !== newCoids.length) throw new Error('missing ref component');

        newComponents.forEach(comp => {
          componentMap[comp.id] = comp;
        });

        componentIds = coids.concat(componentIds.filter(_id =>    coids.indexOf(_id) == -1)).slice(0, Math.max(   coids.length, maxCache));
        childIds =      cids.concat(    childIds.filter(_id =>     cids.indexOf(_id) == -1)).slice(0, Math.max(    cids.length, maxCache));
        locIds =    locPairs.concat(      locIds.filter(_id => locPairs.indexOf(_id) == -1)).slice(0, Math.max(locPairs.length, maxCache));

        for (let id in componentMap) {
          if (componentIds.indexOf(id) == -1) {
            delete componentMap[id];
          }
        }

        for (let id in childMap) {
          if (childIds.indexOf(id) == -1) {
            delete childMap[id];
          }
        }

        for (let id in locMap) {
          if (locIds.indexOf(id) == -1) {
            delete locMap[id];
          }
        }
      }
      // TODO: add filter check

      let enabledFolders = folderNames.filter(name => config.folders.enabled[name]);

      let tree;
      if (config.component.enabled) {
        // if component enabled
        let children = locPairs.map(id => {
          let loc = locMap[id];
          return loc && loc.children.map(_id => Object.assign(childMap[_id], { folders: loc.folders }));
        }).reduce((a, b) => b ? a.concat(b) : a, []);

        let nest: any = D3.nest();

        enabledFolders.forEach(key => {
          nest = nest.key((d) => d.folders[folderNames.indexOf(key)]);
        });

        let data = nest.entries(children);

        // add empty folders
        // TODO: improve this mess
        tree = D3.hierarchy({ values: data, key: null }, (n) => {
          if (n.values && n.values.length) {
            if (n.values[0].key && n.values[0].values) {
              let ids = n.values.map(x => x.key);
              let name = enabledFolders.find(name => ids.some(x => folderTreeOrders[name].indexOf(x) != -1));
              if (name) {
                return folderTreeOrders[name].map(id => {
                  let i = ids.indexOf(id);
                  if (i == -1) {
                    return { key: id, values: [] };
                  } else {
                    return n.values[i];
                  }
                });
              }
            }

          }
          return n.values;
        });

        // replace { key: ... values: [] } with FolderElements
        tree.each((n: any) => {
          if (n.data.key && n.data.values) {
            n.data = folderMap[n.data.key];
          } else if (n.data.values) {
            // root node (not root folder, however);
            n.data = null;
          }
        });

      } else if (enabledFolders.length) {
        let name = enabledFolders[0]

        tree = folderTrees[name];

      } else {
        throw new Error('invalid state (component and folders disabled)');
      }

      return tree;

    });
  }

  async buildFolderTree(root, arr, prev=[], map={}, maxDepth = 10, parents = []) {
    if (parents.indexOf(root) != -1) {
      throw new Error('circular tree structure');
    }
    if (prev.indexOf(root) !== -1) {
      arr.unshift(root);
      return map[root];
    }

    let db = this.db;
    let folder = await db.folderElements.get(root);

    if (folder.children && folder.children.length && maxDepth > 0) {
      folder._children = [];
      await Promise.all(folder.children.map((id, i) => {
        return this.buildFolderTree(id, arr, prev, map, maxDepth - 1, parents.concat(root)).then(child => {
          // should probably be BehaviorSubject
          folder._children[i] = child;
        });
      }));
    }

    arr.unshift(root);
    return map[root] = folder;
  }
}
