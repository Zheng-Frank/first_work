import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { environment } from 'src/environments/environment';
import { AlertType } from 'src/app/classes/alert-type';
import {tryCatch} from "rxjs/internal-compatibility";

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

  handlingAccount = [];

  _isPublished = false;
  matchingRestaurant;

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
  }

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    const account = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        "yelpLocations": { $elemMatch: { yid: this.restaurant.yelpListing.yid } },
        isYelpEmail: true
      },
      projection: {
        yelpLocations: 1,
        email: 1
      },
    }).toPromise();

    this.handlingAccount = [account];
  }

  getHandlingAccount() {
    return this.handlingAccount;
  }

  isPublished() {
    return this.handlingAccount;
  }

  isWebsiteOk() {
    const qmenuWebsite = ((this.restaurant.web && this.restaurant.web.qmenuWebsite) ? this.restaurant.web.qmenuWebsite : 'No website');
    const yelpWebsite = ((this.restaurant.yelpListing && this.restaurant.yelpListing.website) ? this.restaurant.yelpListing.website : 'Website not found or not crawled yet');

    const qmenuWebsiteDomain = new URL(qmenuWebsite.includes('https') ? qmenuWebsite : 'https://' + qmenuWebsite);
    const yelpWebsiteDomain = new URL(yelpWebsite.includes('https:') ? yelpWebsite : 'https://' + yelpWebsite);

    return qmenuWebsiteDomain.hostname === yelpWebsiteDomain.hostname;
  }

  async refreshMainListing() {
    try {
      if (!this.restaurant.yelpListing.yelpEmail) {
        this._global.publishAlert(AlertType.Danger, 'No assigned crawling email account');
        return;
      }

      const refreshed = await this._api.post(environment.appApiUrl + "yelp/generic", {
        name: "refresh-yelp-rt-listing",
        payload: {
          "email": this.restaurant.yelpListing.yelpEmail,
          "restaurantId": this.restaurant.id
        }
      }).toPromise();

      console.log(refreshed);

      this.restaurant.yelpListing = refreshed;
      this._global.publishAlert(AlertType.Success, 'Listing refreshed');
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error trying to refresh main listing');
    }
  }

  desiredWebsite(website) {
    const url = new URL(website);
    const domain = url.hostname;
    let newWebsite;

    if (domain.includes('qmenu.us')) {
      newWebsite = `https://qmenu.us/${url.hash}?utm=yelp.com`;
    } else {
      newWebsite = `https://${domain}?utm=yelp.com`;
    }

    console.log(newWebsite);
    return newWebsite;
  }

  async inject() {
    try {
      const qmenuWebsite = this.restaurant.web && this.restaurant.web.qmenuWebsite;
      const newUrl = qmenuWebsite ? `${this.desiredWebsite(qmenuWebsite)}` : '';
      await this._api.post(environment.appApiUrl + "yelp/generic", {
        name: "inject-yelp-website-address",
        payload: {
          "email": this.handlingAccount['email'],
          "yid": this.restaurant.yelpListing.yid,
          "newUrl": newUrl,
        }
      }).toPromise();
      this._global.publishAlert(AlertType.Success, `Website url injected succesfully`);
    } catch(error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, `Website url injected failed`);
    }
  }
}
