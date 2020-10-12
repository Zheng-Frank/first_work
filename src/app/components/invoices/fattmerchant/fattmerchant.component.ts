import { Component, OnInit, Input, NgZone, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CreditCard, Address } from '@qmenu/ui';
declare var FattJs: any;

@Component({
  selector: 'app-fattmerchant',
  templateUrl: './fattmerchant.component.html',
  styleUrls: ['./fattmerchant.component.scss']
})
export class FattmerchantComponent implements OnInit {

  requireZipcode = true; // MUST be set to true for fattmerchant
  requireNames = true; // MUST be set to true for fattmerchant
  @Input() excludeAmex = true;
  @Input() excludeDiscover = true;
  @Input() requirePhone = true;

  cardNumberError: string;
  cvcError: string;

  month: string;
  monthError: string;

  names: string
  namesError: string;;

  phone: string;
  phoneError: string;

  year: string;
  yearError: string;

  zipcode: string;
  zipcodeError: string;

  fattJs;
  cardType;
  cardTypeFaClass = {
    american_express: 'fa-cc-amex',
    master: 'fa-cc-mastercard',
    visa: 'fa-cc-visa',
    discover: 'fa-cc-discover',
    diners_club: 'fa-cc-diners-club',
    jcb: 'fa-cc-jcb',
  }

  constructor(private _ngZone: NgZone) { }

  ngOnInit() {

    const self = this;

    // Init FattMerchant API
    const fattStyle = `background-color: white; width: 100%; height: 22px; border: 1px solid #ced4da; border-radius: 1px; padding: 6px; font: 400 16px Arial`;

    this.fattJs = new FattJs(environment.fattmerchantWebToken, {
      number: {
        id: 'fattjs-number',
        type: 'tel',
        style: fattStyle
      },
      cvv: {
        id: 'fattjs-cvv',
        type: 'tel',
        style: fattStyle
      }
    });

    // tell fattJs to load in the card fields
    this.fattJs.showCardForm().then(handler => {
    }).catch(err => {
      // reinit form
    });

    this.fattJs.on('card_form_complete', (message) => {
      this.cardType = message.cardType;
      // use this complicated way to trigger angular refesh
      setTimeout(() => {
        self._ngZone.run(() => { });
      }, 50);
    });

    this.fattJs.on('card_form_incomplete', (message) => {
      this.cardType = message.cardType;
      setTimeout(() => {
        self._ngZone.run(() => { });
      }, 50);
    });
    this.cardNumberError = '';
  }

  validateCvc() {
    if ((this.fattJs && this.fattJs.validCvv)) {
      this.cvcError = '';
    } else {
      this.cvcError = '* Please input a valid <b>CVC</b> code';
    }
  }

  validateCardNumber() {
    if ((this.fattJs && this.fattJs.validNumber)) {
      this.cardNumberError = '';
      if (this.cardType == 'american_express' && this.excludeAmex) {
        this.cardNumberError = '* America Express is not accepted. Please try a different credit card';
      } else if (this.cardType == 'discover' && this.excludeDiscover) {
        this.cardNumberError = '* Discover is not accepted. Please try a different credit card';
      }
    } else {
      this.cardNumberError = '* Please input a valid <b>Card Number</b>';
    }
  }
  validateMonth() {
    this.monthError = '';
    if (!this.month || !(parseInt(this.month) > 0) || parseInt(this.month) > 12) {
      this.monthError = '* Please input a valid <b>Month</b>, eg. 05';
    }
  }

  validateYear() {
    this.yearError = '';
    if (!this.year || !(this.year.length === 2 || this.year.length === 4)) {
      this.yearError = '* Please input a valid <b>Year</b>, eg. 2025';
    } else {
      if (this.year.length === 2) {
        this.year = '20' + this.year;
      }
      if (!(parseInt(this.year) >= new Date().getFullYear())) {
        this.yearError = '* Please input a valid <b>Year</b>, eg. 2025';
      } else if (!RegExp('^2[0][0-9][0-9]$').test(this.year)) {
        this.yearError = '* Please input a valid <b>Year</b>, eg. 2025';
      }
    }
  }

