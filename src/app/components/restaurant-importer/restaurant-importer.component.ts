import { Component, OnInit, ViewChild } from '@angular/core';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { AlertType } from '../../classes/alert-type';
import { ApiService } from '../../services/api.service';
import { Helper } from "../../classes/helper";
@Component({
  selector: 'app-restaurant-importer',
  templateUrl: './restaurant-importer.component.html',
  styleUrls: ['./restaurant-importer.component.scss']
})
export class RestaurantImporterComponent implements OnInit {

  @ViewChild('menuShuffler') menuShuffler;

  crawlUrl = "https://slicelife.com/restaurants/az/scottsdale/85260/ray-s-pizza-scottsdale/menu";
  apiRequesting;
  restaurant;
  alias;
  existingRestaurant;

  constructor(private _global: GlobalService, private _api: ApiService) { }

  ngOnInit() {
  }

  getCustomerPreviewLink() {
    return environment.customerUrl + '#/' + this.alias;
  }

  getRestaurantData() {
    this.restaurant = undefined;
    this.existingRestaurant = undefined;
    this.alias = undefined;

    this.apiRequesting = true;

    this._api
      .get(environment.adminApiUrl + "utils/crawl-restaurant", {
        url: this.crawlUrl
      })
      .subscribe(
        result => {
          this.apiRequesting = false;
          this.restaurant = result;
          this.fillAddress();
        },
        error => {
          this.apiRequesting = false;
          this._global.publishAlert(AlertType.Danger, "Failed to crawl");
        }
      );
  }

  fillAddress() {
    this.apiRequesting = true;
    this._api
      .get(environment.adminApiUrl + "utils/google-address", {
        formatted_address: this.restaurant.formatted_address
      })
      .subscribe(
        result => {
          this.restaurant.address = result;
          this.apiRequesting = false;
          this.alias = this.restaurant.name + '-' + this.restaurant.address.locality + '-' + this.restaurant.address.administrative_area_level_1;
          // replace space with -
          this.alias = this.alias.replace(' ', '-');
          // replace '
          this.alias = this.alias.replace('\'', '');
          // all small case
          this.alias = this.alias.toLowerCase();
        },
        error => {
          this.apiRequesting = false;
          this._global.publishAlert(
            AlertType.Danger,
            "Failed to update Google address."
          );
        }
      );
  }

  checkAliasAvailability() {
    this.existingRestaurant = undefined;
    this.apiRequesting = true;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        alias: this.alias || 'non-existing'
      },
      projection: {
        name: 1,
        menuOptions: 1,
        menus: 1,
        address: 1
      },
      limit: 6000
    }).subscribe(restaurants => {
      this.apiRequesting = false;
      this.existingRestaurant = restaurants[0];
      // we like to have empty body instead of undefined for indicating we did query
      this.existingRestaurant = this.existingRestaurant || {};
    }, error => {
      this.apiRequesting = false;
      this._global.publishAlert(
        AlertType.Danger,
        "Failed to query existing restaurants."
      );
    });
  }

  createNewRestaurant() {

    // create restaurant body, address
    const address = JSON.parse(JSON.stringify(this.restaurant.address));
    // add legacy line1, line2, zipCode, city, state
    address.line1 = address.street_number + ' ' + address.route;
    address.city = address.locality;
    address.zipCode = address.postal_code;
    address.state = address.administrative_area_level_1;

    // create address, then restaurant!
    this.apiRequesting = true;

    this._api
      .post(environment.qmenuApiUrl + "generic?resource=address", [address])
      .flatMap(addresses => {
        const restaurant = JSON.parse(JSON.stringify(this.restaurant));
        const organizedMenusAndMenuOptions = this.menuShuffler.getOrganizedMenusAndMenuOptions();

        restaurant.menus = organizedMenusAndMenuOptions.menus;
        restaurant.menuOptions = organizedMenusAndMenuOptions.menuOptions;
        delete restaurant.phone;
        delete restaurant.formatted_address;
        restaurant.address = addresses[0];
        restaurant.alias = this.alias;
        return this._api
          .post(environment.qmenuApiUrl + "generic?resource=restaurant", [restaurant])
      })
      .subscribe(
        result => {
          this.apiRequesting = false;
          this._global.publishAlert(
            AlertType.Success, "Restaurant " + this.restaurant.name + " was created!"
          );
          this.existingRestaurant = undefined;

        },
        error => {

          this.apiRequesting = false;
          this._global.publishAlert(AlertType.Danger, "Error creating restaurant");
        }
      );
  }

  updateExistingRestaurant() {
    const organized = this.menuShuffler.getOrganizedMenusAndMenuOptions();

    // 1. delete existing menuOptions and menus
    // 2. inject new menuOptions and menus
    const rOld = JSON.parse(JSON.stringify(this.existingRestaurant));

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: { _id: rOld._id, menus: {}, menuOptions: {} }, new: { _id: rOld._id } }])
      .flatMap(
        result => this._api
          .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: { _id: rOld._id }, new: { _id: rOld._id, menus: organized.menus, menuOptions: organized.menuOptions } }])
      )
      .subscribe(
        result => {
          this.apiRequesting = false;
          this._global.publishAlert(AlertType.Success, "Restaurant " + this.existingRestaurant.name + " is updated!");
          this.existingRestaurant = undefined;
        },
        error => {
          this.apiRequesting = false;
          this._global.publishAlert(AlertType.Danger, "Error updating restaurant!");
        }
      );

  }

}
