import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { Address, Restaurant } from '@qmenu/ui';
import { Helper } from '../../../classes/helper';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { PrunedPatchService } from '../../../services/prunedPatch.service';
import { environment } from '../../../../environments/environment';
import { AlertType } from '../../../classes/alert-type';
import { HttpClient } from '@angular/common/http';
import { formatNumber } from '@angular/common';

@Component({
  selector: 'app-restaurant-profile',
  templateUrl: './restaurant-profile.component.html',
  styleUrls: ['./restaurant-profile.component.css']
})
export class RestaurantProfileComponent implements OnInit, OnChanges {
  @Input() restaurant: Restaurant;
  @Input() editable;
  uploadImageError: string;
  editing: boolean = false;
  address: Address;
  apt: string;
  ifShowBasicInformation: boolean = true; //using stretching transformation at  the restaurant profile setting edit page
  ifShowPreferences: boolean = false;
  ifShowFee_MinimumSettings: boolean = false;
  isShowTipSettings: boolean = false;
  ifShowOtherPreferences: boolean = false;
  fields = [
    'name',
    'email',
    'taxRate',
    'surchargeAmount',
    'surchargeRate',
    'surchargeName',
    'pickupTimeEstimate',
    'deliveryTimeEstimate',
    'logo',
    'googleAddress',
    'restaurantId',
    'images',
    'stripeSecretKey',
    'stripePublishableKey',
    'preferredLanguage',
    'pickupMinimum',
    'ccMinimumCharge',
    'disableScheduling',
    'disabled',
    'notification',
    'ccProcessingRate',
    'ccProcessingFlatFee',
    'deliveryBy',
    'domain',
    'skipOrderConfirmation',
    'skipAutoInvoicing',
    'skipImageInjection',
    'hideOrderStatus',
    'hidePrintingCCInfo',
    'disableOrderCancelation', //add a new prperty and it will control whether the restaurant can cancel order.
    'hideOrderReadyEstimate',
    'skipShowTax',
    'menuHoursExtended',
    'notes',
    'insistedPrintCCInfo',
    'comebackDate',
    'serviceSettings'
  ];

  uploadError: string;

  tipSettings = {
    ['Dine-in']: {
      defaultPercentage: undefined,
      defaultAmount: undefined,
      minimumPercentage: undefined,
      minimumAmount: undefined,
      tipHide: false
    },
    'Pickup': {
      defaultPercentage: undefined,
      defaultAmount: undefined,
      minimumPercentage: undefined,
      minimumAmount: undefined,
      tipHide: false
    },
    'Delivery': {
      defaultPercentage: undefined,
      defaultAmount: undefined,
      minimumPercentage: undefined,
      minimumAmount: undefined,
      tipHide: false
    }
  };

  email: string;
  taxRate: number;
  surchargeName;
  surchargeAmount;
  pickupTimeEstimate: number;
  deliveryTimeEstimate: number;
  pickupMinimum: number;
  ccMinimumCharge: number;
  logo: string;
  images: string[] = [];

  ccProcessingRate: number;
  ccProcessingFlatFee: number;
  disableScheduling = false;
  disabled = false;
  googleAddress: Address;
  preferredLanguage;
  selfSignupRegistered;
  notification;

  preferredLanguages = [
    { value: 'ENGLISH', text: 'English' },
    { value: 'CHINESE', text: 'Chinese' }
  ];

