import { BaseElement } from './base-element';
import { SaveState } from './save-state';

export interface IFolderElement {
  id?: string|number;
  _id?: string|number;
  name: string;
  description: string;
  type: string;
  collection: string|number;
  children: FolderElement[]|string[];
  hash?: string;
  open?: boolean;
  saveState: SaveState;
}

export class FolderElement extends BaseElement {
  static readonly store = 'folderElements';
  static readonly keys = ['$$id', 'collection', 'name', '&*children', 'type'];

  static excluded: string[] = ['commit', 'open', 'saveState'];

  static fromJSON(obj) {
    let folder = Object.create(FolderElement.prototype);
    return Object.assign(folder, obj);
  }

  public totalSell = null;
  public totalBuy = null;

  constructor(
    name,
    description,
    public type,
    public collection,
    public children = [],
    public hash?,
    public open?,
    public saveState: SaveState = 'unsaved'
  ) {
    super(name, description);
  }

  clean() {
    let folder = Object.create(FolderElement.prototype);
    ['id', 'name', 'description', 'type', 'collection', '_id'].forEach((name) => {
      folder[name] = this[name];
    });
    folder.children = this.children ? this.children.filter(child => typeof child === 'string' || child instanceof FolderElement).map(child => {
      if (typeof child === 'string') return child;
      if (!child.id) throw new Error('cant save child on folder without id');
      return child.id;
    }) : [];
    return folder;
  }
}
