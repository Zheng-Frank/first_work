import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-restaurant-service-settings',
  templateUrl: './restaurant-service-settings.component.html',
  styleUrls: ['./restaurant-service-settings.component.css']
})
export class RestaurantServiceSettingsComponent implements OnInit {
  @Input() restaurant: Restaurant;
  editing = false;

  serviceTypes = ['Pickup', 'Delivery', 'Dine-in'];

  paymentDescriptionMap = {
    'CASH': 'Cash',
    'IN_PERSON': 'Credit card: swipe in-person',
    'QMENU': 'Credit card: let qMenu collect on behalf of restaurant',
    'KEY_IN': 'Credit card: send numbers to restaurant for key-in',
    'STRIPE': 'Credit card: deposit to restaurant\'s Stripe account directly'
  };

  serviceSettingsInEditing = [];
  excludeAmex = false;
  excludeDiscover = false;
  requireZipcode = false;
  requireBillingAddress = false;
  taxBeforePromotion = false;
  ccProcessor;

  stripePublishableKey;
  stripeSecretKey;

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPacth: PrunedPatchService) {
  }

  getExcludedPaymentString() {
    return [this.restaurant.requireZipcode ? 'Zip code is required' : '', this.restaurant.requireBillingAddress ? 'Billing address is required' : '', this.restaurant.excludeAmex ? 'No American Express' : '', this.restaurant.excludeDiscover ? 'No Discover' : ''].filter(s => s).join(', ');
  }

  getServies() {
    return this.serviceTypes.map(key => (this.restaurant.serviceSettings || {})[key] || {});
  }

  getCurrentServices() {
    return this.serviceTypes.filter(service => this.restaurant.serviceSettings && this.restaurant.serviceSettings[service]);
  }

  getPaymentMethods() {
    return Object.keys(this.paymentDescriptionMap);
  }

  ngOnInit() {
  }

  isServiceEnabled(service) {
    return service && service.paymentMethods && service.paymentMethods.length > 0;
  }

  toggleService(service) {
    if (this.isServiceEnabled(service)) {
      // toggle off: save current to backup, reset paymentMethods
      service.paymentMethodsBackup = service.paymentMethods;
      service.paymentMethods = [];
    } else {
      // turn on: retrieve
      service.paymentMethods = service.paymentMethodsBackup || [];
      service.paymentMethodsBackup = undefined;
    }
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.excludeAmex = this.restaurant.excludeAmex;
    this.excludeDiscover = this.restaurant.excludeDiscover;
    this.taxBeforePromotion = this.restaurant.taxBeforePromotion;
    this.ccProcessor = this.restaurant['ccProcessor'];
    this.requireZipcode = this.restaurant.requireZipcode;
    this.requireBillingAddress = this.restaurant.requireBillingAddress;
    this.stripePublishableKey = this.restaurant.stripePublishableKey;
    this.stripeSecretKey = this.restaurant.stripeSecretKey;

    this.serviceSettingsInEditing = JSON.parse(JSON.stringify(this.restaurant.serviceSettings || []));
    // make sure it has all service types
    this.serviceTypes.map(st => {
      if (!this.serviceSettingsInEditing.some(serviceSetting => (serviceSetting.name ? serviceSetting.name : '') === st)) {
        this.serviceSettingsInEditing.push({ name: st, paymentMethods: [] });
      }
    });
  }

  isPaymentMethodSelected(service, paymentMethod) {
    return (service.paymentMethods || []).some(pt => pt === paymentMethod);
  }

  servicePaymentMethodChange(service, paymentMethod) {
    service.paymentMethods = service.paymentMethods || [];
    if (this.isPaymentMethodSelected(service, paymentMethod)) {
      service.paymentMethods.splice(service.paymentMethods.indexOf(paymentMethod), 1);
    } else {
      service.paymentMethods.push(paymentMethod);
      // also remove mutually exclusive payment types!
      const mutexTypes = ['QMENU', 'KEY_IN', 'STRIPE', 'IN_PERSON'];
      if (mutexTypes.indexOf(paymentMethod) >= 0) {
        mutexTypes.filter(mt => mt !== paymentMethod).map(type => {
          if (service.paymentMethods.indexOf(type) >= 0) {
            service.paymentMethods.splice(service.paymentMethods.indexOf(type), 1);
          }
        });
      }
    }
  }

  update() {

    const oldR = JSON.parse(JSON.stringify(this.restaurant));
    const newR = JSON.parse(JSON.stringify(this.restaurant));

    newR.serviceSettings = this.serviceSettingsInEditing;
    newR.excludeAmex = this.excludeAmex;
    newR.excludeDiscover = this.excludeDiscover;
    newR.taxBeforePromotion = this.taxBeforePromotion;
    newR.ccProcessor = this.ccProcessor ? this.ccProcessor : undefined;
    newR.requireZipcode = this.requireZipcode;
    newR.requireBillingAddress = this.requireBillingAddress;
    newR.stripePublishableKey = (this.stripePublishableKey || '').trim();
    newR.stripeSecretKey = (this.stripeSecretKey || '').trim();

    this._prunedPacth
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: oldR,
          new: newR
        }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );

          this.restaurant.serviceSettings = this.serviceSettingsInEditing;
          this.restaurant.excludeAmex = this.excludeAmex;
          this.restaurant.excludeDiscover = this.excludeDiscover;
          this.restaurant.taxBeforePromotion = this.taxBeforePromotion;
          this.restaurant['ccProcessor'] = this.ccProcessor;
          this.restaurant.requireZipcode = this.requireZipcode;
          this.restaurant.requireBillingAddress = this.requireBillingAddress;
          this.restaurant.stripePublishableKey = this.stripePublishableKey;
          this.restaurant.stripeSecretKey = this.stripeSecretKey;

          this.editing = false;
          this.serviceSettingsInEditing = [];
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

  }

  toggleDiscover() {
    this.excludeDiscover = !this.excludeDiscover;
  }

  toggleAmex() {
    this.excludeAmex = !this.excludeAmex;
  }

  toggleZipcode() {
    this.requireZipcode = !this.requireZipcode;
  }

  toggleBillingAddress() {
    this.requireBillingAddress = !this.requireBillingAddress;
  }

  toggleTaxBeforePromotion() {
    this.taxBeforePromotion = !this.taxBeforePromotion;
  }

  shouldShowStripeInput() {
    return this.serviceSettingsInEditing.some(service => (service.paymentMethods || []).some(pt => pt === 'STRIPE'));
  }

  async syncGmbServiceSettings() {
    try {
      await this._api.post(environment.appApiUrl + "gmb/generic", {
        name: "sync-one-rt",
        payload: {
          "rtId": this.restaurant._id,
          categories: ['SERVICE_SETTINGS'],
          forceRecent: true,
          syncDisabled: true
        }
      }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Synced');
    }
    catch (error) {
      console.error(`Error. Couldn't sync GMB`, error);
      return false;
    }
  }
}

