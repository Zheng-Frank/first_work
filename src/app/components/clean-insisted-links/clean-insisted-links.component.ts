import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../services/api.service";
import { GlobalService } from "../../services/global.service";
import {environment} from "../../../environments/environment";
import {AlertType} from "../../classes/alert-type";
import {Helper} from "../../classes/helper";

@Component({
  selector: 'app-clean-insisted-links',
  templateUrl: './clean-insisted-links.component.html',
  styleUrls: ['./clean-insisted-links.component.css']
})
export class CleanInsistedLinksComponent implements OnInit {
  rows = [];

  myColumnDescriptors = [
    {
      label: "Name",
      paths: ['name'],
      sort: (a, b) => new Date(a || 0) > new Date(b || 0) ? 1 : -1,
    },
    {
      label: "Insisted Setting",
      paths: ['sortWeight'],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
    },
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.loadRestaurants();
  }

  async loadRestaurants() {
    const allRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      query: { disabled: { $ne: true }},
      projection: {
        _id: 1,
        disabled: 1,
        googleAddress: 1,
        name: 1,
        web: 1,
      },
    }, 10000);

    this.rows = allRestaurants
      .filter(restaurant =>
        restaurant.web && restaurant.web.useBizWebsite ||
        restaurant.web && restaurant.web.useBizMenuUrl ||
        restaurant.web && restaurant.web.useBizOrderAheadUrl ||
        restaurant.web && restaurant.web.useBizReservationUrl
      )
      .map(restaurant => {
        restaurant.sortWeight = 0;

        if (restaurant.web && restaurant.web.useBizWebsite) {
          restaurant.sortWeight += 1;
        }
        if (restaurant.web && restaurant.web.useBizMenuUrl) {
          restaurant.sortWeight += 1;
        }

        if (restaurant.web && restaurant.web.useBizOrderAheadUrl) {
          restaurant.sortWeight += 1;
        }

        if (restaurant.web && restaurant.web.useBizReservationUrl) {
          restaurant.sortWeight += 1;
        }

        return restaurant;
      })
      .sort((a, b) => a.sortWeight > b.sortWeight ? -1 : (a.sortWeight < b.sortWeight ? 1 : 0));
  }

  async onEdit(event, restaurant, field: string) {
    const web = restaurant.web || {};
    const oldValue = JSON.parse(JSON.stringify(web[field] || {}));
    const newValue = (event.newValue || '').trim();

    if (newValue) {
      try {
        await this._api.get(environment.appApiUrl + 'utils/check-url?url=' + newValue).toPromise();
      } catch (e) {
        console.log(e);
        this._global.publishAlert(AlertType.Danger, 'Error: Please enter a valid website URL');
        return;
      }
    }
    try {
      web[field] = newValue;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: restaurant._id, web: {[field] : oldValue} },
        new: { _id: restaurant._id, web: {[field] : newValue} }
      }]).toPromise();

      restaurant.web = web;

      this._global.publishAlert(AlertType.Success, 'Updated');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }

  async toggle(event, restaurant, field) {
    try {
      const web = restaurant.web || {};
      const oldValue = JSON.parse(JSON.stringify(web[field] || {}));
      const newValue = event.target.checked;
      web[field] = newValue;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: restaurant._id, web: {[field]: oldValue} },
        new: { _id: restaurant._id, web: {[field]: newValue} }
      }]).toPromise();

      restaurant.web = web;

      this._global.publishAlert(AlertType.Success, 'Updated');

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }

}
