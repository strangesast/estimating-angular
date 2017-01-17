/*
indexedDB.webkitGetDatabaseNames().onsuccess = (res) =>\
{console.log([].slice.call(res.target.result).forEach((e) => {indexedDB.deleteDatabase(e)}))}
*/
import { Observable } from 'rxjs';
import {
  Child,
  User,
  ComponentElement,
  Location,
  FolderElement,
  Collection
} from '../models/classes';
import { random } from './util';
export const DB_NAME = 'estimating';
export const DB_VERSION = 1;
export const USER_COLLECTION = 'users';
export const INVALID_FOLDER_TYPES = ['component', 'location'];
export const STORES = [
  { name: User.storeName,             keypath: 'username', indexes: [
    { on: 'name',      name: 'name',      unique: false },
    { on: 'email',     name: 'email',     unique: true  }
  ] },
  { name: ComponentElement.storeName, keypath: 'id', indexes: [
    { on: 'children',  name: 'children',  unique: false, multiEntry: true },
    { on: 'job',       name: 'job',       unique: false }
  ] },
  { name: FolderElement.storeName,    keypath: 'id', indexes: [
    { on: 'children',  name: 'children',  unique: false, multiEntry: true },
    { on: 'type',      name: 'type',      unique: false },
    { on: 'job',       name: 'job',       unique: false }
  ] },
  { name: Location.storeName,         keypath: 'id', indexes: [
    { on: 'children',  name: 'children',  unique: false, multiEntry: true }, // creates an index for every child id
    { on: 'folder1',   name: 'folder1', unique: false },
    { on: 'folder2',   name: 'folder2', unique: false },
    // { on: ['folder1', 'folder2', 'folder3'], name: 'folders', unique: true }, use this for > 2 folders
    { on: ['folder1', 'folder2'], name: 'folders', unique: true },
    { on: 'job',       name: 'job',       unique: false }
  ] },
  { name: Collection.storeName,       keypath: 'id', indexes: [
    { on: 'shortname', name: 'shortname', unique: true  }
  ] },
  { name: Child.storeName,            keypath: 'id', indexes: [
    { on: 'job',       name: 'job',       unique: false }
  ] }
];

