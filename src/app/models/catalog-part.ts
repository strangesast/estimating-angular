export interface ICatalogPart {
  _boost: number;
  active: boolean;
  description: string;
  id: string;
  kind: string;
  label: string;
  summary: string;
  type: string;
}

export class CatalogPart {
  static fromJSON(obj) {
    let part = Object.create(CatalogPart.prototype);
    return Object.assign(part, obj);
  }

  toJSON() {
    return Object.assign({}, this);
  }
}
