import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";

@Component({
  selector: "app-restaurants",
  templateUrl: "./restaurants.component.html",
  styleUrls: ["./restaurants.component.scss"]
})
export class RestaurantsComponent implements OnInit {
  constructor(private _api: ApiService, private _global: GlobalService) { }

  showCrawl = false;
  crawling = false;
  crawUrl;

  showRemove = false;
  removing = false;
  removeAlias;

  fakeRestaurant1 = {
    name: 'restaurant1',
    menus: [
      {
        name: 'menu1',
        mcs: [{
          name: 'cat1-1'
        }, {
          name: 'cat1-2'
        }]
      },
      {
        name: 'menu2',
        mcs: [{
          name: 'cat2-1'
        }, {
          name: 'cat2-2'
        }]
      }
    ]
  };

  fakeRestaurant2 = {
    name: 'restaurant2',
    menus: [
      {
        name: 'menuA',
        mcs: [{
          name: 'catA-1'
        }, {
          name: 'catA-2'
        }]
      },
      {
        name: 'menuB',
        mcs: [{
          name: 'catB-1'
        }, {
          name: 'catB-2'
        }]
      }
    ]
  };

  ngOnInit() { }

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
    }).flatMap(result => {
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
    })
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

}
