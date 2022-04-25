import { AlertType } from '../../../classes/alert-type';
import { GlobalService } from 'src/app/services/global.service';
import { Log } from '../../../classes/log';
import { ApiService } from 'src/app/services/api.service';
import { environment } from '../../../../environments/environment';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Helper } from "../../../classes/helper";
import { TimezoneHelper } from '@qmenu/ui';

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
  Tier1 = 'Tier 1',
  Tier2 = 'Tier 2',
  Tier3 = 'Tier 3',
  Non_Tier1 = 'Non-tier 1',
  Inactive_Last_30d = 'Inactive last 30d'
}

enum OPMSortOptions {
  All = 'OPM Sort By?',
  GMB_Sort = 'GMB Sort',
  Hist_Sort = 'Hist Sort'
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
      label: '#'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Score',
      sort: (a, b) => (a.score || 0) - (b.score || 0)
    },
    {
      label: 'Timezone (EST +/-)',
      paths: ['timezone'],
      sort: (a, b) => Number(this.getTimeOffsetByTimezone(a)) - Number(this.getTimeOffsetByTimezone(b))
    },
    {
      label: "Tier 1 Potential"
    },
    {
      label: 'Current Tier (OPM)',
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
    currentTier: '',
    OPMSort: ''
  };
  rows = [];
  list = [];
  loggingRT: any = {};
  logInEditing: Log = new Log({ type: WIN_BACK_CAMPAIGN_LOG_TYPE, time: new Date() });
  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.populate();
  }

  // our salesperson only wants to know what is the time offset
  // between EST and the location of restaurant
  getTimeOffsetByTimezone(timezone) {
    if (timezone) {
      let localTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), timezone);
      let ESTTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), 'America/New_York');
      let offset = (ESTTime.valueOf() - localTime.valueOf()) / (3600 * 1000);
      return offset > 0 ? "+" + offset.toFixed(0) : offset.toFixed(0);
    } else {
      return 'N/A';
    }
  }

  getTimezoneCity(timezone) {
    return (timezone || '').split('/')[1] || '';
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
    let data = [], skip = 0, size = 9000;
    let oc_fields = {};
    months.forEach(m => oc_fields[`OC${m}`] = 1);
    while (true) {
      const temp = await this._api.post(environment.biApiUrl + "smart-restaurant/api", {
        method: 'get', resource: 'unified_koreanbbqv2',
        query: { _id: { $exists: true } }, // any items
        payload: { _id: 0, bm_id: 1, rt_name: 1, qm_id: 1, ...oc_fields },
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

  pageHistories(list: any[]) {
    let size = 2, res = [];
    while (list.length > 0) {
      res.push(list.slice(0, size));
      list = list.slice(size);
    }
    return res;
  }

  async populate() {
    let months = this.getMonths();
    let rts = await this.getUnifiedData(months);

    let qmRTsDict = await this.getQmRTs(), last6Months = months.slice(months.length - 6);
    let rows = [];
    // first we merge data from unified and qm, filter RTs currently tier 2 or 3 but potentially tier 1
    rts.forEach(({ bm_id, qm_id, rt_name, ...rest }) => {
      let ordersPerMonth = last6Months.reduce((a, c) => a + (rest[`OC${c}`] || 0), 0) / 6;
      let tier = Helper.getTier(ordersPerMonth);
      if (tier <= 1) {
        if (qm_id) {
          if (qmRTsDict[qm_id] && !(qmRTsDict[qm_id].logs || []).some(log => log.type === WIN_BACK_CAMPAIGN_LOG_TYPE)) {
            return;
          }
        } else {
          return;
        }
      }
      let item: any = { name: rt_name, tier, ordersPerMonth, bm_id, qm_id, logs: [] };
      let gmb_potential = false;
      if (qm_id) {
        let qm_rt = qmRTsDict[qm_id];
        if (qm_rt) {
          let { logs, gmbPositiveScore, score, timezone, activity = {} } = qm_rt;
          item.logs = logs || [];
          gmbPositiveScore = gmbPositiveScore || {};
          item.gmbPositive = {
            score: gmbPositiveScore.ordersPerMonth || 0,
            orders: gmbPositiveScore.orders || 0,
            days: Math.round(gmbPositiveScore.duration / (1000 * 3600 * 24))
          }
          gmb_potential = Helper.getTier(gmbPositiveScore.ordersPerMonth) <= 1;
          item.score = score;
          item.timezone = timezone;
          item.activity = activity;
        }
      }
      // detect if rt has tier 1 perf in continuous 3 months in history
      let slide = [], slides = [];
      months.forEach(m => {
        let value = rest[`OC${m}`] || 0;
        if (Helper.getTier(value) <= 1) {
          slide.push({ month: m, value });
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
      let flatten = slides.map(s => {
        let start = s[0].month.split(''), end = s[s.length - 1].month.split('');
        start.splice(4, 0, '-');
        end.splice(4, 0, '-');
        let avg = s.reduce((a, c) => a + c.value, 0) / s.length;
        return { avg, start: start.join(''), end: end.join('') };
      });

      item.histories = this.pageHistories(flatten);
      item.histories.sort((a, b) => new Date(b.end).valueOf() - new Date(a.end).valueOf());
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
            activity: "$computed.activity",
            timezone: "$googleAddress.timezone",
            gmbPositiveScore: "$computed.gmbPositiveScore",
            score: 1,
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
      current_tier: CurrentTierOptions,
      opm_sort: OPMSortOptions
    }[key])
  }

  filter() {
    let list = this.rows;

    let { keyword, hasLogs, platform, potentialType, currentTier, OPMSort } = this.filters;
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
      case CurrentTierOptions.Tier1:
        list = list.filter(x => x.tier <= 1);
        break;
      case CurrentTierOptions.Tier2:
        list = list.filter(x => x.tier === 2);
        break;
      case CurrentTierOptions.Tier3:
        list = list.filter(x => x.tier === 3);
        break;
      case CurrentTierOptions.Non_Tier1:
        list = list.filter(x => x.tier === 2 || x.tier === 3);
        break;
      case CurrentTierOptions.Inactive_Last_30d:
        list = list.filter(x => x.activity.ordersInLast30Days === 0);
        break;
    }

    const kwMatch = str => str && str.toString().toLowerCase().includes(keyword.toLowerCase());

    if (keyword && keyword.trim()) {
      list = list.filter(x => kwMatch(x.name) || kwMatch(x.bm_id) || kwMatch(x.qm_id))
    }

    switch (OPMSort) {
      case OPMSortOptions.GMB_Sort:
        list.sort((a, b) => (b.gmbPositive || {}).score - (a.gmbPositive || {}).score);
        break;
      case OPMSortOptions.Hist_Sort:
        list.sort((a, b) => (b.histories[0] || {}).avg - (a.histories[0] || {}).avg);
        break;
    }

    this.list = list;
  }

  async addLog(item) {
    this.logInEditing = new Log({ type: WIN_BACK_CAMPAIGN_LOG_TYPE, time: new Date() });
    let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $oid: item.qm_id } },
      projection: { logs: 1, name: 1, log: 1, logo: 1, phones: 1, channels: 1, googleAddress: 1 },
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
    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{ old: { _id: this.loggingRT._id }, new: newRT }])
      .subscribe(result => {
        this._global.publishAlert(AlertType.Success, 'Log added successfully');
        event.formEvent.acknowledge(null);
        let index = this.rows.findIndex(x => x.qm_id === this.loggingRT._id);
        this.rows[index].logs = newRT.logs.filter(x => x.type === WIN_BACK_CAMPAIGN_LOG_TYPE);
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
