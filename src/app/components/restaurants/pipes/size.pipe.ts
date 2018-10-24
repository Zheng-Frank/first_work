import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'size'
})
export class sizePipe implements PipeTransform {

  transform(value: any, args?: any): any {
    if(value) {
      if(value.toLowerCase() === 'regular') {
        return 'reg';
      }
      if(value.toLowerCase() === 'large') {
        return 'lg';
      }
      if(value.toLowerCase() === 'small') {
        return 'sm';
      }
      return value;
    }
    return null;
  }

}
