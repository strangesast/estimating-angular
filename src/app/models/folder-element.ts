import { BaseElement } from './base-element';
import { SaveState } from './save-state';

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
    copy.children = copy.children.map(child => typeof child !== 'string' ? child.id : child);
    return copy;
  }

}
