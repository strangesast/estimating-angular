import { Pipe, PipeTransform } from '@angular/core';
import { ComponentElement, ChildElement, FolderElement, LocationElement, Collection, CatalogPart } from '../models';

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
        default: 
          console.error('unrecognized class name', value);
          throw new Error('unrecognized class name "'+value+'"');
      }
    } else {
      switch(value.constructor) {
        case ComponentElement:
          return 'component';
        case ChildElement:
          return 'child';
        case FolderElement:
          return (folder ? value.type : false) || 'folder';
        case Collection:
          return 'collection';
        case CatalogPart:
          return 'catalog-part';
        default:
          console.error('unrecognized class', value);
          throw new Error('unrecognized class "'+value+'"');
      }
    }
  }
}
