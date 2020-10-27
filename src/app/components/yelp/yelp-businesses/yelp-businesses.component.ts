import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { environment } from 'src/environments/environment';
import { AlertType } from 'src/app/classes/alert-type';
import { TimezoneService } from '../../../services/timezone.service';

@Component({
  selector: 'app-yelp-businesses',
  templateUrl: './yelp-businesses.component.html',
  styleUrls: ['./yelp-businesses.component.css']
})
export class YelpBusinessesComponent implements OnInit {
  restaurants = [];
  yelpRequest = [];
  accounts = [];
  allLocations = [];
  flatRows = [];
  filteredRows = [];
  refreshing = false;
  username = '';
  restaurantStatus = "All";
  pagination = false;

  // // currentUser = '';
  // isAdmin = false;
  // now = new Date();


  myColumnDescriptors = [
    {
      label: '#'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Score',
      paths: ['rating'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: 'Account',
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Yelp Status',
      // paths: ['claimedStatus'],
      // sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Logs'
    },
    {
      label: ''
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service, public _timezone: TimezoneService) {
    this.populate();
    this.username = this._global.user.username;

    // this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
  }

  ngOnInit() {

  }

  async loginYelp(email) {
    try {
      const target = 'login-yelp';
      await this._api.post(environment.autoGmbUrl + target, { email }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Login to Yelp initiated.');

    } catch (error) {

      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Error login into yelp.');
    }

  }

  hasSameAddress(googleFormattedAddress, yelpFormattedAddress) {
    return googleFormattedAddress === yelpFormattedAddress;
  }

  getYelpFormattedAddress(location) {
    if (location) {
      let [choppedAddress] = location.street.split('\n');
      const yelpFormattedAddress = `${choppedAddress}, ${location.city}, ${location.state} ${location.zip_code}`;

      return yelpFormattedAddress;
    }
  }

  isPublished(yid) {
    return this.allLocations.some(loc => {
      return yid === loc.yid;
    });
  }

  async filter() {
    this.refreshing = false;

    switch (this.restaurantStatus) {
      case 'Open':
        this.filteredRows = this.flatRows.filter(r => r.claimedStatus === 'Open');
        break;

      case 'Published':
        this.filteredRows = this.flatRows.filter(r => r.isRTPublished === true);
        break;

      case 'Unclaimable':
        this.filteredRows = this.flatRows.filter(r => r.claimedStatus === 'Unclaimable');
        break;

      case 'Reclaimable':
        this.filteredRows = this.flatRows.filter(r => r.claimedStatus === 'Reclaimable');
        break;

      case 'Unknown':
        this.filteredRows = this.flatRows.filter(r => r.claimedStatus === 'Unknown');
        break;

      case 'Error':
        this.filteredRows = this.restaurants.filter(r => r.claimedStatus === 'Error');
        break;

      default:
        this.filteredRows = this.flatRows;
        break;
    }

    this.refreshing = false;

  }

  async populate() {
    try {
      this.refreshing = true;

      // --- restaurant
      this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          googleAddress: { $ne: null }
        },
        projection: {
          name: 1,
          "yelpListing.yid": 1,
          "yelpListing.name": 1,
          "yelpListing.score": 1,
          "yelpListing.claimedStatus": 1,
          "yelpListing.rating": 1,
          "yelpListing.website": 1,
          "yelpListing.location.street": 1,
          "yelpListing.location.city": 1,
          "yelpListing.location.state": 1,
          "yelpListing.location.zip_code": 1,
          "yelpListing.url": 1,
          'googleAddress.formatted_address': 1,
          rateSchedules: 1,
          disabled: 1,
          "web.qmenuWebsite": 1,
          "googleAddress.timezone": 1,
        },
      }, 3000);

      // --- yelp-request
      this.yelpRequest = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: 'yelp-request',
        projection: {
          yid: 1,
          yelpEmail: 1,
          logs: 1
        }
      }, 10000);

