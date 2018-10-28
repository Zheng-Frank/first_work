import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'percentage'
})
export class percentagePipe implements PipeTransform {

    transform(value: any, args?: any): any {
        if (value) {
            // we keep only 3 digits at most: 0.0785 => 7.85%, 0.075=> 7.5%, 0.07=> 7%
            const v = (+value * 100).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
            return v + '%';
        }
        return '0%';
    }
}
