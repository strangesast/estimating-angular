export interface Filter {
  type: string,
  value: string|number|boolean,
  affects: string[] // removed when added to nestconfig filters array
  method?: string,
  property?: string,
  display?: string
}
