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
  list = [];
  loggingRT: any = {};
  logInEditing: Log = new Log({ type: WIN_BACK_CAMPAIGN_LOG_TYPE, time: new Date() });
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.populate();
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

  async getUnifiedData(months) {
    let data = [], skip = 0, size = 8000;
    let oc_fields = {};
    months.forEach(m => oc_fields[`OC${m}`] = 1);
    while (true) {
      const temp = await this._api.post(environment.biApiUrl + "smart-restaurant/api", {
        method: 'get', resource: 'unified_koreanbbqv2',
        query: { _id: { $exists: true } }, // any items
        payload: {_id: 0, bm_id: 1, rt_name: 1, qm_id: 1, ...oc_fields},
        skip, limit: size
      }).toPromise();
      data.push(...temp);
      if (temp.length === size) {
        skip += size;
      } else {
        break;
      }
    }
    return data;
  }

  async populate() {
    let months = this.getMonths();
    let rts = await this.getUnifiedData(months);

    let qmRTsDict = await this.getQmRTs(), last6Months = months.slice(months.length - 6);
    let rows = [];
    // first we merge data from unified and qm, filter RTs currently tier 2 or 3 but potentially tier 1
    rts.forEach(({bm_id, qm_id, rt_name, ...rest}) => {
      let ordersPerMonth = last6Months.reduce((a, c) => a + (rest[`OC${c}`] || 0), 0) / 6;
      let tier = Helper.getTier(ordersPerMonth);
      if (tier <= 1) {
        return;
      }
      let item: any = {name: rt_name, tier, ordersPerMonth, bm_id, qm_id, logs: []};
      let gmb_potential = false;
      if (qm_id) {
        let qm_rt = qmRTsDict[qm_id];
        if (qm_rt) {
          let { logs, gmbPositiveScore } = qm_rt;
          item.logs = logs || [];
          gmbPositiveScore = gmbPositiveScore || {};
          item.gmbPositive = {
            score: gmbPositiveScore.ordersPerMonth || 0,
            orders: gmbPositiveScore.orders || 0,
            days: Math.round(gmbPositiveScore.duration / (1000 * 3600 * 24))
          }
          gmb_potential = Helper.getTier(gmbPositiveScore.ordersPerMonth) <= 1;
        }
      }
      // detect if rt has tier 1 perf in continuous 3 months in history
      let slide = [], slides = [];
      months.forEach(m => {
        let value = rest[`OC${m}`] || 0;
        if (Helper.getTier(value) <= 1) {
          slide.push({month: m, value});
        } else {
          if (slide.length > 3) {
            slides.push(slide)
          }
          slide = [];
        }
      })
      if (!gmb_potential && !slides.length) {
        return;
      }
      item.histories = slides.map(s => {
        let start = s[0].month, end = s[s.length - 1].month;
        let avg = s.reduce((a, c) => a + c.value, 0) / s.length;
        return {avg, start, end};
      });
      rows.push(item);
    });

    this.rows = rows;
    this.filter();
  }

  async getQmRTs() {
    const rts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      aggregate: [
        {
          $project: {
            timezone: "$googleAddress.timezone",
            gmbPositiveScore: "$computed.gmbPositiveScore",
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

  dropdowns(key) {
    return Object.values({
      platform: PlatformOptions,
      potential_type: Tier1PotentialTypeOptions,
      has_logs: HasLogsOptions,
      current_tier: CurrentTierOptions
    }[key])
  }

  filter() {
    let list = this.rows;
    let { keyword, hasLogs, platform, potentialType, currentTier } = this.filters;
    switch (platform) {
      case PlatformOptions.Qmenu:
        list = list.filter(x => !!x.qm_id);
        break;
      case PlatformOptions.Bmenu:
        list = list.filter(x => !!x.bm_id);
        break;
    }
    switch (potentialType) {
      case Tier1PotentialTypeOptions.GMB_Based:
        list = list.filter(x => x.gmbPositive && x.gmbPositive.score > 40);
        break;
      case Tier1PotentialTypeOptions.History_Based:
        list = list.filter(x => x.histories.length > 0);
        break;
    }
    switch (hasLogs) {
      case HasLogsOptions.HasLogs:
        list = list.filter(x => x.logs.length > 0);
        break;
      case HasLogsOptions.NoLogs:
        list = list.filter(x => x.logs.length === 0);
        break;
    }
    switch (currentTier) {
      case CurrentTierOptions.Tier2:
        list = list.filter(x => x.tier === 2);
        break;
      case CurrentTierOptions.Tier3:
        list = list.filter(x => x.tier === 3);
        break;
    }

    const kwMatch = str => str && str.toString().toLowerCase().includes(keyword.toLowerCase());

    if (keyword && keyword.trim()) {
      list = list.filter(x => kwMatch(x.name) || kwMatch(x.bm_id) || kwMatch(x.qm_id))
    }
    this.list = list;
  }

  async addLog(item) {
    this.logInEditing = new Log({ type: WIN_BACK_CAMPAIGN_LOG_TYPE, time: new Date() });
    let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {_id: {$oid: item.qm_id}},
      projection: {logs: 1, name: 1},
      limit: 1
    }).toPromise();
    this.loggingRT = restaurant;
    this.logEditingModal.show();
  }

  onSuccessAddLog(event) {
    event.log.time = event.log.time ? event.log.time : new Date();
    event.log.username = event.log.username ? event.log.username : this._global.user.username;

    const newRT = JSON.parse(JSON.stringify(this.loggingRT));
    newRT.logs.push(event.log);

    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{old: { _id: this.loggingRT._id }, new: newRT}])
      .subscribe(result => {
        this._global.publishAlert(AlertType.Success, 'Log added successfully');
        event.formEvent.acknowledge(null);
        this.logEditingModal.hide();
        this.loggingRT = {};
      },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error while adding log');
          event.formEvent.acknowledge('Error while adding log');
        }
      );
  }

  onCancelAddLog() {
    this.logEditingModal.hide();
    this.loggingRT = {};
  }

}
