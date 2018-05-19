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

  editing: boolean = false;

  email: string;
  taxRate: number;
  surchargeName;
  surchargeAmount;
  pickupTimeEstimate: number;
  deliveryTimeEstimate: number;
  logo: string;
  images: string[] = [];
  uploadImageError: string;
  uploadLogoError: string;
  stripeSecretKey: string;
  stripePublishableKey: string;
  ccProcessingRate: number;
  ccProcessingFlatFee:number;
  excludeAmex;
  requireZipcode;
  allowScheduling = true;
  timeZone;
  notification;
  timeZones = [
    { value: 0, text: 'Eastern Time (GMT -5:00)' },
    { value: -1, text: 'Central Time (GMT -6:00)' },
    { value: -2, text: 'Mountain Time (GMT -7:00)' },
    { value: -3, text: 'Pacific Time (GMT -8:00)' },
    { value: -4, text: 'Alaska (GMT -9:00)' },
    { value: -5, text: 'Hawaii (GMT -10:00)' }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  toggleEditing() {
    this.editing = !this.editing;

    this.email = this.restaurant.email;
    this.taxRate = this.restaurant.taxRate;
    this.surchargeAmount = this.restaurant.surchargeAmount;
    this.surchargeName = this.restaurant.surchargeName;
    this.pickupTimeEstimate = this.restaurant.pickupTimeEstimate;
    this.deliveryTimeEstimate = this.restaurant.deliveryTimeEstimate;
    
    this.logo = this.restaurant.logo;
    this.images = this.restaurant.images || [];
    this.excludeAmex = this.restaurant.excludeAmex;
    this.requireZipcode = this.restaurant.requireZipcode;
    this.allowScheduling = !this.restaurant.disableScheduling;
    this.timeZone = this.timeZones.find(z => z.value === (this.restaurant.offsetToEST || 0));
    this.notification = this.restaurant.notification;
    this.ccProcessingRate = this.restaurant.ccProcessingRate;
    this.ccProcessingFlatFee = this.restaurant.ccProcessingFlatFee;

    this.stripeSecretKey = this.restaurant.stripeSecretKey;
    this.stripePublishableKey = this.restaurant.stripePublishableKey;
  }
  isEmailValid() {
    return !this.email || this.email.match(/\S+@\S+\.\S+/);
  }

  ok() {
    this.restaurant.email = this.email;
    this.restaurant.taxRate = +this.taxRate;
    this.restaurant.surchargeAmount = +this.surchargeAmount;
    this.restaurant.surchargeName = this.surchargeName;
    this.restaurant.pickupTimeEstimate = +this.pickupTimeEstimate;
    this.restaurant.deliveryTimeEstimate = +this.deliveryTimeEstimate;

    this.restaurant.logo = this.logo;
    this.restaurant.images = this.images;
    this.restaurant.stripeSecretKey = this.stripeSecretKey;
    this.restaurant.stripePublishableKey = this.stripePublishableKey;
    this.restaurant.offsetToEST = (this.timeZone && this.timeZone.value) || 0;
    this.restaurant.disableScheduling = !this.allowScheduling;
    this.restaurant.notification = this.notification;

    this.restaurant.ccProcessingRate = this.ccProcessingRate;
    this.restaurant.ccProcessingFlatFee = this.ccProcessingFlatFee;

    // update those two fields!
    // this._controller.updateRestaurant(this.restaurant);
    this.editing = false;
  }

  cancel() {
    this.editing = false;
  }

  // logo related
  onUploadLogo(event) {
    this.uploadLogoError = undefined;
    let files = event.target.files;
    Helper.uploadImage('', '', files, (err, data) => {
      if (err) {
        this.uploadLogoError = err;
      } else if (data && data.Location) {
        this.logo = data.Location;
      }
    });
  }

  deleteLogo(url) {
    this.logo = undefined;
  }

  // images related
  onUploadImage(event) {
    this.uploadImageError = undefined;
    let files = event.target.files;
    Helper.uploadImage('', '', files, (err, data) => {
      if (err) {
        this.uploadImageError = err;
      } else if (data && data.Location) {
        this.images.push(data.Location);
      }
    });
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
