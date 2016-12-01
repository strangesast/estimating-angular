// account of the user editing / saving job / components
export class User {
  _id?: string;

  constructor(
    public name: string,
    public username: string,
    public email: string
  ) { }

  static create(obj) {
    let user = new User(obj.name, obj.username, obj.email);
    if(obj._id) {
      user._id = obj._id;
    }
    return user;
  }
}

export class TreeElement {
  // reference component or folder
  ref: any;

  constructor(public refid: string, public reftype: 'component'|'phase'|'building'|'folder', public level: number, public ctx: any) { }

  static fromElement(obj, ctx, level:number):TreeElement {
    let t;
    if(obj instanceof ComponentElement) {
      t = 'component';
    } else if (obj instanceof Folder) {
      t = obj['type'] || 'folder'; // perhaps undesirable
    } else {
      console.error('unrecognized type', obj);
      throw new Error('unrecognized type');
    }
    return new TreeElement(obj.id, t, level, ctx);
  }

  getURL():string {
    return [this.reftype, this.refid].join('/');
  }
}

// root 'element' of phase, building, component, job, etc
export class Element {
  _id?: string|null;   // server id.  may be null if unsaved

  constructor(
    public id: string, 
    public name: string, 
    public description: string
  ) { }

  static exclude: string[] = [];
}

// how are other elements referenced
export class Child {
  constructor(
    public id: string,
    public qty: number,
    public _id?: string,
    public data?: any
  ) { }
  toJSON() {
    let copy = Object.assign({}, this);
    return copy;
  }
  static create(obj) {
    return new Child(obj.id, obj.qty, obj._id, obj.data);
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
export class ComponentElement extends Element {
  constructor(
    id,
    name,
    description,
    public job: string, 
    public children?: Child[], 
    public basedOn?: BasedOn|null
  ) {
    super(id, name, description);
    if(children == null) this.children = [];
  }

  static create(obj) {
    return new ComponentElement(obj.id, obj.name, obj.description, obj.job, obj.children || [], obj.basedOn);
  }

  static exclude: string[] = ['commit'];

  toJSON(removeExcluded?:Boolean) {
    if(removeExcluded == null) removeExcluded = true;
    let copy = Object.assign({}, this);
    if(removeExcluded) {
      ComponentElement.exclude.forEach((e)=>{
        if(e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }
}

export class Location {
  constructor(public id: string, public job: string, public children: Child[], public folders: string[]) { }

  static createId(obj, job) {
    return job.folders.types.map((name, i)=>obj[name] || job.folders.roots[i]).join('-');
  }

  static fromJob(job: Job, folders, children?: Child[]) {
    let id = Location.createId(folders, job);
    let jobId = job.id;
    return new Location(id, jobId, children || [], job.folders.types.map((name, i)=>folders[name] || job.folders.roots[i]));
  }

  static create(obj) {
    return new Location(obj.id, obj.job, obj.children, obj.folders);
  }

  toJSON(removeExcluded?: Boolean) {
    let copy = Object.assign({}, this);
    for(var prop in copy) {
      if(typeof copy[prop].toJSON == 'function') {
        copy[prop] = copy[prop].toJSON();
      } else if (Array.isArray(copy[prop])) {
        copy[prop] = copy[prop].map((el)=>typeof el.toJSON == 'function' ? el.toJSON() : el);
      }
    }
    return copy;
  }
}

export class FolderDef {
  constructor(
    public types: string[], // names of kinds of folders (buildings/phases/etc)
    public roots?: string[] // ids of root folders
  ) { }
}

export class Folder extends Element {
  constructor(
    id,
    name,
    description,
    public type: string,
    public job: string,
    public children: any[]
  ) {
    super(id, name, description);
  }

  static exclude: string[] = ['commit'];

  toJSON(removeExcluded?:Boolean) {
    if(removeExcluded == null) removeExcluded = true;
    let copy = Object.assign({}, this);
    if(removeExcluded) {
      Folder.exclude.forEach((e)=>{
        if(e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }

  static create(obj) {
    let children = obj.children || [];
    return new Folder(obj.id, obj.name, obj.description, obj.type, obj.job, children);
  }
}

export class Job extends Element {
  constructor(
    id,
    name,
    description,
    public owner: User,
    public shortname: string,
    public folders: FolderDef,
    public basedOn?: BasedOn|null,    // potentially ambigious, null vs undefined
    public commit?: string
  ) {
    super(id, name, description);
  }

  static exclude: string[] = ['commit'];

  toJSON(removeExcluded?:Boolean) {
    if(removeExcluded == null) removeExcluded = true;
    let copy = Object.assign({}, this);
    if(removeExcluded) {
      Job.exclude.forEach((e)=>{
        if(e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }

  getURL():string {
    return [this.owner.username, this.shortname, 'build'].join('/');
  }

  static create(obj, commit?: string) {
    if(!obj.owner) throw new Error('object owner required');
    let owner = User.create(obj.owner);
    ['id', 'name', 'description', 'owner', 'shortname', 'folders'].forEach((t)=>{
      if(obj[t] == null) throw new Error('key ' + t + ' required');
    });
    return new Job(obj.id, obj.name, obj.description, owner, obj.shortname, obj.folders, obj.basedOn, commit);
  }
}