      // --- accounts
      this.accounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        projection: {
          email: 1,
          yelpLocations: 1
        },
        query: {
          isYelpEmail: true
        },
      }, 1000);

      this.accounts.map(account => {
        if (account.yelpLocations) {
          this.allLocations.push(...account.yelpLocations);
        }
      });

      this.restaurants = this.restaurants.filter(rt => rt.yelpListing !== undefined && rt.disabled !== true);

      this.flatRows = this.restaurants.map(row => {
        const restaurant_yelpRequest = this.yelpRequest.find(y => y.yid === row.yelpListing.yid);
        return {
          _id: row._id,
          yid: row.yelpListing.yid,
          qMenuName: row.name,
          yelpName: row.yelpListing.name,
          claimedStatus: row.yelpListing.claimedStatus,
          rating: row.yelpListing.rating,
          qmenuWebsite: row.web ? row.web.qmenuWebsite : '',
          website: row.yelpListing.website,
          url: row.yelpListing.url,
          googleFormattedAddress: row.googleAddress ? row.googleAddress.formatted_address.replace(', USA', '') : '',
          isSameAddress: this.hasSameAddress(row.googleAddress ? row.googleAddress.formatted_address.replace(', USA', '') : '', this.getYelpFormattedAddress(row.yelpListing.location)),
          location: row.yelpListing.location,
          timezone: row.googleAddress.timezone,
          yelpEmail: restaurant_yelpRequest && restaurant_yelpRequest.yelpEmail,
          logs: (restaurant_yelpRequest && restaurant_yelpRequest.logs) || [],
          isRTPublished: this.isPublished(row.yelpListing.yid),
          isRequested: !!restaurant_yelpRequest
        }
      });

      this.refreshing = false;
      this.filter();

    } catch (error) {

      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Error while populating yelp listings.');
    }

  }

  async addLog(yelpId, currentLog) {

    if (currentLog) {
      let [yelpRequest] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'yelp-request',
        query: { yid: yelpId },
        projection: {
          yid: 1,
          logs: 1
        }
      }).toPromise();

      if (!yelpRequest) {
        yelpRequest = {
          yid: yelpId,
          logs: [{
            user: this.username,
            date: new Date(),
            content: currentLog
          }]
        };

        const newData = await this._api.post(environment.qmenuApiUrl + 'generic?resource=yelp-request', [yelpRequest]).toPromise();
        const index = this.flatRows.findIndex(r => r.yid === yelpId);

        this.flatRows[index] = { ...this.flatRows[index], ...newData };

      } else {
        const logs = [...(yelpRequest.logs || []), {
          user: this.username,
          date: new Date(),
          content: currentLog
        }];

        const oldData = { ...yelpRequest };
        const newData = { ...yelpRequest, logs };

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=yelp-request', [
          {
            old: { ...oldData },
            new: { ...newData }
          }
        ]).toPromise();

        const index = this.flatRows.findIndex(r => r.yid === yelpId);

        this.flatRows[index].logs = logs;
        this.flatRows[index].currentLog = '';
      }

      this._global.publishAlert(AlertType.Success, 'Log added.');
    }
  }

  async refreshSingle(restaurantId, yelpId, email) {
    try {
      const flatRow = await this._api.post(environment.appApiUrl + "yelp/generic", {
        name: "refresh-yelp-rt-listing",
        payload: {
          email,
          restaurantId
        }
      }).toPromise();

      const index = this.flatRows.findIndex(r => r.yid === yelpId);
      this.flatRows[index] = { ...this.flatRows[index], ...flatRow };

      this.filter();

      this.refreshing = false;
      this._global.publishAlert(AlertType.Success, 'Done refreshing.');

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error while refreshing restaurant.');
      console.error(error);
    }

  }

  getPublishedAccount(yid) {
    for (const account of this.accounts) {
      if (account.yelpLocations) {
        const [match] = account.yelpLocations.filter(l => l.yid === yid);
        if (match) {
          return account.email;
        }
      }
    }
  }

  getUsername(email) {
    if (email) {
      const username = email.replace('@gmail.com', '');
      return username;
    }
  }

  async getRandomAccount() {
    const shuffle = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const accounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "gmbAccount",
      query: {
        isYelpEmail: true
      },
      projection: {
        email: 1,
      }
    }, 8000);

    shuffle(accounts);

    const [account] = accounts;

    return account;
  }

  async claim(rt) {
    try {
      this.refreshing = true;
      
      const account = await this.getRandomAccount();

      if (!account) {
        throw `Could not retrieve random account!`;
      }

      let [yelpRequest] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'yelp-request',
        query: { yid: rt.yid },
        projection: {
          yid: 1,
          yelpEmail: 1
        }
      }).toPromise();

      if (!yelpRequest) {

        yelpRequest = {
          yid: rt.yid,
          yelpEmail: account.email
        };

        await this._api.post(environment.qmenuApiUrl + 'generic?resource=yelp-request', [yelpRequest]).toPromise();

        const index = this.flatRows.findIndex(r => r.yid === rt.yid);
        this.flatRows[index] = { ...this.flatRows[index], ...yelpRequest };
        this.flatRows[index].isRequested = true;

        const { city, zip_code, country, state, street } = rt.location;
        const [streetShortened] = street.split('\n')
        const location = `${streetShortened}, ${city}, ${state} ${zip_code}, ${country}`;

        await this._api.post(environment.autoGmbUrl + 'claim-yelp', { email: account.email, name: rt.qMenuName, location }).toPromise();

        this.refreshing = false;
      } else {

        if (!yelpRequest.yelpEmail) {
          const oldData = { ...yelpRequest };
          const newData = { ...yelpRequest, email: account.email };
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=yelp-request', [
            {
              old: { ...oldData },
              new: { ...newData }
            }
          ]).toPromise();

          const index = this.flatRows.findIndex(r => r.yid === rt.yid);
          this.flatRows[index] = { ...this.flatRows[index], ...newData };
        }

        const { city, zip_code, country, state, street } = rt.location;
        const [streetShortened] = street.split('\n')
        const location = `${streetShortened}, ${city}, ${state} ${zip_code}, ${country}`;

        this.refreshing = false;

        await this._api.post(environment.autoGmbUrl + 'claim-yelp', { email: yelpRequest.yelpEmail, name: rt.qMenuName, location }).toPromise();
        this._global.publishAlert(AlertType.Success, 'Claim/Reclaim initiated.');
      }

    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Claim/Reclaim failed.');
      this.refreshing = false;
    }
  }


}
