import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'adjustedDate'
})
export class adjustedDatePipe extends DatePipe implements PipeTransform {

  transform(value: any, format?: string, timezone?: string): any {
    if (value) {
      // const offset = (new Date(value.toLocaleString('en-US')).valueOf() - new Date(value.toLocaleString('en-US', { timeZone: timezone })).valueOf()) / 3600000;
      // value.setHours(value.getHours() - offset);
      // return super.transform(value, format);
      value = new Date(value);
      const restaurantOffsetToEST = (new Date(value.toLocaleString('en-US', { timeZone: timezone })).valueOf() - new Date(value.toLocaleString('en-US', { timeZone: 'America/New_York' })).valueOf()) / 3600000
      
      const cloned = new Date(value.valueOf());
      const serverOffset = (new Date(value.toString('en-US')).valueOf() - new Date(value.toLocaleString('en-US', { timeZone: 'America/New_York' })).valueOf()) / 3600000;
      const totalOffset = -serverOffset + (restaurantOffsetToEST || 0);
      cloned.setHours(cloned.getHours() + totalOffset);
      
      return super.transform(cloned, format);
    }
    return null;
  }
}
