import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
@Component({
  selector: 'app-monitoring-gmb-open',
  templateUrl: './monitoring-gmb-open.component.html',
  styleUrls: ['./monitoring-gmb-open.component.css']
})
export class MonitoringGmbOpenComponent implements OnInit {

  openItems = [];
  openRestaurants = [];
  agentStats = {};
  gmbStats = {};
  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService) {
  }
  async ngOnInit() {
    this.populate();
  }

  async populate() {
    //non-disabled, never had GMB, without tasks, more than 30 days on platform

    const query = {
      disabled: { $ne: true },
      "googleListing.gmbOpenApi": true
    };

    const projection = {
      name: 1,
      "googleAddress.formatted_address": 1,
      "googleAddress.timezone": 1,
      alias: 1,
      disabled: 1,
      score: 1,
      gmbOrigin: 1,
      "googleListing.gmbOwner": 1,
      "googleListing.cid": 1,
      "googleListing.crawledAt": 1,
      createdAt: 1,
      "rateSchedules.agent": 1,
      "web.ignoreGmbOwnershipRequest": 1,
      "web.agreeToCorporate": 1
    }

    const gmbOpenRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: query,
      projection: projection,
    }, 500000)

    this.openItems = gmbOpenRestaurants.map(rt => ({
      rt: rt,
      salesResponsible: this.now.valueOf() - new Date(rt.createdAt).valueOf() < 40 * 24 * 3600000 && !rt.gmbOrigin,
      tasks: []
    }));

    const runningTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: null,
        "relatedMap.restaurantId": { $in: gmbOpenRestaurants.map(rt => rt._id) }
      },
      projection: {
        "relatedMap.restaurantId": 1,
        name: 1,
        "request.statusHistory": { $slice: 1 },
        "request.pinHistory": { $slice: 1 },
        "request.voHistory": { $slice: 1 },
        "request.verificationHistory": { $slice: 1 },
      },
      limit: 100000
    }).toPromise();

    // let's retrieve gmb-open event
    const gmbOpenEvents = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        "name": "gmb-open",
        // "params.gmbOpenApi": true,
      },
      projection: {
        "params.cid": 1,
        "createdAt": 1
      },
      limit: 3000000
    }).toPromise();

    // n^2 matching. we should use a dictionary if dataset is large.
    gmbOpenEvents.map(event => {
      this.openItems.map(item => {
        if (item.rt.googleListing.cid === event.params.cid) {
          item.openAt = event.createdAt;
        }
      });
    });

    this.openItems.sort((i2, i1) => i1.openAt - i2.openAt);

    // for each verificationOption, let's put a pending indicator
    runningTasks.map(task => {
      if (task.request && task.request.voHistory && task.request.voHistory[0] && task.request.verificationHistory && task.request.verificationHistory[0]) {
        task.request.voHistory[0].options.map(vo => {
          if (task.request.verificationHistory[0].verifications.some(v => v.method === vo.verificationMethod && v.state === "PENDING")) {
            vo.pending = true;
          }
        });
      }
    });


    // n^2 matching. we should use a dictionary if dataset is large.
    runningTasks.map(task => {
      this.openItems.map(item => {
        if (item.rt._id === task.relatedMap.restaurantId) {
          item.tasks.push(task);
        }
      });
    });

  }

}
