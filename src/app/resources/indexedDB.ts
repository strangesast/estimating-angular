//indexedDB.webkitGetDatabaseNames().onsuccess = (res) => {console.log([].slice.call(res.target.result).forEach((e)=>{indexedDB.deleteDatabase(e)}))}
import {
  Child,
  User,
  ComponentElement,
  Location,
  FolderElement,
  Collection
} from '../models/classes';
import { random } from './util';
export const JOB_STORE_NAME = 'jobs';
export const FOLDER_STORE_NAME = 'folders';
export const LOCATION_STORE_NAME = 'locations';
export const COMPONENT_STORE_NAME = 'components';
export const STORE_NAME = 'estimating';
export const STORE_VERSION = 1;
export const USER_COLLECTION = 'users';
export const INVALID_FOLDER_TYPES = ['component', 'location'];
export const STORES = [
  { name: User.storeName,      keypath: 'username', indexes: [{ on: 'name',      name: 'name',      unique: false },
                                                       { on: 'email',     name: 'email',     unique: true  }] },
  { name: ComponentElement.storeName, keypath: 'id',       indexes: [{ on: 'children',  name: 'children',  unique: false, multiEntry: true },
                                                       { on: 'job',       name: 'job',       unique: false }] },
  { name: FolderElement.storeName,    keypath: 'id',       indexes: [{ on: 'type',      name: 'type',      unique: false },
                                                       { on: 'job',       name: 'job',       unique: false }] },
  { name: Location.storeName,  keypath: 'id',       indexes: [{ on: 'children',  name: 'children',  unique: false, multiEntry: true },
                                                       { on: 'folders',   name: 'folders',   unique: true,  multiEntry: true },
                                                       { on: 'job',       name: 'job',       unique: false }] },
  { name: Collection.storeName,       keypath: 'id',       indexes: [{ on: 'shortname', name: 'shortname', unique: true  }] }
];

export function saveRecord(db, storeName: string, obj: any) {
  return new Promise((resolve, reject) => {
    let trans = db.transaction(storeName, 'readwrite');
    let store = trans.objectStore(storeName);
    let req;
    if(obj.id == '') { // new objects have { id: '', ... }
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

export function saveRecordAs(db, obj: Location|Child|ComponentElement|FolderElement|Collection): Promise<string> {
  if (typeof (<any>obj.constructor).storeName !== 'string' || typeof obj.toJSON !== 'function') {
    throw new Error('improper instance of class');
  }
  let storeName = (<any>obj.constructor).storeName;
  return saveRecord(db, storeName, obj.toJSON())
}

export function retrieveRecord(db, storeName: string, id: string, key?: string) {
  return new Promise((resolve, reject)=> {
    let trans = db.transaction([storeName]);
    let req:any = trans.objectStore(storeName);
    if(key!=null) req = req.index(key);
    req = req.get(id);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function retrieveRecordAs(db, _class: any, id: string, key?: string): Promise<Collection|FolderElement|ComponentElement> {
  if (typeof _class.storeName !== 'string') {
    throw new Error('improper class or class definition');
  }
  let storeName = _class.storeName;
  return retrieveRecord(db, storeName, id, key).then(record => {
    if(record == null) return null;
    let el = _class.fromObject(record);
    el.saveState = 'saved:uncommitted';
    return el;
  });
}

export function retrieveAllRecords(db, storeName: string, query?: IDBKeyRange, max?: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let trans = db.transaction([storeName]);
    let store = trans.objectStore(storeName); let req = (<any>store).getAll(query, max);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function retrieveAllRecordsAs(db, _class: any, query?: IDBKeyRange, max?: number): Promise<any[]> {
  if (typeof _class.storeName !== 'string') {
    throw new Error('improper class or class definition');
  }
  let storeName = _class.storeName;
  return retrieveAllRecords(db, storeName, query, max).then(records => {
    return records.map(_class.fromObject.bind(_class)).map((el:any)=>{
      el.saveState='saved:uncommitted'
      return el;
    });
  });
}

export function removeRecord(db, storeName: string, id: string, key?: string) {
  return new Promise((resolve, reject) => {
    let trans = db.transaction(storeName, 'readwrite');
    let store:any = trans.objectStore(storeName);
    if(key!=null) store = store.index(key);
    let req = store.delete(id);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function countRecords(db, storeName, id?:string, key?: string) {
  return new Promise((resolve, reject) => {
    let trans = db.transaction(storeName);
    let store:any = trans.objectStore(storeName);
    if(key!=null) store = store.index(key);
    let req;
    if(id!=null) {
      req = store.count(IDBKeyRange.only(id));
    } else {
      req = store.count();
    }
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}
