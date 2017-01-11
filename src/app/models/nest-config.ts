export interface NestConfig {
  folders: {
    order: string[];
    roots: any;
    enabled: any;
  };
  component: {
    enabled: boolean;
  }
}
