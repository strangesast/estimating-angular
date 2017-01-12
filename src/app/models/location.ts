import { Collection } from './collection';
import { SaveState } from './save-state';
import { Child } from './child';

// can be modified for three folders
const FOLDER_NAMES = ['folder1', 'folder2'];

export class Location {
  static readonly storeName = 'locations';
  static excluded: string[] = ['commit', 'open', 'saveState'];

  static fromObject(obj) {
    let folders = FOLDER_NAMES.map(name => obj[name]);
    return new Location(obj.id, obj.job, obj.children, folders, obj.hash);
  }

  constructor(
    public id: string,
    public job: string,
    public children: string[],
    public folders: string[], // same order as collection.folders.order
    public hash?: string,
    public saveState: SaveState = 'unsaved'
  ) { }

  toJSON(removeExcluded = 1) {
    let copy:any = {};
    Object.keys(this).forEach(name => Location.excluded.indexOf(name) === -1 ? copy[name] = this[name] : null);

    let folders = copy.folders;
    delete copy.folders;

    FOLDER_NAMES.forEach((name, i) => copy[name] = folders[i]);

    return copy;
  }
}
