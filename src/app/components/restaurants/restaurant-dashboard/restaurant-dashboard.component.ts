import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { mergeMap } from "rxjs/operators";
import { zip } from "rxjs";
import { Router } from "@angular/router";

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

  searchTerm: string;

  restaurantList: any = [];

  filteredRestaurantList = [];

  newRestaurant = {
    googleAddress: {}
  };


  buttonVisibilityMap = {
    NEW: ["ADMIN", "MENU_EDITOR", "CSR", "CSR_MANAGER", "ACCOUNTANT", "MARKETER"],
    CRAWL: ["ADMIN", "MENU_EDITOR", "CSR", "CSR_MANAGER", "ACCOUNTANT"],
    REMOVE: ["ADMIN", "MENU_EDITOR", "CSR", "CSR_MANAGER", "ACCOUNTANT"]
  }

  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    // retrieve MY restaurant list
    this.restaurantList = await this._global.getCachedRestaurantListForPicker();
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
            return zip(this._api.delete(
              environment.qmenuApiUrl + "generic",
              {
                resource: 'restaurant',
                ids: [result[0][0]._id]
              }
            ), this.deleteRtGmbTasks(this.removeId));
          }
        }))
      .subscribe(
        result => {
          this._global.publishAlert(AlertType.Success, nameOfRestaurant + " is removed!");
          this.requesting = false;
          // let's remove this restaurant from the list!
          this.restaurantList = this.restaurantList.filter(r => r._id !== this.removeId);
        },
        error => {
          this.requesting = false;
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  isButtonVisible(action) {
    return this._global.user.roles.some(r => this.buttonVisibilityMap[action].indexOf(r) >= 0);
  }

  getEnabledCount() {
    return this.restaurantList.filter(r => !r.disabled).length;
  }

  onSuccessCreation(restaurant) {
    console.log(restaurant);
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

  selectRestaurant(restaurant) {
    if (restaurant && restaurant._id) {
      this._router.navigate(['/restaurants/' + restaurant._id]);
    }
  }

  navigateTo(page) {
    this._router.navigate([page]);
  }

  deleteRtGmbTasks(rtId = 'non-existing') {
    return this._api.get(
      environment.qmenuApiUrl + "generic",
      {
        resource: 'task',
        query: { name: "GMB Request", "relatedMap.restaurantId": rtId },
        projection: { _id: 1 }
      }
    ).pipe(
      mergeMap(gmbTasks => this._api.delete(
        environment.qmenuApiUrl + "generic",
        {
          resource: 'task',
          ids: gmbTasks.map(t => t._id.toString())
        }
      )));
  }

}
