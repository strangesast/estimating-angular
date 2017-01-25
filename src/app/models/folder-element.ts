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
  static store = 'folderElements';

  static excluded: string[] = ['commit', 'open', 'saveState'];

  static fromJSON(obj) {
    let folder = Object.create(FolderElement.prototype);
    return Object.assign(folder, obj);
  }

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
}
