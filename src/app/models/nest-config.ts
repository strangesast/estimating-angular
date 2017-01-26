export interface NestConfig {
  folders: {
    order: string[]; // ['phase', 'building']
    roots: any;      // { phase: 123, building: 'abc' }
    enabled: any;    // { phase: true, building: false }
    filters: any;    // { phase: [], building: [] }
  };
  component: {
    enabled: boolean;
    filters: any[];
  }
  filters: any[];
}