  validateZipcode() {
    if (this.requireZipcode && (!this.zipcode || this.zipcode.length < 5)) {
      this.zipcodeError = '* Please input a valid <b>ZIP Code</b>';
    } else {
      this.zipcodeError = '';
    }
  }

  validateNames() {
    if (this.requireNames && (!this.names || this.names.trim().split(' ').filter(name => name).length < 2)) {
      this.namesError = '* Please input valid <b>Card Holder Names</b>, eg. John Doe';
    } else {
      this.namesError = '';
    }
  }

  validatePhone() {
    let phoneDigits = (this.phone || '').replace(/\D/g, '');
    if (this.requirePhone && phoneDigits.length !== 10) {
      this.phoneError = '* Please input a valid <b>Phone Number</b>: 10 digits only';
    } else {
      this.phoneError = '';
    }
  }

  getValidationError() {

    for (let field of ['cardNumber', 'cvc', 'month', 'year', 'zipcode', 'names', 'phone']) {
      const validatorName = `validate${field[0].toUpperCase()}${field.substring(1)}`;
      this[validatorName](); // validate

      const errorField = field + 'Error';
      if (this[errorField]) {
        return this[errorField];
      }
    }

    if (new Date(+this.year, +this.month, 1) < new Date()) {
      return `* Your card's year/month is expired`;
    }
  }

  getCreditCard() {

    const card = new CreditCard();
    // card.cardNumber = this.cardNumber;
    // card.cvc = this.cvc;
    // card['brand'] = (this.cardIssuer || '').toLowerCase();
    card.expiryYear = +this.year;
    card.expiryMonth = +this.month;
    card['zipCode'] = this.zipcode;
    const names = (this.names || '').trim().split(' ').filter(n => n);
    card.firstName = names[0];
    card.lastName = names[1];
    card['phone'] = this.phone;

    return card;
  }

  async tokenize(amount) {
    if (this.getValidationError()) {
      return;
    }
    try {
      const card = this.getCreditCard();
      console.log(this.getCreditCard());
      const extraDetails = {
        total: Number(amount.toFixed(2)), // 1$
        firstname: card.firstName,
        lastname: card.lastName,
        // email: overrides.email,
        month: card.expiryMonth.toString(),
        year: card.expiryYear.toString(), // accepts string
        // phone: this.phone || overrides.phone,
        address_state: 'FL', // somehow this is required to tokenize!!!!!
        address_zip: this.zipcode,
        // url: "https://omni.fattmerchant.com/#/bill/",
        method: 'card',
        // validate is optional and can be true or false. 
        // determines whether or not fattmerchant.js does client-side validation.
        // the validation follows the sames rules as the api.
        // check the api documentation for more info:
        // https://fattmerchant.com/api-documentation/
        validate: false,

      };
      // merge passed in fields and remove undefined fields!
      Object.keys(extraDetails).map(key => {
        if ([undefined, null, ''].some(v => extraDetails[key] === v)) {
          delete extraDetails[key];
        }
      });
      const tokenResult = await this.fattJs.tokenize(extraDetails);
      return tokenResult;
    } catch (error) {
      console.log(error);
      const explicitErrors = [];

      // eg. 1 
      // {  code: "logic_error"
      //    field: "year"
      //    key: "errors.invalid"
      //    message: "Year is invalid"
      // }
      explicitErrors.push(error.message);
      Object.values(error).map(value => {
        if (Array.isArray(value)) {
          explicitErrors.push(...value);
        }
      });

      if (explicitErrors.length > 0) {
        throw explicitErrors.join("<br>");
      } else {
        throw "Unable to process your credit card. Please double check your input or call 404-382-9768 to report this error. Thanks.";
      }
    }
  }
}