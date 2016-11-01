export class Element {
  static kind = 'element';

  id: string | number;
  name: string;
  parent: string | number | null;
  children: string[];
}
