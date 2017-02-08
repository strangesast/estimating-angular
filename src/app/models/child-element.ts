import { BaseElement } from './base-element';
import { SaveState } from './save-state';
import { IComponent } from './component-element';

/*
 * ChildElement elements contain a reference to a ComponentElement and contextual information
 * like quantity
 *
 */

export class ChildElement extends BaseElement implements IComponent {
  static readonly store = 'childElements';
  static readonly keys = ['$$id', 'collection', 'name', 'qty', 'buy', 'sell', 'ref'];

  static excluded: string[] = ['data', 'folders', 'saveState'];

  static fromJSON(obj) {
    let child = Object.create(ChildElement.prototype);
    return Object.assign(child, obj);
  }

  public sell = null;
  public buy = null;
  public sellFac = 1; // qty multiplier totalSell = component.sell * qty * mult + child.sell
  public buyFac = 1; // qty multiplier totalSell = component.sell * qty * mult + child.sell
  public totalSell = 0;
  public totalBuy = 0;

  constructor(
    name,
    description,
    public collection: string|number,
    public ref: string|number,
    public qty: number = 1,
    public _ref?: string|number,
    public data?: any,
    public folders?: string[], // location
    public saveState: SaveState = 'unsaved'
  ) {
    super(name, description);
  }

  clean() {
    let child = Object.create(ChildElement.prototype);
    ['id', 'name', 'description', 'collection', 'ref', 'qty', '_ref', '_id', 'buy', 'sell', 'sellFac', 'buyFac', 'totalSell', 'totalBuy'].forEach((name) => {
      child[name] = this[name];
    });
    return child;
  }
}
