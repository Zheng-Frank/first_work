import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'money'
})
export class moneyPipe implements PipeTransform {

    transform(value: any, args?: any): any {
        if (value && +value > 0) {
            return '$' + (+value).toFixed(2);
        } else if (value && +value < 0) {
            return '-$' + Math.abs(+value).toFixed(2);
        }
        return '$0.00';
    }

}