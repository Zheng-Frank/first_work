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
  // isAdmin = false;
  // showUnmatching = false;
  restaurants = [];
  // tasks = [];
  accounts = [];
  flatRows = [];
  filteredRows = [];
  allLocations = [];
  pagination = false;
  refreshing = false;
  restaurantStatus = "All";
  // currentUser = '';
  // username = '';

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
    // {
    //   label: 'Websites'
    // },
    {
      label: 'Yelp Account',
      paths: ['gmb_email'],
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
      label: 'Actions'
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.refresh();
    // this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
    // this.username = this._global.user.username;
  }

  ngOnInit() {

  }

  hasSameAddress(googleFormattedAddress, yelpFormattedAddress) {
    return googleFormattedAddress === yelpFormattedAddress;
  }

  isTaskAssigned(yid) {
    // return (this.tasks.filter(t => (t.relatedMap.yelpId === yid) && (t.assignee !== undefined)).length > 0);
  }

  isTaskClosed(yid) {
    // return (this.tasks.filter(t => (t.relatedMap.yelpId === yid) && (t.result === 'CLOSED')).length > 0)
  }

  getAssigneeName(yid) {
    // const [task] = this.tasks.filter(t => (t.relatedMap.yelpId === yid));
    // if (task) {
    //   return task.assignee;
    // }
  }

  isTaskAssignee(yid) {
    // return (this.tasks.filter(t => (t.relatedMap.yelpId === yid) && (t.assignee === this.username)).length > 0)
  }

  canTaskBeDone(yid) {
    // return !this.isTaskAssigned(yid) && !this.isTaskClosed(yid);
  }

  async assignYelpTask(id, name, yid) {
    const randomAccount = await this.getRandomAccount();

    if (!randomAccount || !randomAccount.email) {
      this._global.publishAlert(AlertType.Danger, 'No accounts found!');
      return;
    }

    const yelpTask = {
      name: 'Yelp Request',
      scheduledAt: { $date: new Date() },
      description: `Claim task for yelp ID: ${yid}`,
      roles: ['GMB', 'ADMIN'],
      relatedMap: { restaurantId: id, yelpId: yid, email: randomAccount.email },
      // assignee: this.username,
      comments: `Yelp Id: ${yid}, Email: ${randomAccount.email}`,

    };

    // console.log(yelpTask);

    await this._api.post(environment.qmenuApiUrl + 'generic?resource=task', [yelpTask]).toPromise();

    this.refresh();
  }

  async refresh() {
    this.refreshing = true;
    this.restaurants = [];

    // --- restaurant
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
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
        "web.qmenuWebsite": 1
      },
    }, 3000);

    // --- tasks
    // this.tasks = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
    //   resource: "task",
    //   projection: {
    //     assignee: 1,
    //     result: 1,
    //     "relatedMap.yelpId": 1,
    //     "relatedMap.email": 1,
    //     "relatedMap.restaurantId": 1,

    //   },
    //   query: {
    //     name: { "$eq": "Yelp Request" },
    //   }
    // }, 8000);

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
      return {
        _id: row._id,
        yid: row.yelpListing.yid,
        qMenuName: row.name,
        yelpName: row.yelpListing.name,
        score: row.yelpListing.score,
        claimedStatus: row.yelpListing.claimedStatus,
        rating: row.yelpListing.rating,
        qmenuWebsite: row.web ? row.web.qmenuWebsite : '',
        website: row.yelpListing.website,
        url: row.yelpListing.url,
        googleFormattedAddress: row.googleAddress ? row.googleAddress.formatted_address.replace(', USA', '') : '',
        isSameAddress: this.hasSameAddress(row.googleAddress ? row.googleAddress.formatted_address.replace(', USA', '') : '', this.getYelpFormattedAddress(row.yelpListing.location)),
        location: row.yelpListing.location,
        isClaimTaskClosed: this.isTaskClosed(row.yelpListing.yid),
        isRTPublished: this.isPublished(row.yelpListing.yid)
      }
    });

    this.refreshing = false;
    this.filter();
  }

  isPublished(yid) {
    return this.allLocations.some(loc => {
      return yid === loc.yid;
    });
  }

  getPublishedAccount(yid) {
    for (const account of this.accounts) {
      if(account.yelpLocations) {
        const [match] = account.yelpLocations.filter(l => l.yid === yid);
        if(match) {
          return account.email;
        }
      }
    }
  }


  async filter() {
    //  if(this.showUnmatching) {
    //    this.rows = this.rows.filter(rt => {
    //     const notMatchingName = rt.yelpListing.name !== rt.name;

    //     let [choppedAddress] = rt.yelpListing.location.street.split('\n');
    //     const yelpFormattedAddress = `${choppedAddress}, ${rt.yelpListing.location.city}, ${rt.yelpListing.location.state} ${rt.yelpListing.location.zip_code}`;
    //     const notMatchingAddress = rt.googleAddress.formatted_address.replace(', USA', '').replace(', US', '') !== yelpFormattedAddress;

    //     return notMatchingAddress;
    //    }
    //    )
    //  }
    //  else {
    //   this.rows = this.restaurants.filter(rt => rt.yelpListing != undefined);
    //  }

    this.refreshing = false;

    // dont show CLOSED tasks
    // this.flatRows = this.flatRows.filter(r => r.isClaimTaskClosed === false);

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

  getYelpFormattedAddress(location) {
    let [choppedAddress] = location.street.split('\n');
    const yelpFormattedAddress = `${choppedAddress}, ${location.city}, ${location.state} ${location.zip_code}`;

    return yelpFormattedAddress;
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

  getTaskEmail(yid) {
    // const [result] = this.tasks.filter(t => t.relatedMap.yelpId === yid); // hashmap
    // if (result) {
    //   return result.relatedMap.email;
    // }
  }

  async claim(rt, yid) {
    try {
      // const accountEmail = this.getTaskEmail(yid);

      // if (!accountEmail) {
      //   this._global.publishAlert(AlertType.Danger, 'Failed to login');
      //   return;
      // }

      const target = 'claim-yelp';
      const { city, zip_code, country, state, street } = rt.location;
      const [streetShortened] = street.split('\n')
      const location = `${streetShortened}, ${city}, ${state} ${zip_code}, ${country}`;

      await this._api.post(environment.autoGmbUrl + target, { email: 'sharonhjrivera@gmail.com', name: rt.qMenuName, location }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Logged in.');
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed to login');
    }
  }


}
