/* account of the user editing / saving job / components */
export class User {
  static storeName = 'users';

  public _id?: string;

  static fromObject(obj) {
    let user = new User(obj.name, obj.username, obj.email);
    if (obj._id) {
      user._id = obj._id;
    }
    return user;
  }


  constructor(
    public name: string,
    public username: string,
    public email: string
  ) { }

}

export class EditElement {
  public init: any;
  constructor(
    public el: any,
    public lastCommit: string
  ) {
    if (el.toJSON !== undefined) {
      this.init = el.toJSON();
    }
  }
}

// root 'element' of phase, building, component, job, etc
export class BaseElement {
  static excluded: string[] = [];
  _id?: string|null;   // server id.  may be null if unsaved

  constructor(
    public id: string,
    public name: string,
    public description: string
  ) { }

}

// how are other elements referenced
export class Child { // needs 'name', 'description'
  static excluded: string[] = ['data', 'folders', 'saveState'];
  static fromObject(obj) {
    return new Child(obj.id, obj.name, obj.description, obj.ref, obj.qty, obj._ref, obj.data);
  }

  constructor(
    public id: string,
    public name: string,
    public description: string,
    public ref: string,
    public qty: number,
    public _ref?: string,
    public data?: any,
    public folders?: string[], // location
    public saveState: SaveState = 'unsaved'
  ) { }

  toJSON(removeExcluded = 1) {
    let copy = Object.assign({}, this);
    for (let prop in copy) {
      if (copy.hasOwnProperty(prop)) {
        if (removeExcluded && Child.excluded.indexOf(prop) !== -1) {
          delete copy[prop];
          continue;
        }
        if (copy[prop] != null && copy[prop].toJSON) {
          copy[prop] = copy[prop].toJSON(removeExcluded);
        }
      }
    }
    return copy;
  }
}

// optional but convienent/necessary to dispurse updates
export class BasedOn {
  constructor(
    public id: string,
    public hash: string,
    public _id: string,
    public version: string
  ) { }
}

// components are generally exclusive to job unless ref-copied (probably wont happen) 
export class ComponentElement extends BaseElement {
  static storeName = 'components';
  static excluded: string[] = ['hash', 'saveState'];

  static fromObject(obj) {
    return new ComponentElement(obj.id, obj.name, obj.description, obj.job, obj.children || [], obj.basedOn, obj.hash);
  }


  constructor(
    id,
    name,
    description,
    public job: string,
    public children?: Child[],
    public basedOn?: BasedOn|null,
    public hash?: string,
    public saveState: SaveState = 'unsaved'
  ) {
    super(id, name, description);
    if (children == null) {
      this.children = [];
    }
  }


  toJSON(removeExcluded = 1) {
    let copy = Object.assign({}, this);
    if (removeExcluded) {
      ComponentElement.excluded.forEach((e) => {
        if (e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }
}

export class Location {
  static storeName = 'locations';
  static excluded: string[] = ['commit', 'open', 'saveState'];

  public folder1: string;
  public folder2: string;


  static createId(obj, job) {
    return job.folders.types.map((name, i) => obj[name] || job.folders.roots[i]).join('-');
  }

  static fromJob(job: Collection, folders, children?: Child[]) {
    let id = Location.createId(folders, job);
    let jobId = job.id;
    return new Location(id, jobId, children || [], job.folders.order.map((name, i) => folders[name] || job.folders.roots[i]));
  }

  static fromObject(obj) {
    let children = obj.children;
    obj.folders = [obj.folder1, obj.folder2]; // bit hacky
    return new Location(obj.id, obj.job, children.map(Child.fromObject.bind(Child)), obj.folders, obj.hash);
  }


  constructor(
    public id: string,
    public job: string,
    public children: Child[],
    folders: any,
    public hash?: string
  ) {
    this.folder1 = folders[0];
    this.folder2 = folders[1];
  }


  toJSON(removeExcluded = 1) {
    let copy = Object.assign({}, this);
    for (let prop in copy) {
      if (copy.hasOwnProperty(prop)) {
        if (removeExcluded && Location.excluded.indexOf(prop) !== -1) {
          delete copy[prop];
          continue;
        }
        if (copy[prop] == null) {
          continue;
        }
        if (typeof copy[prop].toJSON === 'function') {
          copy[prop] = copy[prop].toJSON();
        } else if (Array.isArray(copy[prop])) {
          copy[prop] = copy[prop].map((el) => typeof el.toJSON === 'function' ? el.toJSON() : el);
        }
      }
    }
    return copy;
  }
}

export interface FolderDefinition {
  roots?: any; // { 'phase' : 'abcd123', 'building': 'efgh456' }
  order: string[]; // [ 'phase', 'building' ]
}

//                      not in commit         in commit       saved remotely   none of the prev
export type SaveState = 'saved:uncommitted' | 'saved:local' | 'saved:remote' | 'unsaved';

export class FolderElement extends BaseElement {
  static storeName = 'folders';
  static excluded: string[] = ['commit', 'open', 'saveState'];

  static fromObject(obj) {
    let children = obj.children || [];
    return new FolderElement(obj.id, obj.name, obj.description, obj.type, obj.job, children, obj.hash);
  }

  constructor(
    id,
    name,
    description,
    public type: string,
    public job: string,
    public children: any[],
    public hash?: string,
    public open?: boolean,
    public saveState: SaveState = 'unsaved'
  ) {
    super(id, name, description);
  }

  toJSON(removeExcluded = 1) {
    let copy = Object.assign({}, this);
    if (removeExcluded) {
      FolderElement.excluded.forEach((e) => {
        if (e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }

}

export class Collection extends BaseElement {
  static storeName = 'collections';
  static excluded: string[] = ['commit', 'hash', 'saveState'];

  static fromObject(obj, commit?) {
    if (!obj.owner) {
      throw new Error('object owner required');
    }
    let owner = User.fromObject(obj.owner);
    ['id', 'name', 'description', 'owner', 'shortname', 'folders'].forEach((t) => {
      if (obj[t] == null) {
        throw new Error('key ' + t + ' required');
      }
    });
    return new Collection(
      obj.id,
      obj.name,
      obj.description,
      owner,
      obj.shortname,
      obj.folders,
      obj.kind,
      obj.basedOn,
      commit || obj.commit,
      obj.has
    );
  }

  constructor(
    id,
    name,
    description,
    public owner: User,
    public shortname: string,
    public folders: FolderDefinition,
    public kind: 'job'|'library' = 'job',
    public basedOn?: BasedOn|null,
    public commit?: string,
    public hash?: string,
    public saveState: SaveState = 'unsaved'
  ) {
    super(id, name, description);
  }


  toJSON(removeExcluded = 1) {
    let copy = Object.assign({}, this);
    if (removeExcluded) {
      Collection.excluded.forEach((e) => {
        if (e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }

  getURL(): string {
    return [this.owner.username, this.shortname, 'build'].join('/');
  }

}

export interface TreeConfig {
  enabled: any;
  order: string[];
  roots: any; // { 'phase' : '123', 'building':  '456' }
}

export interface NestConfig {
  folders: {
    order: string[];
    roots: any;
    enabled: any;
  };
  component: {
    enabled: boolean;
  }
}
