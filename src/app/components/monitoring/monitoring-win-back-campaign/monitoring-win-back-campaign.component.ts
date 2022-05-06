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
  GMB_Sort = 'GMB Sort',
  Hist_Sort = 'Hist Sort'
}

enum gmbOwnerOptions {
  Qmenu = 'Qmenu',
  BeyondMenu = 'Bmenu',
  Neither = 'Neither B nor Q',
  Either = 'Either B or Q'
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
    OPMSort: '',
    gmbOwner: ''
  };
  rows = [];
  list = [];
  loggingRT: any = {};
  logInEditing: Log = new Log({ type: WIN_BACK_CAMPAIGN_LOG_TYPE, time: new Date() });
  now = new Date();
  logVisibilities = {
    hidden: {}, expanded: {}
  }

  pagination = true;

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

  async getBMRTs() {
    let bmRTs = await this._api.post(environment.biApiUrl + "smart-restaurant/api", {
      method: 'get',
      resource: 'bm-sst-restaurants',
      query: {_id: { $exists: true }},
      payload: { _id: 0, BusinessEntityID: 1, Address: 1, City: 1, State: 1, ZipCode: 1, IsBmGmbControl: 1 },
      limit: 10000000
    }).toPromise();
    bmRTs = bmRTs.map(item => ({
      _bid: item.BusinessEntityID,
      baddress: `${item.Address}, ${item.City || ''}, ${item.State || ''} ${item.ZipCode || ''}`.trim(),
      bwebsite: item.CustomerDomainName,
      bhasGmb: item.IsBmGmbControl
    }));
    let bmRTsDict = {};
    bmRTs.forEach(item => {
      bmRTsDict[item._bid] = item
    });
    return bmRTsDict;
  }

  async populate() {
    let months = this.getMonths();
    let rts = await this.getUnifiedData(months);

    let qmRTsDict = await this.getQmRTs(), last6Months = months.slice(months.length - 6);
    let bmRTsDict = await this.getBMRTs();

    const gmbBiz = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: { cid: 1, gmbOwner: 1, qmenuId: 1, place_id: 1, gmbWebsite: 1 },
      limit: 1000000000
    }).toPromise();
    let gmbWebsiteOwnerDict = {}, gmbWebsiteDict = {};
    gmbBiz.forEach(({ cid, place_id, qmenuId, gmbOwner, gmbWebsite }) => {
      let key = place_id + cid;
      gmbWebsiteOwnerDict[key] = gmbOwner;
      if (qmenuId) {
        gmbWebsiteOwnerDict[qmenuId + cid] = gmbOwner;
      }
      gmbWebsiteDict[key] = gmbWebsite;
    });

    const accounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {},
      projection: { 'locations.cid': 1, 'locations.status': 1, 'locations.role': 1 }
    }, 500);

    let rows = [];
    // first we merge data from unified and qm, filter RTs currently tier 2 or 3 but potentially tier 1
    rts.forEach(({ bm_id, qm_id, rt_name, ...rest }) => {
      // filter qm rts
      if (qm_id && !qmRTsDict[qm_id]) {
        return;
      }
      let ordersPerMonth = last6Months.reduce((a, c) => a + (rest[`OC${c}`] || 0), 0) / 6;
      let tier = Helper.getTier(ordersPerMonth);
      if (tier <= 1) {
        if (qm_id) {
          if ((qmRTsDict[qm_id] && !(qmRTsDict[qm_id].logs || []).some(log => log.type === WIN_BACK_CAMPAIGN_LOG_TYPE))) {
            return;
          }
        } else {
          return;
        }
      }
      let item: any = { name: rt_name, tier, ordersPerMonth, bm_id, qm_id, logs: [], win_back_logs: [] };
      let gmb_potential = false;
      if (bm_id) {
        let bmRT = bmRTsDict[bm_id];
        if (bmRT) {
          item.address = bmRT.baddress;
          item.bhasGmb = bmRT.bhasGmb;
          item.googleSearchText = "https://www.google.com/search?q=" + encodeURIComponent(item.name + " " + item.address);
        }
      }
      if (qm_id) {
        let qm_rt = qmRTsDict[qm_id];
        if (qm_rt) {
          let { _id, logs, winBackLogs, gmbPositiveScore, score, timezone, activity = {}, address = '', place_id, cid } = qm_rt;
          item.logs = (logs || []).reverse();
          item.winBackLogs = (winBackLogs || []).reverse()
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
          item.address = address;
          let key = place_id + cid;
          item.qhasGmb = (gmbWebsiteOwnerDict[key] || gmbWebsiteOwnerDict[_id + cid]) && accounts.some(acc => (acc.locations || []).some(loc => loc.cid === cid && loc.status === 'Published' && ['PRIMARY_OWNER', 'OWNER', 'CO_OWNER', 'MANAGER'].includes(loc.role)));
          item.googleSearchText = "https://www.google.com/search?q=" + encodeURIComponent(item.name + " " + address);
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
      }).reverse();

      item.histories = this.pageHistories(flatten);
      item.lastestHistAvg = (flatten[0] || {} as any).avg || 0;
      rows.push(item);
    });
    this.rows = rows.filter(row => !/(-\s*\(?old\)?)|(\s*\(old\))/.test((row.name || '').toLowerCase().trim()));
    this.filter();
  }

  async getQmRTs() {
    const rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      aggregate: [
        {
          $project: {
            activity: "$computed.activity",
            timezone: "$googleAddress.timezone",
            address: "$googleAddress.formatted_address",
            place_id: "$googleListing.place_id",
            cid: '$googleListing.cid',
            gmbPositiveScore: "$computed.gmbPositiveScore",
            score: 1,
            logs: {$slice: ["$logs", -4]},
            winBackLogs: {
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
    }, 2000);

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
      opm_sort: OPMSortOptions,
      gmb_owner: gmbOwnerOptions
    }[key])
  }

  filter() {
    let list = this.rows;

    let { keyword, hasLogs, platform, potentialType, currentTier, OPMSort, gmbOwner } = this.filters;
    switch (platform) {
      case PlatformOptions.Qmenu:
        list = list.filter(x => !!x.qm_id);
        break;
      case PlatformOptions.Bmenu:
        list = list.filter(x => !!x.bm_id);
        break;
    }

    switch (gmbOwner) {
      case gmbOwnerOptions.Qmenu:
        list = list.filter(x => x.qhasGmb);
        break;
      case gmbOwnerOptions.BeyondMenu:
        list = list.filter(x => x.bhasGmb);
        break;
      case gmbOwnerOptions.Neither:
        list = list.filter(x => !x.qhasGmb && !x.bhasGmb);
        break;
      case gmbOwnerOptions.Either:
        list = list.filter(x => x.qhasGmb || x.bhasGmb);
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
        list = list.filter(x => (x.activity || {}).ordersInLast30Days === 0);
        break;
    }

    const kwMatch = str => str && str.toString().toLowerCase().includes(keyword.toLowerCase());

    if (keyword && keyword.trim()) {
      list = list.filter(x => kwMatch(x.name) || kwMatch(x.bm_id) || kwMatch(x.qm_id))
    }


    switch (OPMSort) {
      case OPMSortOptions.GMB_Sort:
        list.sort((a, b) => ((b.gmbPositive || {}).score || 0) - ((a.gmbPositive || {}).score || 0));
        break;
      case OPMSortOptions.Hist_Sort:
        list.sort((a, b) => b.lastestHistAvg - a.lastestHistAvg);
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
        this.rows[index].logs = newRT.logs.reverse();
        this.rows[index].winBackLogs = newRT.logs.filter(x => x.type === WIN_BACK_CAMPAIGN_LOG_TYPE);
        this.rows[index].logsLoaded = true;
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

  async moreLogs(item) {
    if (item.logsLoaded) {
      this.logVisibilities.expanded[item.qm_id] = true;
      return;
    }
    let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $oid: item.qm_id } },
      projection: { logs: 1 },
      limit: 1
    }).toPromise();
    let index = this.rows.findIndex(x => x.qm_id === item.qm_id);
    this.rows[index].logs = restaurant.logs.reverse();
    this.rows[index].logsLoaded = true;
    this.logVisibilities.expanded[item.qm_id] = true;
  }

}
