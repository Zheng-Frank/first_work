import { Component, OnInit, Input } from '@angular/core';
import {Restaurant, Hour, TimezoneHelper} from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-restaurant-delivery-settings',
  templateUrl: './restaurant-delivery-settings.component.html',
  styleUrls: ['./restaurant-delivery-settings.component.css']
})
export class RestaurantDeliverySettingsComponent implements OnInit {
  @Input() restaurant: Restaurant;
  editing: boolean = false;
  clickedAddHour = false;

  deliverySettingsInEditing = [];
  taxOnDelivery;
  deliveryFrom;
  blockedCities;
  blockedZipCodes;
  allowedCities;
  allowedZipCodes;
  deliveryEndMinutesBeforeClosing;
  deliveryArea;
  deliveryHours = [];

  deliveryFromTimes = [{ value: null, text: 'At business open' }];
  deliveryEndTimes = [];

  selectedCourier;
  couriers: any = [{ name: "Self delivery" }];

  postmatesAvailability;
  firstNotifications = true;
  secondNotifications = true;
  checkingPostmatesAvailability = false;
  async checkPostmatesAvailability() {
    this.checkingPostmatesAvailability = true;
    try {
      await this._api.post(environment.appApiUrl + 'delivery/check-service-availability', {
        "address": this.restaurant.googleAddress.formatted_address,
        courier: {
          ...this.selectedCourier
        }
      }).toPromise();
      this.postmatesAvailability = "available";
    } catch (error) {
      console.log(error);
      this.postmatesAvailability = "not available";
    }
    this.checkingPostmatesAvailability = false;
  }

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) {
    // populate couriers
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "courier",
      projection: { name: 1 },
      limit: 1000000,
      sort: { name: 1 }
    }).subscribe(result => this.couriers.push(...result));

  }

  ngOnInit() {
    const t = TimezoneHelper.parse('2000-01-01', this.restaurant.googleAddress.timezone);
    // t.setMinutes(t.getMinutes() + 60); // let's start with restaurant's 1AM
    const interval = 30;
    for (let i = 0; i < 24 * 60 / interval; i++) {
      this.deliveryFromTimes.push({
        value: new Date(t.getTime()),
        text: t.toLocaleString('en-US', {hour: '2-digit', minute: '2-digit', timeZone: this.restaurant.googleAddress.timezone})
      });
      t.setMinutes(t.getMinutes() + interval);
    }

    this.deliveryEndTimes = [
      { value: 0, text: 'At closing' },
      { value: 15, text: '15 minutes before closing' },
      { value: 30, text: '30 minutes before closing' },
      { value: 45, text: '45 minutes before closing' },
      { value: 60, text: '60 minutes before closing' },
      { value: 90, text: '90 minutes before closing' },
      { value: 120, text: '120 minutes before closing' },
      { value: 180, text: '180 minutes before closing' },
      { value: 240, text: '240 minutes before closing' },
    ];
  }

  toggleEditing() {
    this.blockedZipCodes = (this.restaurant.blockedZipCodes || []).join(',');
    this.blockedCities = (this.restaurant.blockedCities || []).join(',');
    this.allowedZipCodes = (this.restaurant.allowedZipCodes || []).join(',');
    this.allowedCities = (this.restaurant.allowedCities || []).join(',');
    this.deliveryArea = this.restaurant.deliveryArea;
    this.taxOnDelivery = this.restaurant.taxOnDelivery;
    this.firstNotifications = !this.restaurant["muteFirstNotifications"];
    this.secondNotifications = !this.restaurant["muteSecondNotifications"];

    if (this.restaurant.deliveryHours) {
      this.deliveryHours = this.restaurant.deliveryHours.map(h => new Hour(h));
    }
    this.editing = !this.editing;
    this.deliverySettingsInEditing = JSON.parse(JSON.stringify(this.restaurant.deliverySettings || []));
    // put empty settings to make it 8 (hardcoded max)
    for (let i = this.deliverySettingsInEditing.length; i < 9; i++) {
      this.deliverySettingsInEditing.push({});
    }

    // clone the deliveryFromTime from restaurant's original one
    if (this.restaurant.deliveryFromTime) {
      this.deliveryFrom = this.deliveryFromTimes.find(ft => ft.value && (ft.value.valueOf() === this.restaurant.deliveryFromTime.valueOf()));
    }

    this.deliveryEndMinutesBeforeClosing = this.restaurant.deliveryEndMinutesBeforeClosing;
    this.selectedCourier = this.restaurant.courier ? this.couriers.filter(c => c._id === this.restaurant.courier._id)[0] : this.couriers[0];
  }

  deliveryAndNotQMenuCollect(c) {
    // this.restaurant.courier.name.toLowerCase() === 'postmates'


    // If we return true, the option is disabled. If we return false, the option is enabled

    // For the delivery setting: if the payment method is not 1 item which is equal to QMENU, then only self delivery is allowed

    // Isolate the delivery setting



    if (c === 'Self delivery') {
      return false
    }
    let deliverySetting;

    this.restaurant.serviceSettings.forEach(s => {
      if (s.name.toLowerCase() === 'delivery') {
        deliverySetting = s.paymentMethods
      }
    })
    if (!deliverySetting) {
      console.log("NO DELIVERY SETTING")
      return false
    }
    if (deliverySetting.length !== 1 || deliverySetting[0] !== 'QMENU') {
      console.log("ENTERED LENGTH CONDITION")
      return true
    }

    // THERE IS ONLY 1 DELIVERY SETTING AND ITS QMENU. THEREFORE EVERYTHING IS ALLOWED
    return false
  }


  update() {

    const oldR: any = { _id: this.restaurant.id };
    const newR: any = { _id: this.restaurant.id };

    this.deliverySettingsInEditing = this.deliverySettingsInEditing.filter(ds => ds.distance);
    // make sure everything is number!
    newR.deliverySettings = this.deliverySettingsInEditing.map(ds => ({
      distance: +ds.distance ? +ds.distance : 0,
      orderMinimum: +ds.orderMinimum ? +ds.orderMinimum : 0,
      charge: +ds.charge ? +ds.charge : 0,
    }));
    // sort
    newR.deliverySettings.sort((a, b) => a.distance - b.distance);

    // get delivery start time!
    if (this.deliveryFrom) {
      newR.deliveryFromTime = this.deliveryFrom.value && new Date(this.deliveryFrom.value.getTime());
    }

    if (this.deliveryEndMinutesBeforeClosing || +this.deliveryEndMinutesBeforeClosing === 0) {
      newR.deliveryEndMinutesBeforeClosing = +this.deliveryEndMinutesBeforeClosing;
    }

    newR.blockedCities = this.blockedCities.split(',').map(each => each.trim()).filter(each => each);
    newR.blockedZipCodes = this.blockedZipCodes.split(',').map(each => each.trim()).filter(each => each);
    newR.allowedCities = this.allowedCities.split(',').map(each => each.trim()).filter(each => each);
    newR.allowedZipCodes = this.allowedZipCodes.split(',').map(each => each.trim()).filter(each => each);
    newR.deliveryHours = this.deliveryHours;
    newR.deliveryArea = this.deliveryArea;
    newR.taxOnDelivery = this.taxOnDelivery;
    newR.muteFirstNotifications = !this.firstNotifications;
    newR.muteSecondNotifications = !this.secondNotifications;

    if (this.selectedCourier._id) {
      newR.courier = this.selectedCourier;
    }

    console.log("selected", this.selectedCourier);
    console.log(newR.courier);
    const caredFields = [
      "allowedCities",
      "allowedZipCodes",
      "blockedCities",
      "blockedZipCodes",
      "courier",
      "deliveryArea",
      "deliveryEndMinutesBeforeClosing",
      "deliveryFrom",
      "deliveryHours",
      "deliverySettings",
      "taxOnDelivery",
      "muteFirstNotifications",
      "muteSecondNotifications"
    ];

    // making sure oldR has ALL cared fields and if no value for newR, delete it
    caredFields.map(field => {
      oldR[field] = this.restaurant[field];
      if ((!newR[field] && newR[field] != false) || newR[field].length === 0) {
        delete newR[field];
      }
    });

    console.log(oldR, newR);
    this._prunedPatch
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: oldR,
          new: newR
        }])
      .subscribe(
        result => {
          caredFields.map(field => {
            if (newR[field] !== oldR[field]) {
              this.restaurant[field] = newR[field];
              if (field === "deliveryHours") {
                this.restaurant.deliveryHours = (newR.deliveryHours || []).map(h => new Hour(h));
              }
            }
          });
          // let's update original, assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );

        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

    this.editing = false;
    this.deliverySettingsInEditing = [];
  }

  toggleTaxOnDelivery() {
    this.taxOnDelivery = !this.taxOnDelivery;
  }

  toggleFirstNotifications() {
    this.firstNotifications = !this.firstNotifications;
  }

  toggleSecondNotifications() {
    this.secondNotifications = !this.secondNotifications;
  }

  getDeliveryEndString() {
    for (const c of this.deliveryEndTimes) {
      if (c.value === this.restaurant.deliveryEndMinutesBeforeClosing || 0) {
        return c.text;
      }
    }
    return '';
  }

  doneAddingHour(hours: Hour[]) {

    hours.forEach(h => {
      // only add non-duplicated ones
      if ((this.deliveryHours || []).filter(hh => h.equals(hh)).length === 0) {
        this.deliveryHours.push(h);
      }
    });
    // sort!
    this.deliveryHours.sort((a, b) => a.fromTime.valueOf() - b.fromTime.valueOf());
    this.clickedAddHour = false;
  }

  deleteHour(hour) {
    this.deliveryHours = this.deliveryHours.filter(h => h !== hour);
  }

}

