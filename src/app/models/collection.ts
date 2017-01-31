import { FolderDefinition } from './folder-definition';
import { BaseElement } from './base-element';
import { SaveState } from './save-state';
import { BasedOn } from './based-on';
import { User, IUser } from './user';

type CollectionType = 'job' | 'library';

export interface ICollection {
  _id?: string|number,
  id?: string|number,
  name: string,
  description: string,
  owner: User,
  shortname: string,
  folders: FolderDefinition,
  kind: CollectionType,
  basedOn?: BasedOn|null;
  commit?: string;
  hash?: string;
  saveState?: SaveState;
  stats?: any;
}

export class Collection extends BaseElement implements ICollection {
  static readonly store = 'collections';
  static readonly keys = ['$$id', '&[owner.username+shortname]', 'name'];

  static excluded: string[] = ['commit', 'hash', 'saveState'];

  static fromJSON(obj) {
    let collection = Object.create(Collection.prototype);
    return Object.assign(collection, obj);
  }

  public stats;

  get initialized(): boolean {
    return this.folders.roots ? this.folders.order.some(name => typeof this.folders.roots[name] === 'string') : false;
  }

  get path(): string[] {
    return [this.owner.username, this.shortname];
  }

  get pathString(): string {
    return this.path.join('/');
  }


  get orderedFolders(): (string|number)[] {
    if (!this.folders.roots) return [];
    return this.folders.order.map(n => this.folders.roots[n]);
  }

  constructor(
    name,
    description,
    public owner,
    public shortname,
    public folders,
    public kind: CollectionType = 'job',
    public basedOn?,
    public commit?,
    public hash?,
    public saveState: SaveState = 'unsaved'
  ) {
    super(name, description);
  }

  getURL(): string {
    return [this.owner.username, this.shortname, 'build'].join('/');
  }

  clean() {
    let collection = Object.create(Collection.prototype);
    ['id', 'name', 'description', 'owner', 'shortname', 'folders', 'kind', 'basedOn'].forEach((name) => {
      collection[name] = this[name];
    });
    return collection;
  }
}

export interface CollectionRecord {
  id: string;
  name: string;
  description: string;
  owner: IUser;
  folders: FolderDefinition;
  kind: CollectionType;
  basedOn: BasedOn;
}

export interface CollectionPlus {
  collection: Collection;
  stats: {
    folders: number;
    components: number;
    children: number;
  };
}
