import {Pipe, PipeTransform} from '@angular/core';
import {Helper} from '../classes/helper';

@Pipe({
  name: 'timezoneOffset'
})
export class TimezoneOffsetPipe implements PipeTransform {

  constructor() {
  }

  transform(timezone: string) {
    return Helper.getOffsetNumToEST(timezone);
  }

}
