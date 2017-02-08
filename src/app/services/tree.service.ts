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
}
