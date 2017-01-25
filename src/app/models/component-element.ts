import { BaseElement } from './base-element';
import { ChildElement } from './child-element';
import { BasedOn } from './based-on';
import { SaveState } from './save-state';

// components are generally exclusive to job unless ref-copied (probably wont happen) 
export class ComponentElement extends BaseElement {
  static readonly store = 'componentElements';

  static excluded: string[] = ['hash', 'saveState'];

  static fromJSON(obj) {
    let component = Object.create(ComponentElement.prototype);
    return Object.assign(component, obj);
  }

  constructor(
    name,
    description,
    public sell: number,
    public buy: number,
    public collection: string,
    public children: (number|string)[]|ChildElement[] = [],
    public basedOn?: BasedOn|null,
    public hash?: string,
    public saveState: SaveState = 'unsaved'
  ) {
    super(name, description);
  }
}
