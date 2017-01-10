import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'typeToClass'
})
export class TypeToClassPipe implements PipeTransform {

  transform(value: any, args?: any): any {
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
      default:
        return 'fa-question';
    }
  }
}
