import { Component, OnInit, Input, ViewChild, OnChanges } from '@angular/core';
import { Restaurant, Address } from '@qmenu/ui';
import { SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from '../../../classes/helper';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { PrunedPatchService } from '../../../services/prunedPatch.service';
import { TimezoneService } from "../../../services/timezone.service";
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-restaurant-profile',
  templateUrl: './restaurant-profile.component.html',
  styleUrls: ['./restaurant-profile.component.css']
})
export class RestaurantProfileComponent implements OnInit, OnChanges {
  @Input() restaurant: Restaurant;
  @Input() editable ;
  uploadImageError: string;
  editing: boolean = false;
  address: Address;
  apt: string;

  fields = [
    'salesAgent',
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
    'hideTipInput',
    'hidePrintingCCInfo',
    'skipShowTax',
    'menuHoursExtended',
    'notes',
    'insistedPrintCCInfo'

  ];

  uploadError: string;

  email: string;
  taxRate: number;
  surchargeName;
  surchargeAmount;
  pickupTimeEstimate: number;
  deliveryTimeEstimate: number;
  pickupMinimum: number;
  logo: string;
  images: string[] = [];

  ccProcessingRate: number;
  ccProcessingFlatFee: number;
  disableScheduling = false;
  disabled = false;
  googleAddress: Address;
  preferredLanguage;

  notification;

  preferredLanguages = [
    { value: 'ENGLISH', text: 'English' },
    { value: 'CHINESE', text: 'Chinese' }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient, private _prunedPatch: PrunedPatchService, public _timezone: TimezoneService) { }

  ngOnInit() {
  }

  isAdmin(){
    return this._global.user.roles.some(r => r ==='ADMIN');
  }

  ngOnChanges(params) {
    // console.log(params);
  }

  async selectAddress(address) {
    this.googleAddress = address;
    const addressDetails = await this._api.get(environment.qmenuApiUrl + "utils/google-address", {
      formatted_address: address.formatted_address
    }).toPromise();
    this.googleAddress.timezone = addressDetails.timezone;
  }

  getMongoDate(mongoId) {
    return new Date(parseInt(mongoId.substring(0, 8), 16) * 1000);
  }

  toggleEditing() {
    this.address = new Address(this.restaurant.googleAddress);
    this.editing = !this.editing;
    this.fields.map(field => this[field] = this.restaurant[field]);
    this.apt = this.restaurant.googleAddress ? this.restaurant.googleAddress.apt : '';

    // special fields
    this.images = this.restaurant.images || [];
    this.preferredLanguage = this.preferredLanguages.filter(z => z.value === (this.restaurant.preferredLanguage || 'ENGLISH'))[0];
  }

  isEmailValid() {
    return !this.email || this.email.match(/\S+@\S+\.\S+/);
  }

  ok() {
    const oldObj = { _id: this.restaurant['_id'] };
    const newObj = { _id: this.restaurant['_id'] } as any;
    this.fields.map(field => {
      oldObj[field] = this.restaurant[field];
      newObj[field] = this[field];
    });

    // make sure types are correct!
    newObj.taxRate = +this.taxRate || undefined;
    newObj.surchargeAmount = +this.surchargeAmount || undefined;
    newObj.pickupTimeEstimate = +this.pickupTimeEstimate || undefined;
    newObj.deliveryTimeEstimate = +this.deliveryTimeEstimate || undefined;
    newObj.pickupMinimum = +this.pickupMinimum || undefined;
    if (this.googleAddress) {
      newObj.googleAddress = JSON.parse(JSON.stringify(this.googleAddress));
      newObj.googleAddress.apt = this.apt;
    }

    newObj.preferredLanguage = (this.preferredLanguage && this.preferredLanguage.value) || undefined;
    // update those two fields!
    newObj.images = this.images;
    delete oldObj['images'];

    this._prunedPatch
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: oldObj,
          new: newObj
        }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );

          // assign new values to restaurant
          this.fields.map(f => this.restaurant[f] = newObj[f]);

          this.editing = false;
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

    this.editing = false;
  }

  cancel() {
    this.editing = false;
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
    }
    catch (err) {
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
    }
    catch (err) {
      this.uploadImageError = err;
    }
  }
}
