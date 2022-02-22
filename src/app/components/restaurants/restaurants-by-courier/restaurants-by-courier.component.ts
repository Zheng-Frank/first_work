import {Helper} from '../../../classes/helper';
import {environment} from 'src/environments/environment';
import {ApiService} from 'src/app/services/api.service';
import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-restaurants-by-courier',
  templateUrl: './restaurants-by-courier.component.html',
  styleUrls: ['./restaurants-by-courier.component.css']
})
export class RestaurantsByCourierComponent implements OnInit {

  couriers = [];
  courier = 'Postmates';
  deliveryStatus = '';
  timezone = 'All'
  restaurants = [];
  timezones = [];
  filteredRestaurants = [];

  restaurantsColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'], // the paths property is used to make the colunm sortable.
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Courier",
    },
    {
      label: "ON/OFF",
    },
    {
      label: "Time Zone",
    },
    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    }
  ];

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.populateRestaurantListByCourier();
  }

  deliveryStatusLabel(settings) {
    let enabled = settings && settings.some(e => e.name === 'Delivery' && e.paymentMethods && e.paymentMethods.length > 0);
    return enabled ? 'ON' : 'OFF'
  }

  async populateRestaurantListByCourier() {
    this.couriers = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "courier",
      projection: { name: 1 },
    }, 1000);
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { disabled: { $ne: true }, "googleAddress.formatted_address": { $exists: true } },
      projection: {
        _id: 1,
        "googleAddress.formatted_address": 1,
        name: 1,
        courier: 1,
        score: 1,
        deliveryClosedHours: 1,
        deliverySettings: 1,
        serviceSettings: 1
      },
    }, 5000);
    this.restaurants = this.parseRestaurants(this.restaurants).filter(each => (each.courier && each.courier.name) || (!each.courier && each.deliverySettings && each.deliverySettings.length > 0));
    this.timezones = Array.from(new Set(this.restaurants.map(rt => rt.timeZone)))
    this.filteredRestaurants = this.restaurants;
    this.filter();
  }

  parseRestaurants(restaurants) {
    return restaurants.map(each => ({
      restaurantId: each._id,
      name: each.name,
      address: each.googleAddress.formatted_address,
      score: each.score,
      timeZone: Helper.getTimeZone(each.googleAddress.formatted_address),
      courier: each.courier,
      deliveryClosedHours: each.deliveryClosedHours,
      deliverySettings: each.deliverySettings,
      serviceSettings: each.serviceSettings
    }));
  }

  filter() {
    let list = this.restaurants;
    switch (this.courier) {
      case 'All':
        break;
      case 'Postmates':
        list = list.filter(each => each.courier && each.courier.name && each.courier.name === 'Postmates');
        break;
      case 'Self delivery':
        list = list.filter(each => !each.courier && each.deliverySettings && each.deliverySettings.length > 0);
        break;
      default:
        list = list.filter(each => each.courier && each.courier.name && each.courier.name === this.courier);
        break;
    }
    if (this.deliveryStatus) {
      list = list.filter(rt => this.deliveryStatusLabel(rt.serviceSettings) === this.deliveryStatus)
    }
    if (this.timezone !== 'All') {
      list = list.filter(rt => rt.timeZone === this.timezone);
    }

    this.filteredRestaurants = list
  }
}
