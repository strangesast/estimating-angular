export class EditElement {
  public init: any;
  constructor(
    public el: any,
    public lastCommit: string
  ) {
    if (el.toJSON !== undefined) {
      this.init = el.toJSON();
    }
  }
}
