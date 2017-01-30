// d3
import { Collection, ComponentElement, ChildElement, FolderElement } from '../models';

import { Observable } from 'rxjs';
export function waitForTransition(_transition) {
  return Observable.create(subscriber => {
    let size = _transition.size();
    if (size === 0) {
      subscriber.complete();
    }
    let n = 0;
    _transition.each(() => ++n).on('end', function(d, i) {
      subscriber.next({element: this, data: d, index: i}); // this == html element
      if (!--n) {
        subscriber.complete();
      }
    });
  }).toArray();
}


// should move to observable stream
export function streamify(stream): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let fn = (arr) => {
      stream.read((err, result) => {
        if (err) {
          return reject(err); // error out
        }
        if (result == null) {
          return resolve(arr); // done
        }
        fn(arr.concat(result));
      });
    };
    fn([]);
  });
};

export function promisify(...args: any[]): Promise<any[]> {
  let fn = args[0];
  return new Promise((resolve, reject) => {
    let cb = function(err) {
      if (err) {
        return reject(err);
      }
      resolve([].slice.call(arguments, 1));
    };
    fn.apply(null, args.slice(1).concat(cb));
  });
}

export function random(): string {
  return (Math.random().toString(36) + '00000000000000000').slice(2, 10 + 2);
}

interface StoreDefinition {
  name: string;
  keypath: string;
  indexes?: {
    on: string|string[],
    name: string,
    unique: boolean
  }[];
}

export function initObjectStore(name: string, version: number, stores: StoreDefinition[]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open(name, version);
    request.onupgradeneeded = (e: any) => {
      let db = e.target.result;
      let createStore = (storeName, keypath, indexes) => {
        let store = db.createObjectStore(storeName, { keyPath: keypath });
        indexes.forEach((index) => {
          store.createIndex(index.name, index.on, { unique: index.unique, multiEntry: !!index.multiEntry });
        });
      };
      let trans = e.target.transaction;
      stores.forEach((store) => {
        if (db.objectStoreNames.contains(store.name)) {
          db.deleteObjectStore(store.name);
        }
        createStore(store.name, store.keypath, store.indexes);
      });
      trans.onsuccess = () => {
        resolve(db);
      };
    };
    request.onsuccess = (e: any) => {
      let db = e.target.result;
      resolve(db);
    };
  });
}

export function classToNameString(_class): string {
  switch(_class) {
    case ComponentElement:
      return 'component';
    case ChildElement:
      return 'child';
    case FolderElement:
      return 'folder';
    case Collection:
      return 'collection';
    default:
      throw new Error('unrecognized class "'+_class+'"');
  }
}
export function nameStringToClass(name):any {
  switch(name) {
    case 'component':
      return ComponentElement;
    case 'child':
      return ChildElement;
    case 'folder':
      return FolderElement;
    case 'collection':
      return Collection;
    default: 
      throw new Error('unrecognized class name "'+name+'"');
  }
}

export function product(arr) {
  return arr.reduce((a, b) =>
    a.map((x) =>
      b.map((y) =>
        x.concat(y)
      )
    ).reduce((a, b) =>
      a.concat(b), []),
  [[]]);
}
