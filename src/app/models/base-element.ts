// root 'element' of phase, building, component, job, etc
export class BaseElement {
  _id?: string; // server id.  may be null if unsaved
  id:   string;

  constructor(
    public name: string,
    public description: string
  ) { }

  toJSON() {
    return Object.assign({}, this);
  }

  clean(): any {
    return this;
  }
}
