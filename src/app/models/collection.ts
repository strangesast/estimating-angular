import { FolderDefinition } from './folder-definition';
import { BaseElement } from './base-element';
import { SaveState } from './save-state';
import { BasedOn } from './based-on';
import { User } from './user';

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
