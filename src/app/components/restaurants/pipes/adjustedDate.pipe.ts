import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import {Helper} from '../../../classes/helper';

@Pipe({
  name: 'adjustedDate'
})
export class AdjustedDatePipe extends DatePipe implements PipeTransform {

  transform(value: any, format?: string, timezone?: string): any {
    if (value) {
      return super.transform(Helper.adjustDate(new Date(value), timezone), format);
    }
    return null;
  }
}
