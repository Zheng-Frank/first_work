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


  showCrawl = false;
  crawling = false;
  crawUrl;

  showRemove = false;
  removing = false;
  removeAlias;

  phoneFilter: string;
  nameFilter: string;
  restaurantList = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    // retrieve restaurant list
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1,
        alias: 1,
        logo: 1,
        phones: 1
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

  removeRestaurant() {
    // 1. find restaurant
    // 2. remove the restaurant (forget about dangling dependencies at this moment)
    this.removing = true;
    let nameOfRestaurant = '';
    this._api.get(environment.qmenuApiUrl + "generic", {
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
            environment.qmenuApiUrl + "generic",
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
          this.removing = false;
        },
        error => {
          this.removing = false;
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  getFilteredRestaurantList() {
    return this.restaurantList.filter(r => 
      (!this.nameFilter || (r.name || '').toLowerCase().indexOf(this.nameFilter.toLowerCase()) >= 0) &&
      (!this.phoneFilter || (r.phones || []).some(p => p.indexOf(this.phoneFilter) >= 0))
    );
  }

}
