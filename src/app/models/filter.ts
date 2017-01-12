export interface Filter {
  type: string,
  value: string|number,
  affects: string[] // removed when added to nestconfig filters array
  method?: string,
  property?: string,
  display?: string
}
