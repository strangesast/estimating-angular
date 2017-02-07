import { Pipe, PipeTransform } from '@angular/core';
import { ComponentElement, ChildElement, FolderElement, LocationElement, Collection, CatalogPart } from '../models';

import { hierarchy } from 'd3';

@Pipe({
  name: 'classToString'
})
export class ClassToStringPipe implements PipeTransform {

  transform(value: any, folder?: any): any {
    if (typeof value === 'string') {
      switch(value) {
        case 'location':
          return LocationElement;
        case 'component':
          return ComponentElement;
        case 'child':
          return ChildElement;
        case 'phase':
        case 'building':
        case 'folder':
          return FolderElement;
        case 'collection':
          return Collection;
        case 'catalog-part':
          return CatalogPart;
        case 'hierarchy':
          return hierarchy;
        default: 
          console.error('unrecognized class name', value);
          throw new Error('unrecognized class name "'+value+'"');
      }
    } else {
      if (value instanceof ComponentElement) {
        return 'component';
      } else if (value instanceof ChildElement) {
        return 'child';
      } else if (value instanceof FolderElement) {
        return (folder ? value.type : false) || 'folder';
      } else if (value instanceof Collection) {
        return 'collection';
      } else if (value instanceof CatalogPart) {
        return 'catalog-part';
      } else if (value instanceof hierarchy) {
        return 'hierarchy';
      } else {
        return 'unknown';
        //console.error('unrecognized class', value, value.constructor);
        //throw new Error('unrecognized class "'+value+'"');
      }
    }
  }
}
