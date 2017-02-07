import { Pipe, PipeTransform } from '@angular/core';
import { CatalogPart, ComponentElement, ChildElement, FolderElement } from '../models';
import { hierarchy } from 'd3';

@Pipe({
  name: 'typeToClass'
})
export class TypeToClassPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    if(typeof value === 'string') {
      switch (value) {
        case 'child':
          return 'fa-cubes';
        case 'component':
          return 'fa-cube';
        case 'filter':
          return 'fa-filter';
        case 'job':
          return 'fa-truck';
        case 'folder':
          return 'fa-folder-o';
        case 'phase':
          return 'fa-bookmark-o';
        case 'building':
          return 'fa-building-o';
        case 'all':
          return 'fa-asterisk';
        default:
          return 'fa-question';
      }
    } else if (value instanceof ChildElement) {
      return 'fa-cubes';
    } else if (value instanceof ComponentElement) {
      return 'fa-cube';
    } else if (value instanceof FolderElement) {
      return value.type == 'phase' ? 'fa-bookmark-o' : value.type == 'building' ? 'fa-building-o' : 'fa-folder-o';
    } else if (value instanceof CatalogPart) {
      return 'fa-file-o';
    } else if (value instanceof hierarchy) {
      return 'fa-th-list';
    } else {
      return 'fa-question';
    }
  }
}
