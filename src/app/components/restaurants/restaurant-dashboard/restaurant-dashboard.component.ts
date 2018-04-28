import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { mergeMap } from "rxjs/operators";
@Component({
  selector: "app-restaurant-dashboard",
  templateUrl: "./restaurant-dashboard.component.html",
  styleUrls: ["./restaurant-dashboard.component.scss"]
})
export class RestaurantDashboardComponent implements OnInit {

  currentAction; // CRAWL, REMOVE, ADD

  requesting = false;

  crawUrl;
  removeAlias;

  phoneFilter: string;
  nameFilter: string;
  restaurantList = [];

  newRestaurant = {
    googleAddress: {}
  };

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    // retrieve restaurant list
    this._api.get(environment.qmenuApiUrl + "generic2", {
      resource: "restaurant",
      projection: {
        name: 1,
        alias: 1,
        logo: 1,
        phones: 1,
        disabled: 1
      },
      limit: 6000
    })
      .subscribe(
        result => {
          this.restaurantList = result;
          this.restaurantList.sort((r1, r2) => r1.name > r2.name ? 1 : -1);
        },
        error => {
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  setAction(action) {
    this.currentAction = this.currentAction === action ? undefined : action;
  }

  removeRestaurant() {
    // 1. find restaurant
    // 2. remove the restaurant (forget about dangling dependencies at this moment)
    this.requesting = true;
    let nameOfRestaurant = '';
    this._api.get(environment.qmenuApiUrl + "generic2", {
      resource: "restaurant",
      query: {
        alias: this.removeAlias || 'non-existing'
      },
      projection: {
        name: 1
      },
      limit: 6000
    }).pipe(
      mergeMap(result => {
        if (result.length === 0) {
          throw 'No restaurant found!';
        } else {
          nameOfRestaurant = result[0].name;
          return this._api.delete(
            environment.qmenuApiUrl + "generic2",
            {
              resource: 'restaurant',
              ids: [result[0]._id]
            }
          );
        }
      }))
      .subscribe(
        result => {
          this._global.publishAlert(AlertType.Success, nameOfRestaurant + " is removed!");
          this.requesting = false;
          // let's remove this restaurant from the list!
          this.restaurantList = this.restaurantList.filter(r => r.alias !== this.removeAlias);
        },
        error => {
          this.requesting = false;
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  isVisible(restaurant) {
    return (!this.nameFilter || (restaurant.name || '').toLowerCase().indexOf(this.nameFilter.toLowerCase()) >= 0) &&
      (!this.phoneFilter || (restaurant.phones || []).some(p => (p.phoneNumber || '').indexOf(this.phoneFilter) >= 0));
  }

  getEnabledCount() {
    return this.restaurantList.filter(r => !r.disabled).length;
  }

  onSuccessCreation(restaurant) {
    this.currentAction = undefined;
    this.restaurantList.unshift(restaurant);
    this.newRestaurant = {
      googleAddress: {}
    };
  }

  onCancelCreation() {
    this.currentAction = undefined;
    this.newRestaurant = {
      googleAddress: {}
    };
  }

}
