// root 'element' of phase, building, component, job, etc
export class BaseElement {
  static excluded: string[] = [];
  _id?: string|null;   // server id.  may be null if unsaved

  constructor(
    public id: string,
    public name: string,
    public description: string
  ) { }

}
