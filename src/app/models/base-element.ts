// root 'element' of phase, building, component, job, etc
export class BaseElement {
  _id?: string|number; // server id.  may be null if unsaved
  id:   string|number;

  constructor(
    public name: string,
    public description: string
  ) { }

  toJSON() {
    return Object.assign({}, this);
  }

  clean() {
    return this;
  }
}
