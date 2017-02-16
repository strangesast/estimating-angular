export interface ICatalogPart {
  _boost: number;
  active: boolean;
  description: string;
  id: string;
  kind: string;
  label: string;
  summary: string;
  type: string;
  nys_price: number;
  price: number;
  list_price: number;
  number: string;
  version_id: string;
}

export class CatalogPart {

  public id;

  static fromJSON(obj) {
    let part = Object.create(CatalogPart.prototype);
    return Object.assign(part, obj);
  }

  toJSON() {
    return Object.assign({}, this);
  }
}
