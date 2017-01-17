import { Pipe, PipeTransform } from '@angular/core';
import { ComponentElement, Child, FolderElement, Collection } from '../models/classes';

@Pipe({
  name: 'classToString'
})
export class ClassToStringPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    if (typeof value === 'string') {
      switch(value) {
        case 'component':
          return ComponentElement;
        case 'child':
          return Child;
        case 'folder':
          return FolderElement;
        case 'collection':
          return Collection;
        default: 
          console.error('unrecognized class name', value);
          throw new Error('unrecognized class name "'+value+'"');
      }
    } else {
      switch(value.constructor) {
        case ComponentElement:
          return 'component';
        case Child:
          return 'child';
        case FolderElement:
          return 'folder';
        case Collection:
          return 'collection';
        default:
          console.error('unrecognized class', value);
          throw new Error('unrecognized class "'+value+'"');
      }
    }
  }
}
