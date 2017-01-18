import { BaseElement } from './base-element';
import { Child } from './child';
import { BasedOn } from './based-on';
import { SaveState } from './save-state';

// components are generally exclusive to job unless ref-copied (probably wont happen) 
export class ComponentElement extends BaseElement {
  static readonly storeName = 'components';
  static excluded: string[] = ['hash', 'saveState'];

  static fromObject(obj) {
    return new ComponentElement(obj.id, obj.name, obj.description, obj.sell, obj.buy, obj.job, obj.children || [], obj.basedOn, obj.hash);
  }

  constructor(
    id,
    name,
    description,
    public sell: number,
    public buy: number,
    public job: string,
    public children: string[]|Child[] = [],
    public basedOn?: BasedOn|null,
    public hash?: string,
    public saveState: SaveState = 'unsaved'
  ) {
    super(id, name, description);
    if (children == null) {
      this.children = [];
    }
  }

  toJSON(removeExcluded = 1) {
    let copy = Object.assign({}, this);
    if (removeExcluded) {
      ComponentElement.excluded.forEach((e) => {
        if (e in copy) {
          delete copy[e];
        }
      });
    }
    return copy;
  }
}
