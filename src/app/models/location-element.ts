import { BaseElement } from './base-element';
import { Collection } from './collection';
import { SaveState } from './save-state';
import { ChildElement } from './child-element';

// can be modified for three folders
const FOLDER_NAMES = ['folder1', 'folder2'];

/*
 * Locations are containers that match combinations of folders ( of different types ) to
 * the root children at that intersection.
 *
 */
export class LocationElement extends BaseElement {
  static readonly store = 'locationElements';
  static excluded: string[] = ['commit', 'open', 'saveState'];

  static fromJSON(obj) {
    let location = Object.create(LocationElement.prototype);
    return Object.assign(location, obj);
  }

  get folders() {
    let i = 0, folders = [];
    while(i < 10) {
      let id = this['folder' + i];
      if (id == undefined) {
        break;
      }
      folders.push(id);
      i++;
    }
    return folders;
  }

  set folders(arr: string[]) {
    for(let i = 0; i < arr.length; i++) {
      this['folder' + i] = arr[i];
    }
  }

  constructor(
    name,
    description,
    public collection: string|number,
    public children: (number|string)[]|ChildElement[],
    folders: string[], // same order as collection.folders.order
    public hash?: string,
    public saveState: SaveState = 'unsaved'
  ) {
    super(name, description);
    for(let i = 0; i < folders.length; i++) {
      this['folder' + i] = folders[i];
    }
  }
}
