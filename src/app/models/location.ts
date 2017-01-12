import { Collection } from './collection';
import { Child } from './child';

export class Location {
  static readonly storeName = 'locations';
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
