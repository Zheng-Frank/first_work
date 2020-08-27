import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'adjustedDate'
})
export class adjustedDatePipe extends DatePipe implements PipeTransform {

  transform(value: any, format?: string, timezone?: string): any {
    if (value) {
      value = new Date(value);
      const cloned = new Date(value.toLocaleString('en-US', { timeZone: timezone }));
      return super.transform(cloned, format);
    }
    return null;
  }
}
