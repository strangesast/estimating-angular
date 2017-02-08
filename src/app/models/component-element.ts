import { BaseElement } from './base-element';
import { ChildElement } from './child-element';
import { BasedOn } from './based-on';
import { SaveState } from './save-state';
import { CatalogPart } from './catalog-part';

export interface IComponent extends BaseElement {
  name;
  description;
  sell: number;
  buy: number;
  qty: number;
  collection: string|number;
  data?: CatalogPart;
}

// components are generally exclusive to job unless ref-copied (probably wont happen) 
export class ComponentElement extends BaseElement implements IComponent {
  static readonly store = 'componentElements';
  static readonly keys = ['$$id', 'collection', 'name', '&*children', 'buy', 'sell'];

  static excluded: string[] = ['hash', 'saveState'];

  static fromJSON(obj) {
    let component = Object.create(ComponentElement.prototype);
    return Object.assign(component, obj);
  }

  public totalSell = 0;
  public totalBuy = 0;

  constructor(
    name,
    description,
    public sell: number,
    public buy: number,
    public collection: string,
    public children: string[]|ChildElement[] = [],
    public qty: number = 1,
    public catalog: string,
    public basedOn?: BasedOn|null,
    public hash?: string,
    public saveState: SaveState = 'unsaved'
  ) {
    super(name, description);
  }

  public data;

  clean(): ComponentElement {
    let component = Object.create(ComponentElement.prototype);
    ['id', 'name', 'description', 'collection', '_id', 'sell', 'buy', 'totalSell', 'totalBuy', 'qty', 'catalog', 'basedOn'].forEach((name) => {
      component[name] = this[name];
    });
    component.children = this.children ? (<any[]>this.children).filter(child => typeof child === 'string' || child instanceof ChildElement).map(child => {
      if (typeof child === 'string') return child;
      if (!child.id) throw new Error('cant save child on component without id');
      return child.id;
    }) : [];
    return component;
  }

}
