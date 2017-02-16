import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterArray'
})
export class FilterArrayPipe implements PipeTransform {

  transform(value: any[], str?: any): any {
    if (str) {
      return value.filter(n => n.type == str);
    }
    return value;
  }

}
