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

  accounts = [];

  _isPublished = false;
  matchingRestaurant;


  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
    this.refresh();
    
  }

  async refresh() {
    // --- get gmbAccounts
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
          email: 1,
        },
        skip: skip,
        limit: batchSize
      }).toPromise();
      if (batch.length === 0) {
        break;
      }
      this.accounts.push(...batch);
      skip += batchSize;
    }

    this.accounts = this.accounts.filter(account => account.yelpLocations != undefined);
  }

  getHandlingAccount() {
    const qmenuAddress = this.restaurant.googleAddress.formatted_address.replace(', USA', '').replace(', US', '');
    let matchingAccount = [];

    for (const account of this.accounts) {
      const result = account.yelpLocations.filter(yelpLocation => {
        const [shortStreet] = yelpLocation.location.street.split('\n');
        const yelpAddress = `${shortStreet.trim()}, ${yelpLocation.location.city}, ${yelpLocation.location.state} ${yelpLocation.location.zip_code}`;
        // console.log(qmenuAddress);
        // console.log(yelpAddress);
        // console.log(qmenuAddress.trim() === yelpAddress);
        return qmenuAddress.trim() === yelpAddress;
      });

      if(result.length > 0){
        matchingAccount.push(account);
      }
    }

    return matchingAccount;
  }

  ngOnInit() {

  }

  isPublished() {

    const allLocations = [];

    this.accounts.map(account => {
      allLocations.push(...account.yelpLocations);
    });

    const qmenuAddress = this.restaurant.googleAddress.formatted_address.replace(', USA', '').replace(', US', '');
    const matches = allLocations.filter(yelpLocation => {
      const [shortStreet] = yelpLocation.location.street.split('\n');
      const yelpAddress = `${shortStreet.trim()}, ${yelpLocation.location.city}, ${yelpLocation.location.state} ${yelpLocation.location.zip_code}`;

      return qmenuAddress === yelpAddress;
    });

    return matches.length > 0;
  }

  isWebsiteOk() {
    const qmenuWebsite = (this.restaurant.web && this.restaurant.web.qmenuWebsite) ? this.restaurant.web.qmenuWebsite : '';
    const yelpWebsite = (this.restaurant.yelpListing && this.restaurant.yelpListing.website) ? this.restaurant.yelpListing.website : '';
    
    if(!qmenuWebsite && !yelpWebsite) {
      return false;
    }

    return yelpWebsite === qmenuWebsite;
  }

  async refreshMainListing() {
    try {
      if (!this.restaurant.yelpListing) {
        this._global.publishAlert(AlertType.Danger, 'No assigned crawling email account');
        return;
      }

      console.log({
        email: this.restaurant.yelpListing.gmb_email,
        restaurantId: this.restaurant.id
      }); 


      await this._api.post(environment.appApiUrl + "yelp/generic", {
        name: "refresh-yelp-rt-listing",
        payload: {
          "email": this.restaurant.yelpListing.gmb_email,
          "restaurantId": this.restaurant.id
        }
      }).toPromise();

      this._global.publishAlert(AlertType.Success, 'Listing refreshed');
      console.log('Listing refreshed');
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error trying to refresh main listing');
    }
  }


  async inject() {
    const [handlingAccount] = this.getHandlingAccount();
    // console.log(handlingAccount);

    const email = handlingAccount ? handlingAccount.email : this.restaurant.yelpListing.gmb_email;
    const yid = this.restaurant.yelpListing.yid;
    const newUrl = this.restaurant.web && this.restaurant.web.qmenuWebsite ? this.restaurant.web.qmenuWebsite : '';
    const isOwner = !!handlingAccount;

    console.log({ email, yid, newUrl, isOwner });

    const result = await this._api.post(environment.appApiUrl + "yelp/generic", {
      name: "inject-website-address",
      payload: {
        "email": email,
        "yid": yid,
        "newUrl": newUrl,
        "isOwner": isOwner
      }
    }).toPromise();

    console.log(result);
    this._global.publishAlert(AlertType.Success, `Website url injected succesfully.. `);
  }
}
