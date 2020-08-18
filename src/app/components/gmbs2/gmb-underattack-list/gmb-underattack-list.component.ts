import { Component, OnInit } from '@angular/core';
import { GmbRequest } from '../../../classes/gmb/gmb-request';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { Task } from '../../../classes/tasks/task';
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-gmb-underattack-list',
  templateUrl: './gmb-underattack-list.component.html',
  styleUrls: ['./gmb-underattack-list.component.css']
})
export class GmbUnderattackListComponent implements OnInit {

  rows = [];
  filteredRows = [];
  notShowComplete: boolean = false;
  pagination: boolean = true;
  averageRequestsPerDay = 0;
  numberOfRestaurant = 0;
  inConfirmPhase: boolean = false;

  now = new Date();
  apiLoading = false;

  myColumnDescriptors = [
    {
      label: "Number"
    },
    {
      label: "Restaurant Name"
    },
    {
      label: "Account"
    },
    {
      label: "Request Info"
    },
    // {
    //   label: "Requested At",
    //   paths: ['date'],
    //   sort: (a, b) => a.valueOf() - b.valueOf()
    // },
    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Completion Action"
    },
    // {
    //   label: "IDs"
    // }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.refresh();
    // this.test();
  }

  ngOnInit() {
  }

  async refresh() {
    this.apiLoading = false;
    this.now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log("Starting retrieving data");

    // Get Attacking Requests
    const requests = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbRequest',
      query: {
        isReminder: false,
        date: { $gte: { $date: sevenDaysAgo } },
        handledDate: {
          $exists: false
        }
      },
      projection: {
        _id: 1,
        place_id: 1,
        cid: 1,
        gmbAccountEmail: 1,
        requester: 1,
        email: 1,
        date: 1,
        checker: 1,
        checkedAt: 1
      },
    }, 6000);

    requests.map(req => req.date = new Date(req.date));
    requests.sort((r1, r2) => r2.date.valueOf() - r1.date.valueOf());

    console.log("Finished with requests");

    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        "locations.cid": 1,
        "locations.status": 1,
        "locations.role": 1
      },
    }, 6000);

    const myEmailSet = new Set(gmbAccounts.map(a => a.email));
    const myCidSet = new Set();
    gmbAccounts.map(account => (account.locations || []).map(loc => {
      if (loc.cid && loc.status === "Published" && ["OWNER", "CO_OWNER", "MANAGER"].indexOf(loc.role) >= 0) {
        myCidSet.add(loc.cid);
      }
    }));
    const attackingRequests = requests.filter(req => !myEmailSet.has(req.email) && myCidSet.has(req.cid));

    console.log("Finished with accounts");

    // Get Task
    const tasks = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: null,
        name: "GMB Request",
      },
      projection: {
        _id: 0,
        "relatedMap.place_id": 1,
        "request.statusHistory": { $slice: 1 },
        "request.statusHistory.isError": 1,
        "request.pinHistory": { $slice: 1 },
        "request.pinHistory.pin": 1,
      }
    }, 6000);

    // Filtered out requests we have pin 
    const safePlaceIdSet =
      new Set(tasks.filter(task => (!task.request.statusHistory || !task.request.statusHistory[0] ||
        !task.request.statusHistory[0].isError) &&
        task.request.pinHistory && task.request.pinHistory[0] && task.request.pinHistory[0].pin)
        .map(task => task.relatedMap.place_id));
    const totalTaskPlaceIdSet = new Set(tasks.map(task => task.relatedMap.place_id));
    const attackingIndangerRequests = attackingRequests.filter(request => totalTaskPlaceIdSet.has(request.place_id)
      && !safePlaceIdSet.has(request.place_id));
    console.log("Finished with tasks");

    // Get average attacks per day
    const firstAttackDate = new Date(attackingIndangerRequests[attackingIndangerRequests.length - 1].date);
    const lastAttackdate = new Date(attackingIndangerRequests[0].date);
    this.averageRequestsPerDay = Math.ceil(attackingIndangerRequests.length / (1 + (lastAttackdate.valueOf() - firstAttackDate.valueOf()) / (24 * 3600000)));

    // Group the requeset by restaurants, transform into table entries
    let dict = [];
    attackingIndangerRequests.map(request => {
      const index = dict.findIndex(entry => entry.place_id == request.place_id);
      if (index < 0) {
        dict.push({
          place_id: request.place_id,
          gmbAccountEmail: request.gmbAccountEmail,
          requestInfos: [{
            _id: request._id,
            requester: request.requester,
            email: request.email,
            date: request.date
          }],
          checker: request.checker,
          checkedAt: request.checkedAt
        });
      } else {
        dict[index].requestInfos.push({
          _id: request._id,
          requester: request.requester,
          email: request.email,
          date: request.date
        });
        // Doing this if one check in history will last forever
        // If the current request has one check and there's not one before (so we getting the newest check)
        if (request.checker && request.checkedAt && !dict[index].checker && !dict[index].checkedAt) {
          dict[index].checker = request.checker;
          dict[index].checkedAt = request.checkedAt;
        }
      }
    });

    // Get Restaurants
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "googleListing.place_id": { $exists: true },
      },
      projection: {
        _id: 1,
        "googleListing.place_id": 1,
        "googleAddress.formatted_address": 1,
        name: 1,
        score: 1
      }
    }, 6000);

    // Attach restaurt's information to the requests 
    dict.map(entry => {
      restaurants.map(restaurant => {
        if (entry.place_id == restaurant.googleListing.place_id) {
          entry['restaurantId'] = restaurant._id;
          entry['address'] = restaurant.googleAddress.formatted_address;
          entry['name'] = restaurant.name;
          entry['score'] = restaurant.score;
        }
      });
    });

    console.log("Finished with restaurants");

    this.rows = dict;
    this.apiLoading = false;
    this.filter();
  }

  // Filtering
  async filter() {
    this.filteredRows = this.rows;
    if (this.notShowComplete) {
      this.filteredRows = this.filteredRows.filter(row => !row.checker && !row.checkedAt);
    }
    // Update number of restaurant shown
    this.numberOfRestaurant = this.filteredRows.length;
  }

  // Refresh a single entry's completion status
  async refreshSingleEntry(requestId) {
    this.now = new Date();
    // Get the updated request information
    const newRequests = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "gmbRequest",
      query: { _id: { $oid: requestId } },
      projection: { checker: 1, checkedAt: 1 }
    }).toPromise();
    const newRequest = newRequests[0];
    // Find the corresponding UI row and update it
    const index = this.filteredRows.findIndex(row => row.requestInfos[0]._id == requestId);
    console.log("requestId is: " + requestId + " and the index is: " + index);
    if (index >= 0) {
      const newRow = this.filteredRows[index];
      newRow['checker'] = newRequest['checker'];
      newRow['checkedAt'] = newRequest['checkedAt'];
      this.filteredRows[index] = newRow;
      this.filter();
    }
  }

  // Update the database to store the completion information
  async markRequestChecked(requestInfos: any, name: string) {
    if (confirm(`Are you sure to complete ${name ? name : "this restaurant"}?`)) {
      try {
        for (const requestInfo of requestInfos) {
          const oldData = {
            _id: requestInfo._id
          };
          const newData = {
            _id: requestInfo._id,
            checker: this._global.user.username,
            checkedAt: new Date()
          };
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbRequest', [{ old: oldData, new: newData }]).toPromise();
        }
        this._global.publishAlert(AlertType.Success, `Request marked complete succesfuly`);
        await this.refreshSingleEntry(requestInfos[0]._id);
      } catch (error) {
        console.error('error creating broadcast', error);
        this._global.publishAlert(AlertType.Danger, `Error while marking request complete.`);
      }
    }
  }
}
