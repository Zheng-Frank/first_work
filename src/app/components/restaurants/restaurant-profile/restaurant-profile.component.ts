import { Component, OnInit, Input, ViewChild, OnChanges } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from '../../../classes/helper';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-restaurant-profile',
  templateUrl: './restaurant-profile.component.html',
  styleUrls: ['./restaurant-profile.component.css']
})
export class RestaurantProfileComponent implements OnInit {
  @Input() restaurant: Restaurant;
  uploadImageError: string;
  editing: boolean = false;
  address;

  fields = [
    'email',
    'taxRate',
    'surchargeAmount',
    'surchargeName',
    'pickupTimeEstimate',
    'deliveryTimeEstimate',
    'logo',
    'googleAddress',
    'restaurantId',
    'images',
    'stripeSecretKey',
    'stripePublishableKey',
    'offsetToEST',
    'preferredLanguage',
    'pickupMinimum',
    'disableScheduling',
    'notification',
    'ccProcessingRate',
    'ccProcessingFlatFee',
    'deliveryBy',
    'domain'
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
  timeZone;
  preferredLanguage;

  notification;
  timeZones = [
    { value: 0, text: 'Eastern Time (GMT -5:00)' },
    { value: -1, text: 'Central Time (GMT -6:00)' },
    { value: -2, text: 'Mountain Time (GMT -7:00)' },
    { value: -3, text: 'Pacific Time (GMT -8:00)' },
    { value: -4, text: 'Alaska (GMT -9:00)' },
    { value: -5, text: 'Hawaii (GMT -10:00)' }
  ];

  preferredLanguages = [
    { value: 'ENGLISH', text: 'English' },
    { value: 'CHINESE', text: 'Chinese' }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  selectAddress(address) {
    this.address = address;
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.fields.map(field => this[field] = this.restaurant[field]);

    // special fields
    this.images = this.restaurant.images || [];
    this.timeZone = this.timeZones.filter(z => z.value === (this.restaurant.offsetToEST || 0))[0];
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
    newObj.googleAddress = this.address;

    newObj.offsetToEST = (this.timeZone && this.timeZone.value) || 0;
    newObj.preferredLanguage = (this.preferredLanguage && this.preferredLanguage.value) || undefined;
    // update those two fields!
    this._api
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

  // upload logo or image

  async onUpload(event, type) {

    this.uploadImageError = undefined;
    let files = event.target.files;
    try {
        const data: any = await Helper.uploadImage(files, this._api);

        if (data && data.Location) {
          this.images = this.images || [];
          this.images.push(data.Location);
        }
    }
    catch (err) {
        this.uploadImageError = err;
    }

    
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


  getTimeZoneText() {
    for (const t of this.timeZones) {
      if (t.value === (this.restaurant.offsetToEST || 0)) {
        return t.text;
      }
    }
    return 'N/A';
  }
}
