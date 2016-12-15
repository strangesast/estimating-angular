export function streamify(stream): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let fn = (arr) => {
      stream.read((err, result) => {
        if(err) return reject(err); // error out
        if(result == null) return resolve(arr); // done
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
      if(err) return reject(err);
      resolve([].slice.call(arguments, 1))
    };
    fn.apply(null, args.slice(1).concat(cb));
  });
}

export function random():string {
  return (Math.random().toString(36)+'00000000000000000').slice(2, 10+2);
}

interface StoreDefinition {
  name: string;
  keypath: string,
  indexes?: {
    on: string,
    name: string,
    unique: boolean
  }[];
}

export function initObjectStore(name:string, version:number, stores:StoreDefinition[]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open(name, version);
    request.onupgradeneeded = (e:any) => {
      let db = e.target.result;
      let createStore = (name, keypath, indexes) => {
        let store = db.createObjectStore(name, { keyPath: keypath });
        indexes.forEach((index)=> {
          store.createIndex(index.name, index.on, { unique: index.unique, multiEntry: !!index.multiEntry });
        });
      }
      let trans = e.target.transaction;
      stores.forEach((store)=> {
        if(db.objectStoreNames.contains(store.name)) {
          db.deleteObjectStore(store.name);
        }
        createStore(store.name, store.keypath, store.indexes);
      });
      trans.onsuccess = (e) => {
        resolve(db);
      }
    };
    request.onsuccess = (e:any) => {
      let db = e.target.result;
      resolve(db);
    };
  });
}
