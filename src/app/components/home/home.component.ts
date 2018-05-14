import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";
import { mergeMap } from "rxjs/operators";
import { CacheService } from "../../services/cache.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  restaurantList = [];
  searchTerm = '';

  selectedRestaurant;

  constructor(private _api: ApiService, private _global: GlobalService, private _cache: CacheService) { }

  ngOnInit() {
    // retrieve restaurant list
    if (this._cache.get('restaurants')) {
      this.restaurantList = this._cache.get('restaurants');
    } else {
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          name: 1,
          alias: 1,
          logo: 1,
          phones: 1,
          disabled: 1,
          googleAddress: 1
        },
        limit: 6000
      })
        .subscribe(
          result => {
            this.restaurantList = result;
            this.restaurantList.sort((r1, r2) => r1.name > r2.name ? 1 : -1);
            this._cache.set('restaurants', this.restaurantList, 3600);
          },
          error => {
            this._global.publishAlert(AlertType.Danger, error);
          }
        );
    }

  }

  getFilteredList() {
    let results = [];
    let limit = 20;
    // Follow those importance
    // 1. empty
    // 2. starts with
    // 3. phones starts with
    // 4. name.indexOf
    // 5. phones indexOf

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (!this.searchTerm) {
        results.push(restaurant);
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant.name.toLowerCase().indexOf(this.searchTerm.toLocaleLowerCase()) === 0)) {
        results.push(restaurant);
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant.phones || []).some(phone => (phone.phoneNumber || '').indexOf(this.searchTerm) === 0)) {
        results.push(restaurant);
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant.name.toLowerCase().indexOf(this.searchTerm.toLocaleLowerCase()) >= 0)) {
        results.push(restaurant);
      }
    }

    for (let i = 0; i < this.restaurantList.length && results.length < limit; i++) {
      const restaurant = this.restaurantList[i];
      if (results.indexOf(restaurant) < 0 && this.searchTerm && (restaurant.phones || []).some(phone => (phone.phoneNumber || '').indexOf(this.searchTerm) >= 0)) {
        results.push(restaurant);
      }
    }

    return results;
  }

  select(restaurant) {
    if (this.selectedRestaurant === restaurant) {
      this.selectedRestaurant = undefined;
      return;
    }
    this.selectedRestaurant = restaurant;
    // let's fill more needed info to this restaurant!
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        _id: { $oid: restaurant._id }
      },
      projection: {
        name: 1,
        images: 1,
        channels: 1,
        people: 1,
        rateSchedules: 1,
        serviceSettings: 1
      },
      limit: 1
    })
      .subscribe(
        results => {
          results.map(r1 => this.restaurantList.map(r2 => {
            if (r1._id === r2._id) {
              Object.assign(r2, r1);
            }
          }))
        },
        error => {
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

}
