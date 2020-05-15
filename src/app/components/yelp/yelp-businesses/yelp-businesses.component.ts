import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { environment } from 'src/environments/environment';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-yelp-businesses',
  templateUrl: './yelp-businesses.component.html',
  styleUrls: ['./yelp-businesses.component.css']
})
export class YelpBusinessesComponent implements OnInit {
  filteredRows = [];
  isAdmin = false;
  showUnmatching = false;
  restaurants = [];

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.refresh();
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
  }

  ngOnInit() {

  }

  async refresh() {
    // --- restaurant
    const restaurantBatchSize = 3000;
    let restaurantSkip = 0;

    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: {
          name: 1,
          yelpListing: 1,
          googleAddress: 1,
          rateSchedules: 1
        },
        skip: restaurantSkip,
        limit: restaurantBatchSize
      }).toPromise();

      this.restaurants.push(...batch);

      if (batch.length === 0) {
        break;
      }
      restaurantSkip += restaurantBatchSize;
    }

    this.filteredRows = this.restaurants.filter(rt => rt.yelpListing != undefined);
    this.filter();
  }

  filter() {
   if(this.showUnmatching) {
     this.filteredRows = this.filteredRows.filter(rt => {
      const notMatchingName = rt.yelpListing.name !== rt.name;

      let [choppedAddress] = rt.yelpListing.location.street.split('\n');
      const yelpFormattedAddress = `${choppedAddress}, ${rt.yelpListing.location.city}, ${rt.yelpListing.location.state} ${rt.yelpListing.location.zip_code}`;
      const notMatchingAddress = rt.googleAddress.formatted_address.replace(', USA', '').replace(', US', '') !== yelpFormattedAddress;

      return notMatchingAddress;
     }
     )
   }
   else {
    this.filteredRows = this.restaurants.filter(rt => rt.yelpListing != undefined);
   }
  }

  getYelpFormattedAddress(location) {
    let [choppedAddress] = location.street.split('\n');
    const yelpFormattedAddress = `${choppedAddress}, ${location.city}, ${location.state} ${location.zip_code}`;

    return yelpFormattedAddress;
  }

  async claim(rt) {
    try {
      if(rt.yelpListing) {
        const target = 'claim-yelp';
        const { city, zip_code, country, state, street } = rt.yelpListing.location;
        const [streetShortened] = street.split('\n')
        const location = `${streetShortened}, ${city}, ${state} ${zip_code}, ${country}`;
  
        await this._api.post(environment.autoGmbUrl + target, { email: rt.yelpListing.gmb_email, name: rt.yelpListing.name, location }).toPromise();
        this._global.publishAlert(AlertType.Success, 'Logged in.');
      }
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed to login');
    }
  }


}
