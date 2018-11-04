import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { mergeMap } from "rxjs/operators";
import { zip } from "rxjs";

@Component({
  selector: "app-restaurant-dashboard",
  templateUrl: "./restaurant-dashboard.component.html",
  styleUrls: ["./restaurant-dashboard.component.scss"]
})
export class RestaurantDashboardComponent implements OnInit {

  currentAction; // CRAWL, REMOVE, ADD

  requesting = false;

  crawUrl;
  removeId;

  phoneFilter: string;
  nameFilter: string;
  restaurantIdFilter: string;
  restaurantList = [];

  newRestaurant = {
    googleAddress: {}
  };

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    // retrieve restaurant list
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1,
        alias: 1,
        logo: 1,
        restaurantId:1,
        "phones.phoneNumber": 1,
        disabled: 1,
        "googleAddress": 1
      },
      limit: 6000
    })
      .subscribe(
        result => {
          this.restaurantList = result;
          this.calculateDuplicated();
          this.restaurantList.sort((r1, r2) => r1.name > r2.name ? 1 : -1);
        },
        error => {
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  calculateDuplicated() {
    // mark duplicated if address are the same
    const addressMap = {};
    this.restaurantList.map(r => {
      if (r.googleAddress && r.googleAddress.formatted_address) {
        if (!addressMap[r.googleAddress.formatted_address]) {
          addressMap[r.googleAddress.formatted_address] = r;
          r.duplicated = false;
        } else {
          r.duplicated = true;
          addressMap[r.googleAddress.formatted_address].duplicated = true;
        }
      }
    });
  }

  setAction(action) {
    this.currentAction = this.currentAction === action ? undefined : action;
  }

  removeRestaurant() {
    // 1. find restaurant
    // 2. remove the restaurant (forget about dangling dependencies at this moment)
    this.requesting = true;
    let nameOfRestaurant = '';
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          _id: { $oid: this.removeId || 'non-existing' }
        },
        projection: {
          name: 1
        },
        limit: 6000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          restaurant: { $oid: this.removeId }
        },
        projection: {
          name: 1
        },
        limit: 6
      }),
    )
      .pipe(
        mergeMap(result => {
          if (result[1].length > 0) {
            throw 'This restaurant has orders!';
          } else {
            nameOfRestaurant = result[0][0].name;
            return this._api.delete(
              environment.qmenuApiUrl + "generic",
              {
                resource: 'restaurant',
                ids: [result[0][0]._id]
              }
            );
          }
        }))
      .subscribe(
        result => {
          this._global.publishAlert(AlertType.Success, nameOfRestaurant + " is removed!");
          this.requesting = false;
          // let's remove this restaurant from the list!
          this.restaurantList = this.restaurantList.filter(r => r._id !== this.removeId);
          this.calculateDuplicated();
        },
        error => {
          this.requesting = false;
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  isVisible(restaurant) {
    if(this.phoneFilter){
      this.phoneFilter=this.phoneFilter.replace(/\D/g,"");
    }
    return (!this.nameFilter || (restaurant.name || '').toLowerCase().indexOf(this.nameFilter.toLowerCase()) >= 0) &&
    (!this.restaurantIdFilter || this.restaurantIdFilter==restaurant.restaurantId) &&
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
