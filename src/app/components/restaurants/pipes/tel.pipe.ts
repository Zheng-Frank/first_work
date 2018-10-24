import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tel'
})
export class telPipe implements PipeTransform {
    transform(phonenumber: string): any {
        // make sure we have a number.
        phonenumber = phonenumber || '1111';
        let country: string = '';
        let area: string = '';
        let localNumPart1: string = '';
        let localNumPart2: string = '';

        let newStr = '';

        if (phonenumber.length > 3) {
            phonenumber = phonenumber.replace(/-/g, '');
        };

        // for phone number format of United States
        switch (phonenumber.length) {
            case 4:
                area          = phonenumber.slice(0, 3);
                localNumPart1 = phonenumber.slice(3);
                break;

            case 5:
                area          = phonenumber.slice(0, 3);
                localNumPart1 = phonenumber.slice(3);
                break;

            case 6:
                area          = phonenumber.slice(0, 3);
                localNumPart1 = phonenumber.slice(3);
                break;

            case 7:
                area          = phonenumber.slice(0, 3);
                localNumPart1 = phonenumber.slice(3, 6);
                localNumPart2 = phonenumber.slice(6);
                break;

            case 8:
                area          = phonenumber.slice(0, 3);
                localNumPart1 = phonenumber.slice(3, 6);
                localNumPart2 = phonenumber.slice(6);
                break;

            case 9:
                area          = phonenumber.slice(0, 3);
                localNumPart1 = phonenumber.slice(3, 6);
                localNumPart2 = phonenumber.slice(6);
                break;

            case 10:
                country       = '1';
                area          = phonenumber.slice(0, 3);
                localNumPart1 = phonenumber.slice(3, 6);
                localNumPart2 = phonenumber.slice(6, 10);
                break;

            case 11:
                if (phonenumber[0] === '1') {
                    country       = phonenumber.slice(0, 1);
                    area          = phonenumber.slice(1, 4);
                    localNumPart1 = phonenumber.slice(4, 7);
                    localNumPart2 = phonenumber.slice(7, 11);
                } else {
                    area          = phonenumber.slice(0, 3);
                    localNumPart1 = phonenumber.slice(3, 6);
                    localNumPart2 = phonenumber.slice(6);
                };
                break;

            default: // less than 4 or greater than 12, but the phone number validator will not allow greater than 10 (or 11)
                return phonenumber;
        }

        // for phone number format of China - ToDo

        // for phone number format of Mexico - ToDo

        // newStr = country + '-' + area + '-' + localNumPart1 + '-' + localNumPart2;
        if (phonenumber.length <= 6) {
            newStr = area + '-' + localNumPart1;
        } else {
            newStr = area + '-' + localNumPart1 + '-' + localNumPart2;
        };

        return newStr;
    }
}
