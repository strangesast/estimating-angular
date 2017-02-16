import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { DataService } from './data.service';
import { ElementService } from './element.service';
import { UserService } from './user.service';

import { User, Collection, FolderElement, ComponentElement, ChildElement } from '../models';
import { CollectionPlus } from '../models/collection';

@Injectable()
export class JobListService implements Resolve<any> {
  public list: Collection[];

  constructor(private db: DataService, private elementService: ElementService, private userService: UserService) { }

  // retrieve collections and add stats
  resolve(route: ActivatedRouteSnapshot): Promise<CollectionPlus[]> {
    return this.refreshList().then(list => this.list = list);
  }

  async refreshList() {
    let db = this.db;
    let cols = [Collection, FolderElement, ComponentElement, ChildElement].map(c => db[c.store]);
    return await (<any>db.transaction)('r', ...cols, async() => {
      let collections = await db.collections.toArray();
      let arr = [];
      for(let i = 0; i < collections.length; i++) {
        let collection = collections[i];
        collection.stats = await this.getStats(collection);
        collection.owner = User.fromJSON(collection.owner);
      }
      return collections;
    });
  }

  getStats(collection: Collection) {
    let db = this.db;
    return Promise.all([
      db.folderElements.where('collection').equals(collection.id),
      db.childElements.where('collection').equals(collection.id),
      db.componentElements.where('collection').equals(collection.id),
    ]).then(([folders, children, components]) => ({ folders, children, components }));
  }

  async createCollection(collection: Collection) {
    let db = this.db;
    let id = await db.collections.add(collection);
    collection.id = <any>id;
    collection.stats = await this.getStats(collection);
    this.list.push(collection);
    return collection;
  }

  async update(collectionId, changes) {
    let db = this.db;
    let n = await db.collections.update(collectionId, changes);
    return n;
  }

  remove(collection: Collection) {
    let db = this.db;
    return db.collections.delete(<any>collection.id).then(() => {
      let i = this.list.indexOf(collection);
      if (i == -1) {
        throw new Error('already removed');
      }
      this.list.splice(i, 1);
    });
  }

}
