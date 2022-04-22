import { AlertType } from '../../../classes/alert-type';
import { GlobalService } from 'src/app/services/global.service';
import { Log } from '../../../classes/log';
import { ApiService } from 'src/app/services/api.service';
import { environment } from '../../../../environments/environment';
import { Component, OnInit, ViewChild } from '@angular/core';
import {Helper} from "../../../classes/helper";

enum Tier1PotentialTypeOptions {
  GMB_Based = 'GMB-based',
  History_Based = 'History-based'
}

enum PlatformOptions {
  Qmenu = 'Qmenu',
  Bmenu = 'BeyondMenu'
}

enum HasLogsOptions {
  NoLogs = 'No logs',
  HasLogs = 'Has logs'
}

enum CurrentTierOptions {
  Tier2 = 'Tier 2',
  Tier3 = 'Tier 3'
}

const WIN_BACK_CAMPAIGN_LOG_TYPE = 'winback-campaign'

@Component({
  selector: 'app-monitoring-win-back-campaign',
  templateUrl: './monitoring-win-back-campaign.component.html',
  styleUrls: ['./monitoring-win-back-campaign.component.css']
})
export class MonitoringWinBackCampaignComponent implements OnInit {
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
  filters = {
    keyword: '',
    potentialType: '',
    platform: '',
    hasLogs: '',
    currentTier: ''
  };
  rows = [];
  filteredRows = [];
  activeRow;
  logInEditing: Log = new Log({ type: WIN_BACK_CAMPAIGN_LOG_TYPE, time: new Date() });
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
  }

  getMonths() {
    let months = [], cursor = new Date('2019-01-01'), now = new Date();
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    while (cursor.valueOf() < now.valueOf()) {
      let y = cursor.getFullYear(), m = cursor.getMonth() + 1;
      months.push(`${y}${Helper.padNumber(m)}`);
      cursor.setMonth(m);
    }
    return months;
  }

  async getUnifiedData() {
    let months = this.getMonths();
    let oc_fields = {};
    months.forEach(m => oc_fields[`OC${m}`] = 1);
    let rts = await this._api.post(environment.biApiUrl + "smart-restaurant/api", {
      method: 'get',
      resource: 'unified_koreanbbqv2',
      query: {_id: {$exists: true}}, // any items
      payload: {_id: 0, bm_id: 1, qm_id: 1, ...oc_fields},
      limit: 10000000
    }).toPromise();

    let qmRTsDict = await this.getQmRTs();
    this.rows = [];
    let last6Months = [...months].reverse().slice(0, 6);
    // first we merge data from unified and qm, filter RTs currently tier 2 or 3 but potentially tier 1
    rts.forEach(rt => {
      let orders = last6Months.reduce((a, c) => a + (rt[`OC${c}`] || 0), 0);

      if (rt.qm_id) {
        let qms = qmRTsDict[rt.qm_id];
      }
    });


  }

  async getQmRTs() {
    const rts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      aggregate: [
        {
          $project: {
            name: 1,
            timezone: "$googleAddress.timezone",
            gmbPositiveScore: "$computed.gmbPositiveScore.ordersPerMonth",
            logs: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: {
                  $eq: ['$$log.type', WIN_BACK_CAMPAIGN_LOG_TYPE]
                }
              }
            }
          }
        }
      ],
    }).toPromise();
    const dict = {};
    rts.forEach(rt => dict[rt._id] = rt);
    return dict;
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
  }

  async addLog(row) {
    this.logInEditing = new Log({ type: WIN_BACK_CAMPAIGN_LOG_TYPE, time: new Date() });
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
