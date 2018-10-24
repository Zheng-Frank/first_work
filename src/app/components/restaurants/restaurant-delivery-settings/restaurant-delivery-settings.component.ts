import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-restaurant-delivery-settings',
  templateUrl: './restaurant-delivery-settings.component.html',
  styleUrls: ['./restaurant-delivery-settings.component.css']
})
export class RestaurantDeliverySettingsComponent implements OnInit {
  @Input() restaurant: Restaurant;
  editing: boolean = false;

  deliverySettingsInEditing = [];

  deliveryFrom;
  blockedCities;
  blockedZipCodes;
  deliveryEndMinutesBeforeClosing;

  deliveryFromTimes = [{ value: null, text: 'At business open' }];
  deliveryEndTimes = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
    const t = Date['parseRestaurantDate']('2000-01-01', this.restaurant.offsetToEST);
    // t.setMinutes(t.getMinutes() + 60); // let's start with restaurant's 1AM
    const interval = 30;
    for (let i = 0; i < 24 * 60 / interval; i++) {
      let h = t.getHours();
      let m = t.getMinutes();
      this.deliveryFromTimes.push({ value: new Date(t.getTime()), text: t['restaurant hh:MM a'](this.restaurant.offsetToEST) });
      t.setMinutes(t.getMinutes() + interval);
    }

    this.deliveryEndTimes = [
      { value: 0, text: 'At closing' },
      { value: 15, text: '15 minutes before closing' },
      { value: 30, text: '30 minutes before closing' },
      { value: 45, text: '45 minutes before closing' },
      { value: 60, text: '60 minutes before closing' },
    ];

  }

  toggleEditing() {
    this.blockedZipCodes = (this.restaurant.blockedZipCodes || []).join(',');
    this.blockedCities = (this.restaurant.blockedCities|| []).join(',');
    this.editing = !this.editing;
    this.deliverySettingsInEditing = JSON.parse(JSON.stringify(this.restaurant.deliverySettings || []));
    // put empty settings to make it 4 (hardcoded max)
    for (let i = this.deliverySettingsInEditing.length; i < 5; i++) {
      this.deliverySettingsInEditing.push({});
    }

    // clone the deliveryFromTime from restaurant's original one
    if (this.restaurant.deliveryFromTime) {
      this.deliveryFrom = this.deliveryFromTimes.find(ft => ft.value && (ft.value.valueOf() === this.restaurant.deliveryFromTime.valueOf()));
    }

    this.deliveryEndMinutesBeforeClosing = this.restaurant.deliveryEndMinutesBeforeClosing;

  }
  update() {

    const oldR = JSON.parse(JSON.stringify(this.restaurant));
    const newR = JSON.parse(JSON.stringify(this.restaurant));

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

    if (this.deliveryEndMinutesBeforeClosing || +this.deliveryEndMinutesBeforeClosing===0) {
      newR.deliveryEndMinutesBeforeClosing = +this.deliveryEndMinutesBeforeClosing;
    }     

    newR.blockedCities = this.blockedCities.split(',').map(each=>each.trim()).filter(each=>each);       
    newR.blockedZipCodes = this.blockedZipCodes.split(',').map(each=>each.trim()).filter(each=>each);


    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: oldR,
          new: newR
        }])
      .subscribe(
        result => {
          this.restaurant.deliverySettings= newR.deliverySettings;
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
    this.restaurant.taxOnDelivery = !this.restaurant.taxOnDelivery;
  }

  getDeliveryFromString() {
    if (this.restaurant.deliveryFromTime) {
      const colonedStartTime = new Date(this.restaurant.deliveryFromTime.getTime());
      colonedStartTime.setHours(colonedStartTime.getHours() + (this.restaurant.offsetToEST || 0));
      for (const t of this.deliveryFromTimes) {
        if (t.value.valueOf() === colonedStartTime.valueOf()) {
          return t.text;
        }
      }
    }
    return 'At opening';
  }

  getDeliveryEndString() {
    for (const c of this.deliveryEndTimes) {
      if (c.value === this.restaurant.deliveryEndMinutesBeforeClosing || 0) {
        return c.text;
      }
    }
    return '';
  }
}

