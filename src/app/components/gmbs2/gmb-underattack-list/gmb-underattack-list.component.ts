import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { TimezoneService } from '../../../services/timezone.service';
import { AlertType } from '../../../classes/alert-type';

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
      label: "Timezone"
    },
    {
      label: "Account"
    },
    {
      label: "Request Info"
    },
    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Logs"
    },
    {
      label: "Action"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, public _timezone: TimezoneService) {
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
        "logs.user": 1,
        "logs.date": 1,
        "logs.content": 1,
        checker: 1,
        checkedAt: 1
      },
    }, 6000);

    requests.map(req => req.date = new Date(req.date));
    requests.sort((r1, r2) => r2.date.valueOf() - r1.date.valueOf());

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
          logs: request.logs,
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
        // If the current request has one check and there's not one before (so we getting the newest check)
        if (request.checker && request.checkedAt && !dict[index].checker && !dict[index].checkedAt) {
          dict[index].checker = request.checker;
          dict[index].checkedAt = request.checkedAt;
        }
        // If there's a longer log, replace the log
        if (request.logs && (!dict[index].logs || request.logs.length > dict[index].logs.length)) {
          dict[index].logs = request.logs;
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
        "googleAddress.timezone": 1,
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
          entry['timezone'] = restaurant.googleAddress.timezone;
          entry['name'] = restaurant.name;
          entry['score'] = restaurant.score;
        }
      });
    });

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
      projection: { 
        checker: 1,
        checkedAt: 1,
        "logs.user": 1,
        "logs.date": 1,
        "logs.content": 1
      }
    }).toPromise();
    const newRequest = newRequests[0];
    // Find the corresponding UI row and update it
    const index = this.rows.findIndex(row => row.requestInfos[0]._id == requestId);
    if (index >= 0) {
      const newRow = this.rows[index];
      newRow['checker'] = newRequest['checker'];
      newRow['checkedAt'] = newRequest['checkedAt'];
      newRow['logs'] = newRequest['logs']; 
      this.rows[index] = newRow;
    }

    const index2 = this.filteredRows.findIndex(row => row.requestInfos[0]._id == requestId);
    if (index2 >= 0) {
      const newRow = this.filteredRows[index2];
      newRow['checker'] = newRequest['checker'];
      newRow['checkedAt'] = newRequest['checkedAt'];
      newRow['logs'] = newRequest['logs'];
      this.filteredRows[index2] = newRow;
    }
  }

  async addLog(r: any) {
    if (r.content) {
      try {
        // Copy and add the new log
        const newLog = JSON.parse(JSON.stringify(r.logs || []));
        newLog.push({
          user: this._global.user.username,
          date: new Date(),
          content: r.content
        });
        for (const requestInfo of r.requestInfos) {
          const oldData = {
            _id: requestInfo._id,
            logs: r.logs
          };
          const newData = {
            _id: requestInfo._id,
            logs: newLog
          };
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbRequest', [{ old: oldData, new: newData }]).toPromise();
        }
        this._global.publishAlert(AlertType.Success, `Log added succesfuly`);
        await this.refreshSingleEntry(r.requestInfos[0]._id);
      } catch (error) {
        console.error('error while adding comment.', error);
        this._global.publishAlert(AlertType.Danger, `Error while adding comment.`);
      }
      r.content = "";
    } else {
      console.error("Log cannot be blank");
      this._global.publishAlert(AlertType.Danger, `Log cannot be blank.`);
    }
  }  

  // Update the database to store the completion information
  async markRequestChecked(r: any) {
    if (confirm(`Are you sure to complete ${r.name ? r.name : "this restaurant"}?`)) {
      try {
        for (const requestInfo of r.requestInfos) {
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
        // await this.refreshSingleEntry(r.requestInfos[0]._id);
        r.content = 'marked COMPLETED';
        this.addLog(r);
      } catch (error) {
        console.error('error while marking request complete.', error);
        this._global.publishAlert(AlertType.Danger, `Error while marking request complete.`);
      }
    }
  }

  async markRequestUnchecked(r: any) {
    if (confirm(`Are you sure to redo ${r.name ? r.name : "this restaurant"}?`)) {
      try {
        for (const requestInfo of r.requestInfos) {
          const oldData = {
            _id: requestInfo._id,
            checker: r.checker,
            checkedAt: r.checkedAt
          };
          const newData = {
            _id: requestInfo._id,
          };
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbRequest', [{ old: oldData, new: newData }]).toPromise();
        }
        this._global.publishAlert(AlertType.Success, `Request marked incomplete succesfuly`);
        // await this.refreshSingleEntry(r.requestInfos[0]._id);
        r.content = 'reverted back to INCOMPLETED';
        this.addLog(r);
      } catch (error) {
        console.error('error while marking request incomplete.', error);
        this._global.publishAlert(AlertType.Danger, `Error while marking request incomplete.`);
      }
    }
  }

  createAngularIndentifiableArray(array) {
    if (array) {
      return Array.from(array);
    } else {
      return [];
    }
  }
}
