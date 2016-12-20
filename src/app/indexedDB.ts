//indexedDB.webkitGetDatabaseNames().onsuccess = (res) => {console.log([].slice.call(res.target.result).forEach((e)=>{indexedDB.deleteDatabase(e)}))}
export const JOB_STORE_NAME = 'jobs';
export const FOLDER_STORE_NAME = 'folders';
export const LOCATION_STORE_NAME = 'locations';
export const COMPONENT_STORE_NAME = 'components';
export const STORE_NAME = 'estimating';
export const STORE_VERSION = 1;
export const USER_COLLECTION = 'users';
export const INVALID_FOLDER_TYPES = ['component', 'location'];
export const STORES = [
  { name: 'users',      keypath: 'username', indexes: [{ on: 'name',      name: 'name',      unique: false },
                                                       { on: 'email',     name: 'email',     unique: true  }] },
  { name: 'components', keypath: 'id',       indexes: [{ on: 'children',  name: 'children',  unique: false, multiEntry: true },
                                                       { on: 'job',       name: 'job',       unique: false }] },
  { name: 'folders',    keypath: 'id',       indexes: [{ on: 'type',      name: 'type',      unique: false },
                                                       { on: 'job',       name: 'job',       unique: false }] },
  { name: 'locations',  keypath: 'id',       indexes: [{ on: 'children',  name: 'children',  unique: false, multiEntry: true },
                                                       { on: 'folders',   name: 'folders',   unique: true,  multiEntry: true },
                                                       { on: 'job',       name: 'job',       unique: false }] },
  { name: 'jobs',       keypath: 'id',       indexes: [{ on: 'shortname', name: 'shortname', unique: true  }] }
];
