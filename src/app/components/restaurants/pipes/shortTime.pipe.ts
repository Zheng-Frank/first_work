import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortTime'
})
export class shortTimePipe implements PipeTransform {

  transform(value: any, restaurantOffsetToEST?: any): any {
    if (value) {
      const cloned = new Date(value.getTime());
      if (typeof restaurantOffsetToEST !== 'undefined') {
        restaurantOffsetToEST = restaurantOffsetToEST || 0;
        // hours difference between restaurant and browser
        const jan = new Date(value.getFullYear(), 0, 1);
        const browserHoursAhead = 5 - restaurantOffsetToEST - jan.getTimezoneOffset() / 60;
        cloned.setHours(cloned.getHours() - browserHoursAhead);
      }
      const h = cloned.getHours();
      const m = cloned.getMinutes();
      return (h % 12 || 12) + ':' + (m < 10 ? '0' + m : m) + ' ' + (h < 12 ? 'AM' : 'PM');
    }
    return null;
  }
}
