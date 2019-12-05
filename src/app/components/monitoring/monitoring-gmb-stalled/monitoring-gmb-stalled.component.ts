import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
@Component({
  selector: 'app-monitoring-gmb-stalled',
  templateUrl: './monitoring-gmb-stalled.component.html',
  styleUrls: ['./monitoring-gmb-stalled.component.css']
})
export class MonitoringGmbStalledComponent implements OnInit {

  stalledRestaurants = [];
  agentStats = {};
  gmbStats = {};
  constructor(private _api: ApiService, private _global: GlobalService) {
  }
  async ngOnInit() {
    this.populate();
  }

  async populate() {
    //non-disabled, never had GMB, without tasks, more than 30 days on platform
    const enabledRestaurants = [];
    const batchSize = 4000;
    let skip = 0;
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          disabled: { $in: [null, false] }
        },
        projection: {
          name: 1,
          "googleAddress.formatted_address": 1,
          "googleAddress.timezone": 1,
          alias: 1,
          disabled: 1,
          "googleListing.cid": 1,
          "googleListing.gmbOwner": 1,
          createdAt: 1,
          "rateSchedules.agent": 1,
          "web.ignoreGmbOwnershipRequest": 1,
          "web.agreeToCorporate": 1
        },
        skip: skip,
        limit: batchSize
      }).toPromise();
      if (batch.length === 0) {
        break;
      }
      enabledRestaurants.push(...batch);
      skip += batchSize;
    }

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const newerRestaurants = enabledRestaurants.filter(rt => new Date(rt.createdAt) > new Date('2018-09-6') && new Date(rt.createdAt) < monthAgo);

    let gmbAccountBatchSize = 100;
    const gmbAccounts = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        query: {
          locations: { $exists: 1 }
        },
        projection: {
          "locations.cid": 1,
          "locations.status": 1,
          "locations.statusHistory": 1
        },
        skip: gmbAccounts.length,
        limit: gmbAccountBatchSize
      }).toPromise();
      gmbAccounts.push(...batch);
      if (batch.length === 0 || batch.length < gmbAccountBatchSize) {
        break;
      }
    }

    const cidLocationMap = {};
    gmbAccounts.map(acct => acct.locations.map(loc => {
      cidLocationMap[loc.cid] = cidLocationMap[loc.cid] || {};
      const gmbOnceOwned = loc.statusHistory.some(h => h.status === 'Published'); // || h.status === 'Suspended');

      const statusOrder = ['Suspended', 'Published'];
      const status = statusOrder.indexOf(cidLocationMap[loc.cid].status) > statusOrder.indexOf(loc.status) ? cidLocationMap[loc.cid].status : loc.status;

      cidLocationMap[loc.cid].status = status;
      cidLocationMap[loc.cid].gmbOnceOwned = cidLocationMap[loc.cid].gmbOnceOwned || gmbOnceOwned;

      // ONLY count location history with at least Published status
      if (loc.statusHistory.some(s => s.status === 'Published')) {
        const firstStatus = cidLocationMap[loc.cid].firstStatus || { time: new Date() };
        const thisLocFirstStatus = loc.statusHistory[loc.statusHistory.length - 1];
        if (thisLocFirstStatus && new Date(thisLocFirstStatus.time) < new Date(firstStatus.time)) {
          cidLocationMap[loc.cid].firstStatus = thisLocFirstStatus;
        }
      }
    }));

    const neverGmbRestaurants = newerRestaurants.filter(rt => !(cidLocationMap[(rt.googleListing || {}).cid || '123'] || {}).gmbOnceOwned);

    const runningGmbRequestTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'GMB Request',
        result: null
      },
      projection: {
        "relatedMap.cid": 1
      },
      limit: 100000
    }).toPromise();

    const havingTaskCids = runningGmbRequestTasks.reduce((myset, t) => (myset.add(t.relatedMap.cid)), new Set());

    const nonQmenuRestaurants = neverGmbRestaurants.filter(rt => rt.googleListing && rt.googleListing.gmbOwner !== 'qmenu');

    const notSkipAll = nonQmenuRestaurants.filter(rt => !rt.web || (!rt.web.ignoreGmbOwnershipRequest && rt.web.agreeToCorporate !== "No"));

    this.stalledRestaurants = notSkipAll.filter(rt => rt.googleListing && rt.googleListing.cid && !havingTaskCids.has(rt.googleListing.cid));
    // non-qmenu ones

    // sort by date, desc
    this.stalledRestaurants.sort((rt1, rt2) => new Date(rt2.createdAt).valueOf() - new Date(rt1.createdAt).valueOf());
    this.agentStats = {};
    this.gmbStats = {};
    this.stalledRestaurants.map(rt => {
      const agent = ((rt.rateSchedules || []).slice(-1)[0] || {}).agent;
      this.agentStats[agent] = (this.agentStats[agent] || 0) + 1;
      const gmbOwner = (rt.googleListing || {}).gmbOwner;
      this.gmbStats[gmbOwner] = (this.gmbStats[gmbOwner] || 0) + 1;
    });
  }

}
