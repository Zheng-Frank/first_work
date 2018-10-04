import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appDate'
})
export class appDatePipe implements PipeTransform {

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
       return cloned.getDate();
    }
    return null;
  }
}
