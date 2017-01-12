import { SaveState } from './save-state';
// how are other elements referenced
export class Child { // needs 'name', 'description'
  static readonly storeName = 'children';
  static excluded: string[] = ['data', 'folders', 'saveState'];

  static fromObject(obj) {
    return new Child(obj.id, obj.name, obj.description, obj.job, obj.ref, obj.qty, obj._ref, obj.data);
  }

  constructor(
    public id: string,
    public name: string,
    public description: string,
    public job: string,
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
