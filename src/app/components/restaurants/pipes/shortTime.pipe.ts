import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortTime'
})
export class shortTimePipe implements PipeTransform {

  transform(value: any, restaurantOffsetToEST?: any): any {
    if (value) {     
      const cloned = new Date(value.valueOf());
      const serverOffset = (new Date(value.toString('en-US')).valueOf() - new Date(value.toLocaleString('en-US', { timeZone: 'America/New_York' })).valueOf()) / 3600000;
      const totalOffset = -serverOffset + (restaurantOffsetToEST || 0);
      cloned.setHours(cloned.getHours() + totalOffset);
      const h = cloned.getHours();
      const m = cloned.getMinutes();
      return (h % 12 || 12) + ':' + (m < 10 ? '0' + m : m) + ' ' + (h < 12 ? 'AM' : 'PM');
    }
    return null;
  }
}
