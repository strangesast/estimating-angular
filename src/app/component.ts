import { Element } from './element';

export class Component extends Element {
  part: string;
  qty: number = 1;
  price: number = 0.0;
}