  comebackDate = null;
  isComebackDateCorrectlySet = false;
  isTemporarilyDisabled;
  now = new Date().toISOString().split('T')[0];

  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient, private _prunedPatch: PrunedPatchService) {
  }

  ngOnInit() {
    if (this.restaurant.disabled && this.restaurant['comebackDate'] === undefined) {
      this.isTemporarilyDisabled = 'No';
    } else if (this.restaurant.disabled && (this.restaurant['comebackDate'] === null || this.isDate(this.restaurant['comebackDate']))) {
      this.isTemporarilyDisabled = 'Yes';
    }
    this.tipSettingsInit();
  }

  isDate(dateToParse) {
    return !isNaN(Date.parse(dateToParse));
  }

  isDisabledEditable() {
    return this._global.user.roles.some(r => r === 'ADMIN' || r === 'ACCOUNTANT');
  }

  ngOnChanges(params) {
    // console.log(params);
  }

  async selectAddress(address) {
    this.googleAddress = address;
    const addressDetails = await this._api.get(environment.qmenuApiUrl + 'utils/google-address', {
      formatted_address: address.formatted_address
    }).toPromise();
    this.googleAddress.timezone = addressDetails.timezone;
  }

  getMongoDate(mongoId) {
    return new Date(parseInt(mongoId.substring(0, 8), 16) * 1000);
  }

  toggleEditing() {
    this.address = new Address(this.restaurant.googleAddress);
    this.selfSignupRegistered = this.restaurant.selfSignup && this.restaurant.selfSignup.registered;
    this.editing = !this.editing;
    this.fields.map(field => this[field] = this.restaurant[field]);
    this.apt = this.restaurant.googleAddress ? this.restaurant.googleAddress.apt : '';
    this.tipSettingsInit();
    if (this.comebackDate !== undefined) {
      this.comebackDate = this.comebackDate === null ? null : new Date(this.comebackDate) && new Date(this.comebackDate).toISOString().split('T')[0];
    }

    if (this.comebackDate === undefined) {
      this.isTemporarilyDisabled = 'No';
    }

    // special fields
    this.images = this.restaurant.images || [];
    this.preferredLanguage = this.preferredLanguages.filter(z => z.value === (this.restaurant.preferredLanguage || 'ENGLISH'))[0];
  }

  isEmailValid() {
    return !this.email || this.email.match(/\S+@\S+\.\S+/);
  }

  formatAmount(value) {
    if (typeof value !== 'number') {
      return '';
    }
    return value.toFixed(2);
  }

  tipSettingsInit() {
    ['Pickup', 'Delivery', 'Dine-in'].forEach(type => {
      const setting = this.restaurant.serviceSettings.find(x => x.name === type) || {
        name: type,
        paymentMethods: [],
        tipSuggestion: {},
        tipMinimum: {}
      };
      const { tipSuggestion, tipMinimum, tipHide = false } = setting;
      if (tipSuggestion) {
        this.tipSettings[type].defaultPercentage = tipSuggestion.rate;
        this.tipSettings[type].defaultAmount = tipSuggestion.amount;
      }
      if (tipMinimum) {
        this.tipSettings[type].minimumPercentage = tipMinimum.rate;
        this.tipSettings[type].minimumAmount = tipMinimum.amount;
      }
      this.tipSettings[type].tipHide = tipHide;
    });
  }

  toggleTipHide(type, target) {
    this.tipSettings[type]['tipHide'] = !target.checked;
  }

  updateTipSettings(type, key, target) {
    let value = target.value;

    if (value === '') {
      this.tipSettings[type][key] = null;
      return;
    }

    if (key.indexOf('Percentage') >= 0) {
      // percentage have four decimal digits and range in 0-1
      value = Math.min(1, Math.max(0, value));
      target.value = formatNumber(value, 'en_US', '1.0-4');
    }
    if (key.indexOf('Amount') >= 0) {
      // amount have two decimal digit and range in 0-1000
      value = Math.min(1000, Math.max(0, value));
      // we must visibly set input's value here
      // because if user input overflow number multiple times,
      // we save the same maximum value and to angular the value is not changed,
      // so it won't change input's value, that'll cause input show overflow value
      target.value = this.formatAmount(value);
    }
    this.tipSettings[type][key] = value;
  }

  normalizeNumber(value, percent = false) {
    if (typeof value !== 'number') {
      return null;
    }
    return Number(value.toFixed(percent ? 4 : 2));
  }

  ok() {
    const oldObj = { _id: this.restaurant['_id'] } as any;
    const newObj = { _id: this.restaurant['_id'] } as any;
    this.fields.map(field => {
      oldObj[field] = this.restaurant[field];
      newObj[field] = this[field];
    });

    if (this.isTemporarilyDisabled === 'Yes') {
      newObj.comebackDate = newObj.comebackDate === null ? null : new Date(newObj.comebackDate);
    }

    if (this.isTemporarilyDisabled === 'No') {
      delete newObj.comebackDate;
    }

    // tip settings
    newObj.serviceSettings = ['Pickup', 'Delivery', 'Dine-in'].map(type => {
      const setting = this.restaurant.serviceSettings && this.restaurant.serviceSettings.find(x => x.name === type) || {name: type};
      const tip = this.tipSettings[type];
      const newTipSuggestion = {
        amount: this.normalizeNumber(tip.defaultAmount),
        rate: this.normalizeNumber(tip.defaultPercentage, true)
      };
      const newTipMinimum = {
        amount: this.normalizeNumber(tip.minimumAmount),
        rate: this.normalizeNumber(tip.minimumPercentage, true)
      };

      const { tipSuggestion, tipMinimum, tipHide, ...rest } = setting;
      return { ...rest, tipSuggestion: newTipSuggestion, tipMinimum: newTipMinimum, tipHide: tip.tipHide };
    });

    // make sure types are correct!
    newObj.taxRate = +this.taxRate || undefined;
    newObj.surchargeAmount = +this.surchargeAmount || undefined;
    newObj.pickupTimeEstimate = +this.pickupTimeEstimate || undefined;
    newObj.deliveryTimeEstimate = +this.deliveryTimeEstimate || undefined;
    newObj.pickupMinimum = +this.pickupMinimum || undefined;
    newObj.ccMinimumCharge = +this.ccMinimumCharge || undefined;

    if (this.googleAddress) {
      newObj.googleAddress = JSON.parse(JSON.stringify(this.googleAddress));
      newObj.googleAddress.apt = this.apt;
    }

    if (!this.disabled) {
      delete newObj.comebackDate;
    }

    newObj.preferredLanguage = (this.preferredLanguage && this.preferredLanguage.value) || undefined;
    // update those two fields!
    newObj.images = this.images;
    delete oldObj['images'];

    if (this.selfSignupRegistered != undefined) {
      oldObj.selfSignup = {};
      newObj.selfSignup = { registered: this.selfSignupRegistered }
      // newObj.selfSignup.registered = this.selfSignupRegistered
    }

    this._prunedPatch
      .patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
        {
          old: oldObj,
          new: newObj
        }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            'Updated successfully'
          );

          // assign new values to restaurant
          this.fields.map(f => this.restaurant[f] = newObj[f]);
          if (this.restaurant.selfSignup) {
            this.restaurant.selfSignup.registered = this.selfSignupRegistered
          };

          this.editing = false;
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
        }
      );

    this.editing = false;
  }

  cancel() {
    this.ifShowBasicInformation = true;
    this.editing = false;
    this.tipSettingsInit();
  }

  deleteLogo(url) {
    this.logo = undefined;
  }

  deleteImage(url) {
    let index = this.images.indexOf(url);
    if (index >= 0) {
      this.images.splice(index, 1);
    }
  }

  async onUploadImage(event) {
    this.uploadImageError = undefined;
    let files = event.target.files;
    try {
      const data: any = await Helper.uploadImage(files, this._api, this._http);
      if (data && data.Location) {
        this.images.push(data.Location);
      }
    } catch (err) {
      this.uploadImageError = err;
    }

  }

  async onUploadLogo(event) {

    this.uploadImageError = undefined;
    let files = event.target.files;
    try {
      const data: any = await Helper.uploadImage(files, this._api, this._http);

      if (data && data.Location) {
        this.logo = data.Location;
      }
    } catch (err) {
      this.uploadImageError = err;
    }
  }

  setComebackDateAsUnknown() {
    this.comebackDate = null;
    this.isComebackDateCorrectlySet = true;
    setTimeout(() => {
      this.isComebackDateCorrectlySet = false;
    }, 1000);
  }

  disabledHandle() {
    if (this.isTemporarilyDisabled === 'No' || !this.disabled) {
      this.comebackDate = null;
    }

    if (this.isTemporarilyDisabled === 'Yes') {
      this.comebackDate = null;
    }
  }

}