function comparer(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function saveRecord(db, storeName: string, obj: any) {
  return new Promise((resolve, reject) => {
    let trans = db.transaction(storeName, 'readwrite');
    let store = trans.objectStore(storeName);
    let req;
    if (obj.id === '') { // new objects have { id: '', ... }
      // need to check random() unique-ness
      obj.id = random();
      req = store.add(obj);
    } else {
      req = store.put(obj);
    }
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function saveRecordSubject(db, storeName: string, obj: any): Observable<any> {
  return Observable.create(subscriber => {
    let trans = db.transaction(storeName, 'readwrite');
    let store = trans.objectStore(storeName);
    let req;
    if(obj.id === '') {
      obj.id = random();
      req = store.add(obj);
    } else {
      req = store.put(obj);
    }
    store.onsuccess = (e) => subscriber.next(e.target.result);
    store.onerror = (e) => subscriber.error(e.target.error);
    trans.oncomplete = (e) => subscriber.complete();
  });
}

export function saveRecordAs(db, obj: Location|Child|ComponentElement|FolderElement|Collection): Promise<string> {
  if (typeof (<any>obj.constructor).storeName !== 'string' || typeof obj.toJSON !== 'function') {
    throw new Error('improper instance of class');
  }
  let storeName = (<any>obj.constructor).storeName;
  return saveRecord(db, storeName, obj.toJSON());
}

export function saveRecordAsSubject(db, obj: Location|Child|ComponentElement|FolderElement|Collection): Observable<any> {
  if (typeof (<any>obj.constructor).storeName !== 'string' || typeof obj.toJSON !== 'function') {
    return Observable.throw(new Error('improper instance of class'));
  }
  let storeName = (<any>obj.constructor).storeName;
  return saveRecordSubject(db, storeName, obj.toJSON());
}

export function retrieveRecord(db, storeName: string, id: string|string[], key?: string) {
  return new Promise((resolve, reject) => {
    let trans = db.transaction([storeName]);
    let req: any = trans.objectStore(storeName);
    if (key != null) {
      req = req.index(key);
    }
    req = req.get(id);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function retrieveRecordAs(db, _class: any, id: string|string[], key?: string): Promise<Collection|FolderElement|ComponentElement|Location|Child> {
  if (typeof _class.storeName !== 'string') {
    throw new Error('improper class or class definition');
  }
  let storeName = _class.storeName;
  return retrieveRecord(db, storeName, id, key).then(record => {
    if (record == null) {
      return null;
    }
    let el = _class.fromObject(record);
    el.saveState = 'saved:uncommitted';
    return el;
  });
}

export function retrieveRecordsIn(db, storeName: string, ids: string[], key?: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let arr = ids.sort(comparer);
    let i = 0;
    let trans = db.transaction([storeName]);
    let store = trans.objectStore(storeName)
    if (key !== undefined) {
      store = store.index(key)
    }
    let req = store.openCursor();
    let result = [];
    req.onsuccess = (e) => {
      let cursor = e.target.result;
      if(!cursor) {
        return resolve(result);
      }
      let _key = cursor.key;
      while (_key > arr[i]) {
        ++i;

        if (i === arr.length) {
          return resolve(result)
        }
      }

      if (_key === arr[i]) {
        result.push(cursor.value);
        cursor.continue()

      } else {
        cursor.continue(arr[i]);
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

export function retrieveRecordsAsWith(db, _class, id, indexName) {
  if (typeof _class.storeName !== 'string') {
    throw new Error('improper class or class definition');
  }
  let storeName = _class.storeName;
  return retrieveRecordsWith(db, storeName, id, indexName).then(records => {
    return records.map(el => {
      let ob = _class.fromObject(el)
      ob.saveState = 'saved:uncommitted';
      return ob;
    });
  });
}

export function retrieveRecordsWith(db, storeName, id, indexName): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let trans = db.transaction([storeName]);
    let store = trans.objectStore(storeName);
    let index = store.index(indexName);
    let q = IDBKeyRange.only(id);
    let req = index.openCursor(q);
    let results = [];
    req.onsuccess = (e) => {
      let cursor = e.target.result;
      if(cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

export function retrieveRecordsInAs(db, _class: any, ids: string[], key?: string): Promise<Collection[]|Child[]|FolderElement[]|ComponentElement[]> {
  if (typeof _class.storeName !== 'string') {
    throw new Error('improper class or class definition');
  }
  let storeName = _class.storeName;
  return retrieveRecordsIn(db, storeName, ids, key).then(records => {
    return records.map(el => {
      let ob = _class.fromObject(el)
      ob.saveState = 'saved:uncommitted';
      return ob;
    });
  });
}

export function retrieveAllRecords(db, storeName: string, query?: IDBKeyRange, index?: string, max?: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let trans = db.transaction([storeName]);
    let store: any = trans.objectStore(storeName);
    if (index) {
      store = store.index(index);
    }
    let req = (<any>store).getAll(query, max);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function retrieveAllRecordsAs(db, _class: any, query?: IDBKeyRange, index?: string, max?: number): Promise<any[]> {
  if (typeof _class.storeName !== 'string') {
    throw new Error('improper class or class definition');
  }
  let storeName = _class.storeName;
  return retrieveAllRecords(db, storeName, query, index, max).then(records => {
    return records.map(_class.fromObject.bind(_class)).map((el: any) => {
      el.saveState = 'saved:uncommitted';
      return el;
    });
  });
}

export function removeRecord(db, storeName: string, id: string, key?: string) {
  return new Promise((resolve, reject) => {
    let trans = db.transaction(storeName, 'readwrite');
    let store: any = trans.objectStore(storeName);
    if (key != null) {
      store = store.index(key);
    }
    let req = store.delete(id);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function removeRecordAs(db, obj: Location|Child|ComponentElement|FolderElement|Collection) {
  let storeName = (<any>obj.constructor).storeName;
  if (typeof storeName !== 'string') {
    throw new Error('improper class or class definition');
  }
  return removeRecord(db, storeName, obj.id);
}

export function countRecords(db, storeName, id?: string, key?: string) {
  return new Promise((resolve, reject) => {
    let trans = db.transaction(storeName);
    let store: any = trans.objectStore(storeName);
    if (key != null) {
      store = store.index(key);
    }
    let req;
    if (id != null) {
      req = store.count(IDBKeyRange.only(id));
    } else {
      req = store.count();
    }
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function retrieveRecordArray(db, storeName, arr, key, only = true) {
  return new Promise((resolve, reject) => {
    let trans = db.transaction(storeName);
    let store = trans.objectStore(storeName);
    let index = store.index(key);
    let q = IDBKeyRange.only(arr);
    if (only) { // only one result, typically for len 2 array
      let req = index.get(q);
      req.onsuccess = (e) => resolve(e.target.result);
    } else {
      let req = index.openCursor(q);
      let results = [];
      req.onsuccess = (e) => {
        let cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();

        } else {
          resolve(results);
        }
      };
    }
  });
}

export function retrieveUniqueId() {
  return random();
}
