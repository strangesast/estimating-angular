export class Filter {
  name: string;
  description: string;
  value: string;
}

export const AVAILABLE_FILTERS: Filter[] = [
  {
    name: 'Building',
    description: 'filter by building',
    value: 'building'
  },
  {
    name: 'Phase',
    description: 'filter by phase',
    value: 'phase'
  },
  {
    name: 'Component',
    description: 'filter by component',
    value: 'component'
  },
  {
    name: 'Part',
    description: 'filter by part',
    value: 'part'
  },
  {
    name: 'Filter',
    description: 'list filters',
    value: 'filter'
  }
];
