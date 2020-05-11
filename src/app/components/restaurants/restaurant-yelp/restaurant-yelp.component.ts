import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { environment } from 'src/environments/environment';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-restaurant-yelp',
  templateUrl: './restaurant-yelp.component.html',
  styleUrls: ['./restaurant-yelp.component.css']
})
export class RestaurantYelpComponent implements OnInit {
  @Input() restaurant: Restaurant;
  now = new Date();
  apiRequesting = false;
  isAdmin = false;
  _isPublished = false;
  accountLocations;
  matchingRestaurant;

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');

    this.refresh();
  }

  async refresh() {
    const accountList = [];
    const batchSize = 50;
    let skip = 0;
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: "gmbAccount",
        query: {
          isYelpEmail: true
        },
        projection: {
          yelpLocations: 1,
        },
        skip: skip,
        limit: batchSize
      }).toPromise();
      if (batch.length === 0) {
        break;
      }
      accountList.push(...batch);
      skip += batchSize;
    }

    this.accountLocations = accountList.filter(account => account.yelpLocations != undefined)[0].yelpLocations || [];

    this.matchingRestaurant = this.getMatchingRestaurant();
    console.log(this.matchingRestaurant);
    this._isPublished = this.matchingRestaurant.length > 0;
  }

  ngOnInit() {

  }

  getMatchingRestaurant() {

    if (this.accountLocations) {
      const matchingRestaurant = this.accountLocations.filter(loc => {
        const [shortStreet] = this.restaurant.yelpListing.location.street.split('\n');
        const yelpFormattedAddress = `${shortStreet.trim()}, ${this.restaurant.yelpListing.location.city}, ${this.restaurant.yelpListing.location.state} ${this.restaurant.yelpListing.location.zip_code}`;
        const qmenuFormattedAddress = this.restaurant.googleAddress.formatted_address.replace(', USA', '').replace(', US', '').replace(', CA', '');

        console.log(loc.name);
        console.log(this.restaurant.name);
        return (loc.name === this.restaurant.name) && (yelpFormattedAddress === qmenuFormattedAddress);
      });

      return matchingRestaurant;
    }

    return {};

  }

  isPublished() {
    return this._isPublished;
  }

  isWebsiteOk() {
    const [matchingRestaurant] = this.getMatchingRestaurant();

    if (!matchingRestaurant) {
      return false;
    }

    const qmenuWebsite = (this.restaurant.web && this.restaurant.web.qmenuWebsite) ? this.restaurant.web.qmenuWebsite : '';
    const yelpWebsite = (matchingRestaurant.yelpListing && matchingRestaurant.yelpListing.website) ? matchingRestaurant.yelpListing.website : '';
    return yelpWebsite === qmenuWebsite;
  }

  async refreshMainListing() {
    try {
      const [matchingRestaurant] = this.getMatchingRestaurant();

      if (!matchingRestaurant.yelpListing) {
        this._global.publishAlert(AlertType.Danger, 'No matching restaurant');
      }

      await this._api.post(environment.appApiUrl + "yelp/generic", {
        name: "yelp-refresh-rt-listings",
        payload: {
          "email": matchingRestaurant.yelpListing.gmb_email,
          "name": this.restaurant.name,
          "googleAddress": this.restaurant.googleAddress
        }
      }).toPromise();

      this._global.publishAlert(AlertType.Success, 'Listing refreshed');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }

  }
}
