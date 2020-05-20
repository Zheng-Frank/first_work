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
  rows = [];
  isAdmin = false;
  // showUnmatching = false;
  restaurants = [];
  tasks = [];
  flatRows = [];
  filteredRows = [];
  pagination = true;
  refreshing = false;
  restaurantStatus = "All";
  currentUser = '';
  username = '';

  myColumnDescriptors = [
    {
      label: '#'
    },
    {
      label: "qMemu Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Restaurant ID'
    },
    {
      label: 'Score',
      paths: ['rating'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: 'Agent',
    },
    {
      label: 'Yelp Account',
      paths: ['gmb_email'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Yelp YID',
    },
    {
      label: 'Yelp Status',
      paths: ['claimedStatus'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Websites'
    },
    {
      label: 'Task'
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.refresh();
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
    this.username = this._global.user.username;
  }

  ngOnInit() {

  }

  isTaskAssigned(yid) {
    return (this.tasks.filter(t => (t.relatedMap.yelpId === yid) && (t.assignee !== undefined)).length > 0);
  }

  isTaskClosed(yid) {
    return (this.tasks.filter(t => (t.relatedMap.yelpId === yid) && (t.result === 'CLOSED')).length > 0)
  }

  getAssigneeName(yid) {
    const [task] = this.tasks.filter(t => (t.relatedMap.yelpId === yid));
    if(task) {
      return task.assignee;
    }
  }

  isTaskAssignee(yid) {
    return (this.tasks.filter(t => (t.relatedMap.yelpId === yid) && (t.assignee === this.username)).length > 0)
  }

  canTaskBeDone(yid) {
    return !this.isTaskAssigned(yid) && !this.isTaskClosed(yid);
  }

  async assignYelpTask(id, name, yid) {
    const randomAccount = await this.getRandomAccount();

    if(!randomAccount || !randomAccount.email) {
      this._global.publishAlert(AlertType.Danger, 'No accounts found!');
      return;
    }

    const yelpTask = {
      name: 'Yelp Request',
      scheduledAt: { $date: new Date() },
      description: `Claim task for yelp ID: ${yid}`,
      roles: ['GMB', 'ADMIN'],
      relatedMap: { restaurantId: id, yelpId: yid, email: randomAccount.email },
      assignee: this.username,
      comments: `Yelp Id: ${yid}`,
      
    };

    // console.log(yelpTask);

    await this._api.post(environment.qmenuApiUrl + 'generic?resource=task', [yelpTask]).toPromise();

    this.refresh();
  }

  async refresh() {
    this.refreshing = true;
    this.restaurants = [];
    // --- restaurant
    const restaurantBatchSize = 3000;
    let restaurantSkip = 0;

    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
        },
        projection: {
          name: 1,
          yelpListing: 1,
          googleAddress: 1,
          rateSchedules: 1,
          disabled: 1
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

    // --- tasks
    this.tasks = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "task",
      query: {
        name: { "$eq": "Yelp Request" },
      }
    }, 8000);

    this.rows = this.restaurants.filter(rt => rt.yelpListing !== undefined && rt.disabled !== true);
    console.log(this.tasks);

    this.flatRows = this.rows.map(row => {
      return {
        _id: row._id,
        name: row.name,
        score: row.yelpListing ? row.yelpListing.score : '-',
        gmb_email: row.yelpListing ? row.yelpListing.gmb_email : '-',
        claimedStatus: row.yelpListing ? row.yelpListing.claimedStatus : '-',
        rating: row.yelpListing ? row.yelpListing.rating : '-',
        qmenuWebsite: row.web ? row.web.qmenuWebsite : '-',
        website: row.yelpListing ? row.yelpListing.website : '-',
        ...row
      }
    })
    this.refreshing = false;
    this.filter();
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

    switch (this.restaurantStatus) {
      case 'Open':
        this.filteredRows = this.rows.filter(r => r.yelpListing.claimedStatus === 'Open').map(r => {
          return {
            claimedStatus: r.yelpListing ? r.yelpListing.claimedStatus : '-',
            ...r
          }
        });
        break;

      case 'Unclaimable':
        this.filteredRows = this.rows.filter(r => r.yelpListing.claimedStatus === 'Unclaimable').map(r => {
          return {
            claimedStatus: r.yelpListing ? r.yelpListing.claimedStatus : '-',
            ...r
          }
        });
        break;

      case 'Reclaimable':
        this.filteredRows = this.rows.filter(r => r.yelpListing.claimedStatus === 'Reclaimable').map(r => {
          return {
            claimedStatus: r.yelpListing ? r.yelpListing.claimedStatus : '-',
            ...r
          }
        });
        break;

      case 'Unknown':
        this.filteredRows = this.rows.filter(r => r.yelpListing.claimedStatus === 'Unknown').map(r => {
          return {
            claimedStatus: r.yelpListing ? r.yelpListing.claimedStatus : '-',
            ...r
          }
        });
        break;

      case 'Error':
        this.filteredRows = this.rows.filter(r => r.yelpListing.claimedStatus === 'Error').map(r => {
          return {
            claimedStatus: r.yelpListing ? r.yelpListing.claimedStatus : '-',
            ...r
          }
        });
        break;

      default:
        this.filteredRows = this.rows.map(row => {
          return {
            _id: row._id,
            name: row.name,
            score: row.yelpListing ? row.yelpListing.score : '-',
            gmb_email: row.yelpListing ? row.yelpListing.gmb_email : '-',
            claimedStatus: row.yelpListing ? row.yelpListing.claimedStatus : '-',
            rating: row.yelpListing ? row.yelpListing.rating : '-',
            qmenuWebsite: row.web ? row.web.qmenuWebsite : '-',
            website: row.yelpListing ? row.yelpListing.website : '-',
            ...row
          }
        });
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
    const result = this.tasks.filter(t => t.relatedMap.yelpId === yid);
    console.log(result);
  }

  async claim(rt, yid) {
    try {
      const accountEmail = this.getTaskEmail(yid);

      // if(!accountEmail) {
      //   this._global.publishAlert(AlertType.Danger, 'Failed to login');
      //   return;
      // }

      // if (rt.yelpListing) {
      //   const target = 'claim-yelp';
      //   const { city, zip_code, country, state, street } = rt.yelpListing.location;
      //   const [streetShortened] = street.split('\n')
      //   const location = `${streetShortened}, ${city}, ${state} ${zip_code}, ${country}`;

      //   await this._api.post(environment.autoGmbUrl + target, { email, name: rt.yelpListing.name, location }).toPromise();
      //   this._global.publishAlert(AlertType.Success, 'Logged in.');
      // }
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed to login');
    }
  }


}
