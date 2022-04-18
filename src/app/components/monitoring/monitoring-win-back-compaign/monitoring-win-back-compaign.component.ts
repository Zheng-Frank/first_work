import { AlertType } from './../../../classes/alert-type';
import { GlobalService } from 'src/app/services/global.service';
import { Log } from './../../../classes/log';
import { ApiService } from 'src/app/services/api.service';
import { environment } from './../../../../environments/environment.qa';
import { Component, OnInit, ViewChild } from '@angular/core';

enum tier1PotentialTypes {
  All = 'Tier 1 Potential Types?',
  GMB_Based = 'GMB-based',
  History_Based = 'History-based'
}

@Component({
  selector: 'app-monitoring-win-back-compaign',
  templateUrl: './monitoring-win-back-compaign.component.html',
  styleUrls: ['./monitoring-win-back-compaign.component.css']
})
export class MonitoringWinBackCompaignComponent implements OnInit {
  @ViewChild('logEditingModal') logEditingModal;
  restaurantsColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Tier 1 Potential (orders across GMB duration)"
    },
    {
      label: 'Current Tier (orders/mo)',
      paths: ['tier'],
      sort: (a, b) => a - b
    },
    {
      label: "Logs",
    }
  ];
  tier1PotentialOptions = [tier1PotentialTypes.All, tier1PotentialTypes.GMB_Based, tier1PotentialTypes.History_Based];
  tier1PotentialOption = tier1PotentialTypes.All;
  rows = [];
  filteredRows = [];
  activeRow;
  winbackLogType = 'tier-1-winback';
  logInEditing: Log = new Log({ type: this.winbackLogType, time: new Date() });
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.populateWinBackRTs();
  }

  get tier1PotentialTypes() {
    return tier1PotentialTypes;
  }

  async populateWinBackRTs() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      aggregate: [
        {
          $match: {
            "computed.activities": {
              $exists: true
            },
            "computed.gmbPositiveScore": {
              $exists: true
            }
          }
        },
        {
          $project: {
            name: 1,
            "googleAddress.timezone": 1,
            tier: {
              $slice: ["$computed.tier", 1]
            },
            activities: "$computed.activities",
            gmbPositiveScore: "$computed.gmbPositiveScore",
            logs: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: {
                  $eq: ['$$log.type', this.winbackLogType]
                }
              }
            }
          }
        }
      ],
    }).toPromise();
    // generate tier data
    restaurants.forEach(rt => {
      // compute tier of rt
      let latest = ((rt.computed || {}).tier || [])[0];
      rt.tier = this.getTier(latest ? latest.ordersPerMonth : 0);
      // compute isTier1HistPerf
      // 1. fill short data in activities of rt object
      let activities = [...Object.entries(rt.activities)];
      activities.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
      let firstOrderTime = new Date(`${activities[0][0][0]}${activities[0][0][1]}${activities[0][0][2]}${activities[0][0][3]}-${activities[0][0][4]}${activities[0][0][5]}`);
      let endOrderTime = new Date();
      let tempActivities = [];
      while (firstOrderTime.valueOf() <= endOrderTime.valueOf()) {
        let time = `${firstOrderTime.getFullYear()}${firstOrderTime.getMonth() < 9 ? "0" + (firstOrderTime.getMonth() + 1) : (firstOrderTime.getMonth() + 1)}`;
        let index = activities.findIndex(activity => activity[0] === time);
        let item = [index >= 0 ? activities[index][0] : time, index >= 0 ? activities[index][1] : 0];
        tempActivities.push(item);
        firstOrderTime.setMonth(firstOrderTime.getMonth() + 1);
      }
      // Find out whether there are orders with more than 40 orders for more than 3 consecutive months in history.
      //  Record a variable and save it temporarily
      // example: tempActivities is [["201612",0],["201701",22],["201703",9],["201704",52],["201705",10]...]
      let count = 0;
      for (let i = 0; i < tempActivities.length; i++) {
        let activity = tempActivities[i];
        if (count >= 2) {
          break;
        }
        if (i < tempActivities.length - 1) {
          if (activity[1] > 40 && tempActivities[i + 1][1] > 40) {
            count++;
          } else {
            count = 0;
          }
        }
      }
      rt.isTier1HistPerf = count >= 2;
      // compute histPerfLast3Month
      rt.histPerfLast3Month = Math.ceil((tempActivities[tempActivities.length - 4][1] + tempActivities[tempActivities.length - 3][1] + tempActivities[tempActivities.length - 2][1] + tempActivities[tempActivities.length - 1][1]) / 3);
    });
    this.rows = restaurants;
    this.filterRows();
  }

  getTier(ordersPerMonth = 0) {
    if (ordersPerMonth > 125) { // VIP
      return 0;
    }
    if (ordersPerMonth > 40) {
      return 1;
    }
    if (ordersPerMonth > 4) {
      return 2;
    }
    return 3;
  }

  filterRows() {
    this.filteredRows = this.rows;
    if (this.tier1PotentialOption !== tier1PotentialTypes.All) {
      if (this.tier1PotentialOption === tier1PotentialTypes.GMB_Based) {
        this.filteredRows = this.filteredRows.filter(row => row.gmbPositiveScore.ordersPerMonth > 40);
      } else if (this.tier1PotentialOption === tier1PotentialTypes.History_Based) {
        this.filteredRows = this.filteredRows.filter(row => row.isTier1HistPerf);
      }
    }
  }

  async addLog(row) {
    this.logInEditing = new Log({ type: this.winbackLogType, time: new Date() });
    this.activeRow = row;
    let [restaurant] = await this.getRestaurant(this.activeRow._id);
    this.activeRow.logs = restaurant.logs || [];
    this.logEditingModal.show();
  }

  // load old logs of restaurant which need to be updated to ensure the integrity of data.
  async getRestaurant(rtId) {
    let restaurant = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: {
          $oid: rtId
        }
      },
      projection: {
        logs: 1
      },
      limit: 1
    }).toPromise();
    return restaurant;
  }

  onSuccessAddLog(event) {
    event.log.time = event.log.time ? event.log.time : new Date();
    event.log.username = event.log.username ? event.log.username : this._global.user.username;
    this.activeRow.logs.push(event.log);

    const newRestaurant = { _id: this.activeRow._id, logs: [...this.activeRow.logs] };

    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{
        old: { _id: this.activeRow._id },
        new: { _id: newRestaurant._id, logs: newRestaurant.logs }
      }]).subscribe(result => {
        this._global.publishAlert(AlertType.Success, 'Log added successfully');
        event.formEvent.acknowledge(null);
        this.logEditingModal.hide();
      },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error while adding log');
          event.formEvent.acknowledge('Error while adding log');
        }
      );
  }

  onCancelAddLog() {
    this.logEditingModal.hide();
  }

}
