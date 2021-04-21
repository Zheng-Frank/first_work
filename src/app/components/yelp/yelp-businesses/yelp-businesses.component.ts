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
  restaurants = [];
  yelpRequest = [];
  accounts = [];
  allLocations = [];
  flatRows = [];
  filteredRows = [];
  refreshing = false;
  username = '';
  restaurantStatus = "All";
  Q_Y_WebsiteStatus = "All"; //Add filter to Yelp Biz page to filter for "Q / Y website" condition，it is the sign.
  searchText; //restaurant id 
  pagination = false;

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
      label: 'Time Zone',
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
      label: 'Website'
    },
    {
      label: 'Logs'
    },
    {
      label: ''
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.populate();
    this.username = this._global.user.username;

    // this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
  }

  ngOnInit() {

  }

  async loginYelp(email, yid, url) {
    try {
      const payload = { email };

      if(this.isPublished(yid)) {
        payload['yid'] = yid;
      }

      const [account] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        query: { email },
        projection: {
          email: 1,
          yelpPassword: 1
        }
      }).toPromise();

      if(!account) {
        throw `No account found for ${email}`;
      }

      payload['account'] = account;

      const target = 'login-yelp';
      await this._api.post(environment.autoGmbUrl + target, payload).toPromise();
      this._global.publishAlert(AlertType.Success, 'Login to Yelp initiated.');

      this.refreshing = false;
    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Error login into yelp.');
    }

  }

  hasSameAddress(googleFormattedAddress, yelpFormattedAddress) {
    return googleFormattedAddress === yelpFormattedAddress;
  }

  getYelpFormattedAddress(location) {
    if (location && location.street) {
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
      case 'Claimable':
      case 'Reclaimable':
        this.filteredRows = this.flatRows.filter(r => r.claimedStatus === 'Open' || r.claimedStatus === 'Reclaimable');
        break;

      case 'Published':
        this.filteredRows = this.flatRows.filter(r => r.isRTPublished === true);
        break;

      case 'Unclaimable':
        this.filteredRows = this.flatRows.filter(r => r.claimedStatus === 'Unclaimable');
        break;

      case 'Unknown':
        this.filteredRows = this.flatRows.filter(r => r.claimedStatus === 'Unknown');
        break;

      case 'Unmatched':
        this.filteredRows = this.flatRows.filter(r => !r.url);
        break;

      default:
        this.filteredRows = this.flatRows;
        break;
    }
    //filter r for "Q / Y website" condition
    switch (this.Q_Y_WebsiteStatus) {
      case 'Q=Y':
        this.filteredRows = this.filteredRows.filter(r =>  r.qmenuWebsite === r.website);
        break;

      case 'Q!=Y':
        this.filteredRows = this.filteredRows.filter(r =>  r.qmenuWebsite != r.website);
        break;

      default:
        this.filteredRows = this.filteredRows;
        break;
    }
    
    this.refreshing = false;

  }
   //search restaurant with id
  search(){
    if(this.searchText != ""){
      this.filteredRows = this.flatRows.filter(r=>r._id === this.searchText);
    }else{ //if there are not any searchText in the input ,should show the filter content with the other selects
      this.filter();
    }
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
      }, 3000);

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

      this.restaurants = this.restaurants.filter(rt => rt.yelpListing !== undefined && rt.disabled !== true && rt.googleAddress && rt.googleAddress.formatted_address);

      this.flatRows = this.restaurants.map(row => {
        const restaurant_yelpRequest = this.yelpRequest.find(y => y.yid === row.yelpListing.yid);
        return {
          _id: row._id,
          yid: row.yelpListing.yid,
          qMenuName: row.name,
          yelpName: row.yelpListing.name,
          claimedStatus: row.yelpListing.claimedStatus,
          rating: row.yelpListing.rating,
          qmenuWebsite: (row.web && row.web.qmenuWebsite || '').replace('https://', ''),
          website: row.yelpListing.website,
          url: row.yelpListing.url && row.yelpListing.url.split('?')[0] || '',
          googleFormattedAddress: row.googleAddress && row.googleAddress.formatted_address && row.googleAddress.formatted_address.replace(', USA', ''),
          isSameAddress: this.hasSameAddress(row.googleAddress ? row.googleAddress.formatted_address.replace(', USA', '') : '', this.getYelpFormattedAddress(row.yelpListing.location)),
          location: row.yelpListing.location,
          timezone: row.googleAddress.timezone,
          yelpEmail: restaurant_yelpRequest && restaurant_yelpRequest.yelpEmail,
          logs: (restaurant_yelpRequest && restaurant_yelpRequest.logs) || [],
          isRTPublished: this.isPublished(row.yelpListing.yid),
          isRequested: !!restaurant_yelpRequest,
        }
      });

      // --- Duplicates
      const unique = []
      const duplicates = this.flatRows.filter(o => {
        if (unique.find(i => i.yid === o.yid)) {
          return true
        }
        unique.push(o)
        return false;
      });
      // console.log(duplicates.filter(d => d.yid));
      // ---

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
      // refresh account listings in case ownership gained
      await this._api.post(environment.appApiUrl + "yelp/generic", {
        name: "refresh-yelp-account-listing",
        payload: { email }
      }).toPromise();

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

      const flatRow = await this._api.post(environment.appApiUrl + "yelp/generic", {
        name: "refresh-yelp-rt-listing",
        payload: {
          email,
          restaurantId
        }
      }).toPromise();

      const index = this.flatRows.findIndex(r => r.yid === yelpId);
      this.flatRows[index] = { ...this.flatRows[index], ...flatRow };
      this.flatRows[index].isRTPublished = this.isPublished(yelpId);

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
        yelpPassword: 1
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

        await this._api.post(environment.autoGmbUrl + 'claim-yelp', { account, name: rt.qMenuName, location }).toPromise();

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

        await this._api.post(environment.autoGmbUrl + 'claim-yelp', { account, name: rt.qMenuName, location }).toPromise();
        this._global.publishAlert(AlertType.Success, 'Claim/Reclaim initiated.');
      }

    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Claim/Reclaim failed.');
      this.refreshing = false;
    }
  }

  async onAssignYelpUrl(event, field: string, rt) {

    if (field === 'url') {
      const [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: { _id: { $oid: rt._id } },
        projection: { _id: 1, yelpListing: 1 }
      }).toPromise();


      const newValue = (event.newValue || '').trim();

      if (restaurant) {
        const oldYelpListing = { ...restaurant.yelpListing };
        const newYelpListing = { ...restaurant.yelpListing, url: newValue };

        console.log(oldYelpListing, newYelpListing)

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
          {
            old: { _id: restaurant._id, yelpListing: oldYelpListing },
            new: { _id: restaurant._id, yelpListing: newYelpListing }
          }
        ]).toPromise();

        this._global.publishAlert(AlertType.Success, `URL updated succesfuly`);

        // refresh
        const index = this.flatRows.findIndex(r => r._id === rt._id);
        this.flatRows[index].url = newValue;

      } else {
        this._global.publishAlert(AlertType.Danger, `Error: No restaurnt found with id ${rt._id}`);
      }
    }


    // save restaurant.yelpListing.url

    // const oldWeb = {};
    // const newWeb = {};
    // oldWeb[field] = event.oldValue;

    // const newValue = (event.newValue || '').trim();

    // if (field === 'url' && newValue) {
    //   try {
    //     await this._api.get(environment.appApiUrl + 'utils/check-url?url=' + newValue).toPromise();
    //   } catch {
    //     this._global.publishAlert(AlertType.Danger, 'Error: Please enter a valid website URL');
    //     return;
    //   }
    // }

  }

  async login(email) {
    try {
      const [account] = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmbAccount",
        query: {
          email: email
        },
        projection: {_id: 0, email: 1, cookies: 1 },
        limit: 1
      }).toPromise();

      if(!account) {
        throw `No account found for ${email}`;
      }

      await this._api.post(environment.autoGmbUrl + "login", { email, stayAfterScan: true, redirectUrl: 'https://mail.google.com', cookies: account.cookies }).toPromise();
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error scanning ' + email);
    }
  }


  async injectWebsite(rt) {
    try {
      if (rt.qmenuWebsite) {
        const [handlingAccount] = await this._api.get(environment.qmenuApiUrl + "generic", {
          resource: "gmbAccount",
          query: {
            "yelpLocations": {
              $elemMatch: {
                'yid': (rt.yid),
              }
            },
            "email": rt.yelpEmail
          },
          projection: { email: 1 },
          limit: 1
        }).toPromise();

        if (!handlingAccount) {
          this._global.publishAlert(AlertType.Danger, `No handling yelp account handling this restaurant`);
          return;
        }

        const email = handlingAccount.email;
        const yid = rt.yid;
        const newUrl = rt.qmenuWebsite;
        const isOwner = !!handlingAccount;

        // console.log({ email, yid, newUrl, isOwner });

        const result = await this._api.post(environment.appApiUrl + "yelp/generic", {
          name: "inject-website-address",
          payload: {
            email,
            yid,
            newUrl,
            isOwner
          }
        }).toPromise();

        // Roundtrip slow, if we got till here is ok shallow update ui
        // await this.refreshSingle(rt._id, rt.yid, email);

        const index = this.flatRows.findIndex(r => r.yid === rt.yid);
        this.flatRows[index].website == this.flatRows[index].qmenuWebsite;
        this._global.publishAlert(AlertType.Success, `Website url injected succesfully.. `);
      }

    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, `Error while injecting Yelp website.`);
    }

  }

}
