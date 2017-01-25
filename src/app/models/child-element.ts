import { BaseElement } from './base-element';
import { SaveState } from './save-state';

/*
 * ChildElement elements contain a reference to a ComponentElement and contextual information
 * like quantity
 *
 */

export class ChildElement extends BaseElement {
  static readonly store = 'childElements';

  static excluded: string[] = ['data', 'folders', 'saveState'];

  static fromJSON(obj) {
    let child = Object.create(ChildElement.prototype);
    return Object.assign(child, obj);
  }

  constructor(
    name,
    description,
    public collection: string|number,
    public ref: string|number,
    public qty: number,
    public _ref?: string|number,
    public data?: any,
    public folders?: string[], // location
    public saveState: SaveState = 'unsaved'
  ) {
    super(name, description);
  }

}
