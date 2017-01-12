export interface NestConfig {
  folders: {
    order: string[];
    roots: any;
    enabled: any;
    filters: any;
  };
  component: {
    enabled: boolean;
    filters: any[];
  }
  filters: any[];
}
