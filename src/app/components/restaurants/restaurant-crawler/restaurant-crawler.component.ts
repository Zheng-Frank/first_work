import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { ApiService } from '../../../services/api.service';
import { Helper } from "../../../classes/helper";
import { mergeMap } from "rxjs/operators";
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-restaurant-crawler',
  templateUrl: './restaurant-crawler.component.html',
  styleUrls: ['./restaurant-crawler.component.scss']
})
export class RestaurantCrawlerComponent implements OnInit {
  @Output() menuUpdate = new EventEmitter();
  @Output() restaurantCreate = new EventEmitter();

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
          if (this.restaurant.formatted_address) {
            this.fillAddress();
          }
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

    // create address, then restaurant!
    this.apiRequesting = true;

    const restaurant = JSON.parse(JSON.stringify(this.restaurant));

    const organizedMenusAndMenuOptions = this.menuShuffler.getOrganizedMenusAndMenuOptions();

    restaurant.menus = organizedMenusAndMenuOptions.menus;
    restaurant.menuOptions = organizedMenusAndMenuOptions.menuOptions;

    // remove non-belonging fields
    delete restaurant.phone;
    delete restaurant.formatted_address;

    const address = restaurant.address || {};

    // add legacy line1, line2, zipCode, city, state
    address.line1 = address.street_number + ' ' + address.route;
    address.city = address.locality || address.sublocality;
    address.zipCode = address.postal_code;
    address.state = address.administrative_area_level_1;

    // assign address to 
    restaurant.googleAddress = address;

    // we need to remove it from restaurant field
    delete restaurant.address;

    restaurant.alias = this.alias;

    this._api
      .post(environment.qmenuApiUrl + "generic?resource=restaurant", [restaurant])

      .subscribe(
        result => {
          this.apiRequesting = false;
          this._global.publishAlert(
            AlertType.Success, "Restaurant " + this.restaurant.name + " was created!"
          );
          this.existingRestaurant = undefined;
          let r = new Restaurant(restaurant);
          r.id = result[0];
          this.restaurantCreate.emit(r);

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
      .pipe(mergeMap(
        result => this._api
          .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: { _id: rOld._id }, new: { _id: rOld._id, menus: organized.menus, menuOptions: organized.menuOptions } }])
      ))
      .subscribe(
        result => {
          this.apiRequesting = false;
          this._global.publishAlert(AlertType.Success, "Restaurant " + this.existingRestaurant.name + " is updated!");
          this.existingRestaurant = undefined;

          let updated = new Restaurant(rOld);
          updated.menus = organized.menus;
          updated.menuOptions = organized.menuOptions;
          this.menuUpdate.emit(updated);
        },
        error => {
          this.apiRequesting = false;
          this._global.publishAlert(AlertType.Danger, "Error updating restaurant!");
        }
      );

  }

}
