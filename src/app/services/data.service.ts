import { Injectable } from '@angular/core';
 
import { BehaviorSubject } from 'rxjs';

import { Dexie } from 'dexie';
import 'dexie-observable';

import {
  User,
  Collection,
  ComponentElement,
  ChildElement,
  FolderElement,
  LocationElement
} from '../models';

const DB_VERSION = 1;
// use uuid ($$) for id
const STORES = {
  users:             'username, name',
  collections:       '$$id, &[owner.username+shortname]',
  componentElements: '$$id, collection, &*children',
  childElements:     '$$id, collection',
  folderElements:    '$$id, collection, &*children, type',
  locationElements:  '$$id, collection, &*children, [folder0+folder1], [folder0+folder2], [folder1+folder2], folder0, folder1, folder2'
};

// data retrieval, storage, undo/redo

@Injectable()
export class DataService extends Dexie {

  users:             Dexie.Table<User, string>
  collections:       Dexie.Table<Collection, number>
  componentElements: Dexie.Table<ComponentElement, number>
  childElements:     Dexie.Table<ChildElement, number>
  folderElements:    Dexie.Table<FolderElement, number>
  locationElements:  Dexie.Table<LocationElement, number>

  isReady: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor() {
    super('EstimatingData');
    let db = this;
    
    db.version(DB_VERSION).stores(STORES);

    db.users.mapToClass(User);
    db.collections.mapToClass(Collection);
    db.componentElements.mapToClass(ComponentElement);
    db.childElements.mapToClass(ChildElement);
    db.folderElements.mapToClass(FolderElement);
    db.locationElements.mapToClass(LocationElement);

    db.on(<any>'ready', () => this.isReady.next(true));
    db.open();

  }

}
