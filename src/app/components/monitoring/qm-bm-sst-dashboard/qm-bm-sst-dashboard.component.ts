import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from "../../../services/api.service";
import {environment} from "../../../../environments/environment";
import {PagerComponent} from '@qmenu/ui/bundles/qmenu-ui.umd';
import {Helper} from '../../../classes/helper';
import { saveAs } from "file-saver/FileSaver";
declare var $: any;

enum PlatformOptions {
  BmOnly = 'BM Only',
  QmOnly = 'QM Only',
  Both = 'Both'
}

enum ActiveDefinitions {
  NotDisabled = 'Not disabled',
  ActivityInLast30Days = 'Activity in last 30 days'
}

enum StatusOptions {
  UpOnly = 'Active only',
  EitherUp = 'Active in at least Q or B',
  BothUp = 'Active both',
  QmUp = 'Active QM',
  BmUp = 'Active BM',
  BmUpQmDown = 'Active BM / Inactive QM',
  QmUpBmDown = 'Active QM / Inactive BM',
  BothDown = 'Inactive both',
  QmDown = 'Inactive QM',
  BmDown = 'Inactive BM'
}

enum TierOptions {
  Tier1Either = 'Tier 1 (B or Q)',
  Tier2Either = 'Tier 2 (B or Q)',
  Tier3Either = 'Tier 3 (B or Q)',
  Tier1Both = 'Tier 1 (Both)',
  Tier2Both = 'Tier 2 (Both)',
  Tier3Both = 'Tier 3 (Both)',
  Unknown = 'Unknown'
}

enum PlaceIdOptions {
  Has = 'Has place_id',
  Missing = 'Missing place_id'
}

enum RTsNameOptions {
  Same = 'Q/B Same name',
  Diff = 'Q/B Diff name'
}

enum GMBStatusOptions {
  BmOwned = 'BM Owned',
  QmOwned = 'QM Owned',
  BmOrQmOwned = 'BM or QM Owned',
  NeitherOwned = 'Neither BM/QM Owned'
}

enum GMBWebsiteOptions {
  Bm = 'BM',
  Qm = 'QM',
  BmOrQm = 'BM or QM',
  Other = 'Other'
}

enum PostmatesOptions {
  HasInQm = 'Has Postmates in QM',
  NoInQm = 'No Postmates in QM',
  Available = 'Postmates available',
  Unavailable = 'Postamtes unavailable'
}

enum PricingOptions {
  BmHigher = 'BM Pricing Higher',
  QmHigher = 'QM Pricing Higer',
  BmEqQm = 'QM=BM Pricing'
}

enum SalesPerspectiveOptions {
  BM = 'BM Sales',
  QM = 'QM Sales'
}

enum SalesWorthinessOptions {
  Worthy = 'Sales-worthy',
  NotWorthy = 'NOT Sales-worthy'
}

enum KPIPeriodOptions {
  Yearly = 'Yearly',
  Quarterly = 'Quarterly',
  Monthly = 'Monthly'
}

@Component({
  selector: 'app-qm-bm-sst-dashboard',
  templateUrl: './qm-bm-sst-dashboard.component.html',
  styleUrls: ['./qm-bm-sst-dashboard.component.css']
})
export class QmBmSstDashboardComponent implements OnInit {

  @ViewChild('myPager1') myPager1: PagerComponent;
  @ViewChild('myPager2') myPager2: PagerComponent;
  filteredRows = [];

  filters = {
    keyword: '',
    platform: '',
    status: StatusOptions.UpOnly.toString(),
    activeDefinition: ActiveDefinitions.ActivityInLast30Days.toString(),
    hasPlaceId: '',
    sameName: '',
    tier: '',
    gmbStatus: '',
    postmates: '',
    pricing: '',
    perspective: '',
    worthiness: '',
    gmbWebsite: ''
  }

  sumBmActiveOnly = true;
  sumQmActiveOnly = true;
  sumOPMLevel = 100;
  summary = {
    overall: [],
    both: [],
    qmOnly: [],
    bmOnly: [],
    bmAll: [],
    qmAll: []
  }

  pageIndex = 0;
  pageSize = 200;
  viabilities = [];
  qmRTs = [];
  bmRTs = [];
  unionRTs = [];
  qmRTsPlaceDict = {};
  qmRTsPhoneDict = {};
  bmRTsPlaceDict = {};
  bmRTsPhoneDict = {};
  showPricing = false;
  showPhones = false;
  showOtherContacts = false;
  showSummary = false;
  showKPI = false;
  showPostmatesStatus = false;
  showSalesWorthiness = false;
  kpiFilters = {
    normal: {
      platform: PlatformOptions.Both,
      period: KPIPeriodOptions.Yearly
    },
    over: {
      platform: PlatformOptions.Both,
      period: KPIPeriodOptions.Yearly
    }
  };
  kpi = {};

  constructor(private _api: ApiService) { }

  async ngOnInit() {
    $("[data-toggle='tooltip']").tooltip();
    await this.getViabilities();
    await this.preload();
    await this.getUnifiedStats();
  }

  getKPIHeaders(type: 'normal' | 'over') {
    return Object.keys(this.kpi[this.kpiFilters[type].period]);
  }

  kpiNormalDownload() {
    let [gmvs, ocs, ars, aovs] = this.getKpiNormalList();
    let { period } = this.kpiFilters.normal;
    let headers = Object.keys(this.kpi[period]);
    let lines = [['', ...headers].join(',')];
    lines.push(['GMV $', ...gmvs].join(','));
    lines.push(['Order count', ...ocs].join(','));
    lines.push(['Active RT count', ...ars].join(','));
    lines.push(['AOV $', ...aovs].join(','));
    let filename = period + '_kpi_stats_part_1.csv';
    saveAs(new Blob([lines.join('\n')], { type: "application/octet-stream" }), filename);
  }

  kpiOverDownload() {
    let [gmvs, ocs, ars, aovs] = this.getKpiOverList();
    let { period } = this.kpiFilters.over;
    let headers = Object.keys(this.kpi[period]);
    let lines = [['', ...headers].join(',')];
    let label = this.getKpiLabel();
    lines.push(['GMV ' + label, ...gmvs.map(x => Helper.roundDecimal(x * 100) + '%')].join(','));
    lines.push(['Order count ' + label, ...ocs.map(x => Helper.roundDecimal(x * 100) + '%')].join(','));
    lines.push(['Active RT count ' + label, ...ars.map(x => Helper.roundDecimal(x * 100) + '%')].join(','));
    lines.push(['AOV ' + label, ...aovs.map(x => Helper.roundDecimal(x * 100) + '%')].join(','));
    let filename = period + '_kpi_stats_part_2.csv';
    saveAs(new Blob([lines.join('\n')], { type: "application/octet-stream" }), filename);
  }

  getKpiNormalList() {
    let { period, platform } = this.kpiFilters.normal;
    let headers = Object.keys(this.kpi[period]);
    let gmvs = [], ocs = [], aovs = [], ars = [];
    headers.forEach(key => {
      let { gmv, oc, ar } = this.kpi[period][key];
      let tmpGmv = this.getKpiDataByPlatform(gmv, platform);
      let tmpOc = this.getKpiDataByPlatform(oc, platform);
      let tmpAr = this.getKpiDataByPlatform(ar, platform);
      gmvs.push(Helper.roundDecimal(tmpGmv));
      ocs.push(tmpOc);
      ars.push(tmpAr);
      aovs.push(Helper.roundDecimal((tmpGmv / tmpOc)));
    })
    return [gmvs, ocs, ars, aovs];
  }

  getKpiDataByPlatform(data, platform) {
    return {
      [PlatformOptions.BmOnly]: data.bm,
      [PlatformOptions.QmOnly]: data.qm,
      [PlatformOptions.Both]: data.both
    }[platform];
  }

  getKpiLabel() {
    return { [KPIPeriodOptions.Yearly]: 'YoY', [KPIPeriodOptions.Quarterly]: 'QoQ', [KPIPeriodOptions.Monthly]: 'MoM' }[this.kpiFilters.over.period];
  }

  getKpiOverList() {
    let { period, platform } = this.kpiFilters.over;
    let headers = Object.keys(this.kpi[period]);
    let gmvs = [], ocs = [], aovs = [], ars = [];
    for (let i = 0; i < headers.length; i++) {
      let cur = headers[i], prev = headers[i - 1];
      let { gmv, oc, ar } = this.kpi[period][cur];
      let curGmv = this.getKpiDataByPlatform(gmv, platform);
      let curOc = this.getKpiDataByPlatform(oc, platform);
      let curAov = curGmv / curOc;
      let curAr = this.getKpiDataByPlatform(ar, platform);
      if (prev) {
        let prevTmp = this.kpi[period][prev];
        let prevGmv = this.getKpiDataByPlatform(prevTmp.gmv, platform);
        let prevOc = this.getKpiDataByPlatform(prevTmp.oc, platform);
        let prevAr = this.getKpiDataByPlatform(prevTmp.ar, platform);
        gmvs.push((curGmv - prevGmv) / prevGmv);
        ocs.push((curOc - prevOc) / prevOc);
        let prevAov = prevGmv / prevOc;
        aovs.push((curAov - prevAov) / prevAov);
        ars.push((curAr - prevAr) / prevAr);
      } else {
        gmvs.push(1);
        ocs.push(1);
        aovs.push(1);
        ars.push(1);
      }
    }
    return [gmvs, ocs, ars, aovs];
  }

  async getUnifiedData() {
    let data = [], skip = 0, size = 3000;
    const ocs = ["OC201901", "OC201902", "OC201903", "OC201904", "OC201905", "OC201906", "OC201907", "OC201908", "OC201909", "OC201910", "OC201911", "OC201912", "OC202001", "OC202002", "OC202003", "OC202004", "OC202005", "OC202006", "OC202007", "OC202008", "OC202009", "OC202010", "OC202011", "OC202012", "OC202101", "OC202102", "OC202103", "OC202104", "OC202105", "OC202106", "OC202107", "OC202108", "OC202109", "OC202110", "OC202111", "OC202112", "OC202201", "OC202202", "OC202203"];
    const gmvs = ["GMV201901", "GMV201902", "GMV201903", "GMV201904", "GMV201905", "GMV201906", "GMV201907", "GMV201908", "GMV201909", "GMV201910", "GMV201911", "GMV201912", "GMV202001", "GMV202002", "GMV202003", "GMV202004", "GMV202005", "GMV202006", "GMV202007", "GMV202008", "GMV202009", "GMV202010", "GMV202011", "GMV202012", "GMV202101", "GMV202102", "GMV202103", "GMV202104", "GMV202105", "GMV202106", "GMV202107", "GMV202108", "GMV202109", "GMV202110", "GMV202111", "GMV202112", "GMV202201", "GMV202202", "GMV202203"];
    let payload = {_id: 1, bm_id: 1, matched_qm_id: 1};
    [...ocs, ...gmvs].forEach(f => payload[f] = 1);
    while (true) {
      const temp = await this._api.post(environment.biApiUrl + "smart-restaurant/api", {
        method: 'get',
        resource: 'unified_koreanbbq',
        query: {_id: {$exists: true}}, // any items
        payload, skip,
        limit: size
      }).toPromise();
      if (temp.length > 0) {
        data.push(...temp);
        skip += size;
      } else {
        break;
      }
    }
    return data;
  }

  async getUnifiedStats() {
    const data = await this.getUnifiedData();
    const dict = {[KPIPeriodOptions.Yearly]: {}, [KPIPeriodOptions.Monthly]: {}, [KPIPeriodOptions.Quarterly]: {}};
    const accumulate = (cat: KPIPeriodOptions, key, {id, bid, qid, oc, gmv}) => {
      let temp = dict[cat][key] || { gmv: {qm: 0, bm: 0, both: 0}, oc: {qm: 0, bm: 0, both: 0}, ar: {qm: new Set(), bm: new Set(), both: new Set()} };
      if (bid) {
        temp.oc.bm += oc;
        temp.gmv.bm += gmv;
        if (oc > 0) {
          temp.ar.bm.add(id);
        }
      }
      if (qid) {
        temp.oc.qm += oc;
        temp.gmv.qm += gmv;
        if (oc > 0) {
          temp.ar.qm.add(id);
        }
      }
      temp.oc.both += oc;
      temp.gmv.both += gmv;
      if (oc > 0) {
        temp.ar.both.add(id);
      }
      dict[cat][key] = temp;
    }
    const getMonths = (fields: string[]): string[] => Array.from(new Set(fields.map(f => f.replace(/\D+/, '')))).filter(x => !!x);

    const Months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    data.forEach(row => {
      let months = getMonths(Object.keys(row));
      months.forEach(ym => {
        let tmp = {id: row._id, bid: row.bm_id, qid: row.matched_qm_id, oc: row[`OC${ym}`] || 0, gmv: row[`GMV${ym}`] || 0};
        let year = ym.substr(0, 4), mon = ym.substr(4);
        let quarter = Math.ceil(Number(mon) / 3), shortYear = year.substr(2);
        accumulate(KPIPeriodOptions.Monthly, shortYear + ' ' + Months[Number(mon) - 1], tmp);
        accumulate(KPIPeriodOptions.Quarterly, shortYear + ' ' + 'Q' + quarter, tmp);
        accumulate(KPIPeriodOptions.Yearly, year, tmp);
      })
    });
    [KPIPeriodOptions.Yearly, KPIPeriodOptions.Quarterly, KPIPeriodOptions.Monthly].forEach(cat => {
      // @ts-ignore
      Object.entries(dict[cat]).forEach(([period, {ar: {qm, bm, both}}]) => {
        dict[cat][period].ar = {qm: qm.size, bm: bm.size, both: both.size};
      })
    })
    this.kpi = dict;
  }

  countByOrdersPerMonth(list) {
    let num = list.filter(rt => rt.ordersPerMonth >= this.sumOPMLevel).length;
    return `${num} (${num ? (Math.round((num / list.length) * 10000) / 100) : 0}%)`
  }
  countByTier(list, tier) {
    let num = list.filter(rt => this.getEiterTier(rt) === tier).length;
    return `${num} (${num ? (Math.round((num / list.length) * 10000) / 100) : 0}%)`
  }

  calcSummary() {
    this.summary.overall = this.filteredRows;
    this.summary.both = this.filteredRows.filter(({_id, _bid}) => _id && _bid);
    this.summary.qmOnly = this.filteredRows.filter(({_id, place_id}) => _id && !this.bmRTsPlaceDict[place_id])
    this.summary.bmOnly = this.filteredRows.filter(({_bid, bplace_id}) => _bid && !this.qmRTsPlaceDict[bplace_id])
    this.summary.qmAll = this.filteredRows.filter(({_id, disabled}) => !!_id && (!this.sumQmActiveOnly || !disabled))
    this.summary.bmAll = this.filteredRows.filter(({_bid, bdisabled}) => !!_bid && (!this.sumBmActiveOnly || !bdisabled))
  }

  paginate(index) {
    this.pageIndex = index;
    this.myPager1.currentPageNumber = index;
    this.myPager2.currentPageNumber = index;
  }

  dropdowns(key) {
    return Object.values({
      platform: PlatformOptions,
      active_definition: ActiveDefinitions,
      status: StatusOptions,
      tier: TierOptions,
      place_id: PlaceIdOptions,
      name: RTsNameOptions,
      gmb: GMBStatusOptions,
      gmb_website: GMBWebsiteOptions,
      postmates: PostmatesOptions,
      pricing: PricingOptions,
      perspective: SalesPerspectiveOptions,
      worthiness: SalesWorthinessOptions,
      kpi_period: KPIPeriodOptions
    }[key])
  }

  async preload() {
    try {

      // --- qMenu restaurants
      this.qmRTs = (await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: "restaurant",
        aggregate: [
          {
            $project: {
              place_id: "$googleListing.place_id",
              address: "$googleAddress.formatted_address",
              cid: '$googleListing.cid',
              disabled: 1,
              website: "$web.qmenuWebsite",
              name: 1,
              courier: '$courier.name',
              lat: '$googleAddress.lat',
              lng: '$googleAddress.lng',
              createdAt: "$createdAt",
              owner: "$googleListing.gmbOwner",
              channels: 1,
              ordersPerMonth: '$computed.tier.ordersPerMonth'
            }
          }
        ],
      }, 6000));

      const gmbBiz = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {cid: 1, gmbOwner: 1, qmenuId: 1, place_id: 1, gmbWebsite: 1},
        limit: 1000000000
      }).toPromise();
      let gmbWebsiteOwnerDict = {}, gmbWebsiteDict = {};
      gmbBiz.forEach(({cid, place_id, qmenuId, gmbOwner, gmbWebsite}) => {
        let key = place_id + cid;
        gmbWebsiteOwnerDict[key] = gmbOwner;
        if (qmenuId) {
          gmbWebsiteOwnerDict[qmenuId + cid] = gmbOwner;
        }
        gmbWebsiteDict[key] = gmbWebsite;
      })

      const accounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        query: {},
        projection: {'locations.cid': 1, 'locations.status': 1, 'locations.role': 1}
      }, 500);

      let date = new Date();
      date.setDate(date.getDate() - 30);
      const rtsHasOrder = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        aggregate: [
          {$match: {createdAt: {$gte: {$date: date}}}},
          {$group: {_id: {rt: '$restaurant'}}},
          {$project: {rtId: "$_id.rt", _id: 0}}
        ]
      }).toPromise();
      let rtsHasOrderSet = new Set(rtsHasOrder.map(x => x.rtId));

      this.qmRTs.forEach(rt => {
        if (rt.place_id) {
          this.qmRTsPlaceDict[rt.place_id] = rt;
        }
        let key = rt.place_id + rt.cid;
        // active: has order in last 30 days
        rt.inactive = !rtsHasOrderSet.has(rt._id);
        rt.tier = this.getTier(rt.ordersPerMonth)

        rt.hasGmb = (gmbWebsiteOwnerDict[key] || gmbWebsiteOwnerDict[rt._id + rt.cid]) && accounts.some(acc => (acc.locations || []).some(loc => loc.cid === rt.cid && loc.status === 'Published' && ['PRIMARY_OWNER', 'OWNER', 'CO_OWNER', 'MANAGER'].includes(loc.role)))
        rt.hasGMBWebsite = gmbWebsiteOwnerDict[key] === 'qmenu' || gmbWebsiteOwnerDict[rt._id + rt.cid] === 'qmenu';

        rt.postmatesAvailable = this.postmatesAvailable(rt)
        if (rt.channels && rt.channels.length > 0) {
          let mainChannel = rt.channels.find(({type, notifications}) => type === 'Phone' && (notifications || []).includes('Business'));
          if (!mainChannel) {
            mainChannel = rt.channels.find(({type}) => type === 'Phone');
          }
          if (mainChannel) {
            rt.mainPhone = mainChannel.value;
            this.qmRTsPhoneDict[rt.mainPhone] = rt;
          }
        }
      });
      // --- BeyondMenu restaurants
      let bmRTs = await this._api.post(environment.gmbNgrok + 'get-bm-restaurant').toPromise();
      this.bmRTsPlaceDict = {};
      this.bmRTs = bmRTs.map(item => {
        // --- phone and cellphone
        const channels = [];
        [1, 2, 3, 4].map(num => {
          if (item[`Phone${num}`]) {
            channels.push({ type: 'Phone', value: item[`Phone${num}`]});
          }
          if (item[`CellPhone${num}`]) {
            channels.push({ type: 'Phone', value: item[`CellPhone${num}`]});
          }
        });
        let place_id = item.GooglePlaceID;
        let {TierDec2021, TierNov2021, TierOct2021} = item;
        let pricing = [
          "OrderFixedFeePerOrder", "CreditCardFixedFeePerOrder", "OrderMonthlyFee", "CreditCardFeePercentage",
          "AmexFeePercentage", "FaxUnitPrice", "PhoneUnitPrice", "OrderCommissionPercentage", "OrderCommissionMaximum",
          "ReservationCommissionAmount", "ReservationCommissionMaximum"
        ].filter(k => !!item[k]).map(k => `${k}: ${item[k]}`).join(', ')
        let data = {
          _bid: item.BusinessEntityID,
          bplace_id: item.GooglePlaceID,
          baddress: `${item.Address}, ${item.City || ''}, ${item.State || ''} ${item.ZipCode || ''}`.trim(),
          bdisabled: !item.Active,
          bwebsite: item.CustomerDomainName,
          bname: item.BusinessName,
          bowner: 'beyondmenu',
          bhasGmb: item.IsBmGmbControl,
          bchannels: channels,
          bmainPhone: item.Phone1,
          createdAt: item.createdAt,
          btier: Math.floor((TierDec2021 + TierNov2021 + TierOct2021) / 3),
          bpricing: pricing
        }

        if (place_id) {
          this.bmRTsPlaceDict[place_id] = data;
        }
        if (item.Phone1) {
          this.bmRTsPhoneDict[item.Phone1] = data;
        }
        return data;
      });
      // 1. Match by google place_id (already the case)
      // 2. followed by main phone number to the extent the first type of matching didn't produce a match.
      let bmOnly = this.bmRTs.filter(({bplace_id, bmainPhone}) => (!bplace_id || !this.qmRTsPlaceDict[bplace_id]) && (!bmainPhone || !this.qmRTsPhoneDict[bmainPhone]));
      this.unionRTs = [...this.qmRTs, ...bmOnly].map(x => {
        let item = {...x, ...(this.bmRTsPlaceDict[x.place_id]) || this.bmRTsPhoneDict[x.mainPhone] || {}};
        item.worthy = item._bid && (item.bdisabled || !item.bhasGmb);
        item.bworthy = item._id && (item.disabled || (!item.hasGmb && !item.hasGMBWebsite))
        return item;
      });
      console.log('gmb conflict...', this.unionRTs.filter(x => x.hasGmb && x.bhasGmb).map(({_id, _bid}) => ({_id, _bid})));
      this.filter();
    } catch (error) {
      console.error(error);
    }
  }

  async getViabilities() {
    this.viabilities = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "viability-lookup",
      query: {},
      projection: {
        'Branch Name': 1,
        'Addresses': 1,
        Latitude: 1,
        Longitude: 1,
        Viability: 1
      },
      limit: 20000
    }).toPromise();
  }

  getDistance(lat1, lng1, lat2, lng2) {
    let radLat1 = lat1 * Math.PI / 180.0;
    let radLat2 = lat2 * Math.PI / 180.0;
    let a = radLat1 - radLat2;
    let b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
    let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    s = s * 6378.137; // EARTH_RADIUS;
    s = Math.round(s * 10000) / 10000;
    // The distance to call return is in miles.
    s = s * 0.62137; // 1 kilometre is 0.62137 mile.
    return s;
  }

  postmatesAvailable({lat, lng}) {
    let distances = [];
    this.viabilities.forEach(item => {
      if (item.Latitude && item.Longitude) {
        const distance = this.getDistance(lat, lng, item.Latitude, item.Longitude)
        distances.push(distance);
      } else {
        distances.push(Number.MAX_VALUE);
      }
    });
    let minDistance = Math.min(...distances), index = distances.indexOf(minDistance);
    return minDistance < 0.5 && (['V1', 'V2', 'V3', 'V4'].includes(this.viabilities[index].Viability));
  }

  getTier(ordersPerMonth) {
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

  getPlaceId(row) {
    if (row.place_id && !row.hide) {
      return row.place_id;
    }
    if (row.bplace_id && !row.bhide) {
      return row.bplace_id;
    }
    return 'N/A';
  }

  getTierColor(tier = 3, btier = 3) {
    return ['bg-info', "bg-success", "bg-warning", "bg-danger"][Math.min(tier, btier)]
  }

  getEiterTier(rt) {
    let qt = rt.tier || 3, bt = rt.btier || 3;
    return Math.min(qt, bt)
  }

  getWorthy(rt) {
    switch (this.filters.perspective) {
      case SalesPerspectiveOptions.QM:
        if (rt._id) {
          return 'N/A'
        }
        return rt.worthy ? `<i class="mb-3 fa fa-thumbs-up text-success"></i>` : `<i class="mb-3 fa fa-thumbs-down text-warning"></i>`
      case SalesPerspectiveOptions.BM:
        if (rt._bid) {
          return 'N/A'
        }
        return rt.bworthy ? `<i class="mb-3 fa fa-thumbs-up text-success"></i>` : `<i class="mb-3 fa fa-thumbs-down text-warning"></i>`
    }
  }

  worthyFilter(list, perspective, worthiness) {
    if (perspective) {
      let field = {[SalesPerspectiveOptions.BM]: 'bworthy', [SalesPerspectiveOptions.QM]: 'worthy'}[perspective]
      let id = {[SalesPerspectiveOptions.BM]: '_bid', [SalesPerspectiveOptions.QM]: '_id'}[perspective]
      if (worthiness) {
        if (worthiness === SalesWorthinessOptions.Worthy) {
          list = list.filter(rt => !rt[id] && rt[field])
        } else {
          list = list.filter(rt => !rt[id] && !rt[field])
        }
      }
    } else {
      this.filters.worthiness = ''
      this.showSalesWorthiness = false;
    }
    return list;
  }

  getInactiveField() {
    // default to use ActivityInLast30Days
    return {
      [ActiveDefinitions.ActivityInLast30Days]: 'inactive',
      [ActiveDefinitions.NotDisabled]: 'disabled'
    }[this.filters.activeDefinition] || 'inactive';
  }

  filter() {
    let {
      platform, status, tier, hasPlaceId,
      sameName, gmbStatus, gmbWebsite, pricing, postmates,
      perspective, worthiness, keyword
    } = this.filters;
    let list = this.unionRTs;
    switch (platform) {
      case PlatformOptions.Both:
        list = list.filter(({_id, _bid}) => _id &&  _bid);
        break;
      case PlatformOptions.BmOnly:
        list = list.filter(({_id, _bid, bplace_id}) => !_id && _bid && !this.qmRTsPlaceDict[bplace_id])
        break;
      case PlatformOptions.QmOnly:
        list = list.filter(({_id, _bid, place_id}) => _id && !_bid && !this.bmRTsPlaceDict[place_id])
        break;
    }

    let inActiveField = this.getInactiveField();
    switch (status) {
      case StatusOptions.UpOnly:
        list = list.filter(row => (row._id && !row[inActiveField]) || (row._bid && !row.bdisabled))
          .map(row => ({
            ...row,
            hide: row._id && row[inActiveField],
            bhide: row._bid && row.bdisabled
          }));
        break;
      case StatusOptions.EitherUp:
        list = list.filter(row => (row._id && !row[inActiveField]) || (row._bid && !row.bdisabled));
        break;
      case StatusOptions.BothUp:
        list = list.filter(row => row._id && !row[inActiveField] && row._bid && !row.bdisabled);
        break;
      case StatusOptions.QmUp:
        list = list.filter(row => row._id && !row[inActiveField]);
        break;
      case StatusOptions.BmUp:
        list = list.filter(row => row._bid && !row.bdisabled);
        break;
      case StatusOptions.BmUpQmDown:
        list = list.filter(row => row._id && row._bid && !row.bdisabled && row[inActiveField]);
        break;
      case StatusOptions.QmUpBmDown:
        list = list.filter(row => row._id && row._bid && !row[inActiveField] && row.bdisabled);
        break;
      case StatusOptions.BothDown:
        list = list.filter(row => row._id && row.bdisabled && row._bid && row[inActiveField]);
        break;
      case StatusOptions.QmDown:
        list = list.filter(row => row._id && row[inActiveField]);
        break;
      case StatusOptions.BmDown:
        list = list.filter(row => row._bid && row.bdisabled);
        break;
    }

    switch (hasPlaceId) {
      case PlaceIdOptions.Has:
        list = list.filter(({place_id, bplace_id}) => place_id || bplace_id)
        break;
      case PlaceIdOptions.Missing:
        list = list.filter(({place_id, bplace_id}) => !place_id && !bplace_id)
        break;
    }

    switch (sameName) {
      case RTsNameOptions.Same:
        list = list.filter(({name, bname}) => name === bname);
        break;
      case RTsNameOptions.Diff:
        list = list.filter(({name, bname}) => name && bname && name !== bname);
        break;
    }

    switch (tier) {
      case TierOptions.Tier1Either:
        list = list.filter(rt => rt.tier === 1 || rt.btier === 1)
        break;
      case TierOptions.Tier2Either:
        list = list.filter(rt => this.getEiterTier(rt) === 2)
        break;
      case TierOptions.Tier3Either:
        list = list.filter(rt => this.getEiterTier(rt) === 3)
        break;
      case TierOptions.Tier1Both:
        list = list.filter(rt => rt.tier === 1 && rt.btier === 1)
        break;
      case TierOptions.Tier2Both:
        list = list.filter(rt => rt.tier === 2 && rt.btier === 2)
        break;
      case TierOptions.Tier3Both:
        list = list.filter(rt => rt.tier === 3 && rt.btier === 3)
        break;
      case TierOptions.Unknown:
        list = list.filter(rt => !rt.tier && !rt.btier)
        break;
    }

    switch (gmbStatus) {
      case GMBStatusOptions.QmOwned:
        list = list.filter(rt => rt.hasGmb && !rt.bhasGmb)
        break;
      case GMBStatusOptions.BmOwned:
        list = list.filter(rt => !rt.hasGmb && rt.bhasGmb)
        break;
      case GMBStatusOptions.BmOrQmOwned:
        list = list.filter(rt => rt.hasGmb || rt.bhasGmb)
        break;
      case GMBStatusOptions.NeitherOwned:
        list = list.filter(rt => !rt.hasGmb && !rt.bhasGmb)
        break;
    }

    // currently, we cannot detect if beyondmenu has gmbwebsite
    switch (gmbWebsite) {
      case GMBWebsiteOptions.Bm:
        list = list.filter(rt => rt.bhasGMBWebsite)
        break;
      case GMBWebsiteOptions.Qm:
        list = list.filter(rt => rt.hasGMBWebsite)
        break;
      case GMBWebsiteOptions.BmOrQm:
        list = list.filter(rt => rt.hasGMBWebsite || rt.bhasGMBWebsite)
        break;
      case GMBWebsiteOptions.Other:
        list = list.filter(rt => !rt.hasGMBWebsite && !rt.bhasGMBWebsite)
        break;
    }

    switch (postmates) {
      case PostmatesOptions.HasInQm:
        list = list.filter(rt => rt._id && rt.courier === 'Postmates');
        break;
      case PostmatesOptions.NoInQm:
        list = list.filter(rt => !rt._id || rt.courier !== 'Postmates');
        break;
      case PostmatesOptions.Available:
        list = list.filter(rt => rt.postmatesAvailable) // only calc qm RTs for now
        break;
      case PostmatesOptions.Unavailable:
        list = list.filter(rt => rt._id && !rt.postmatesAvailable) // only calc qm RTs for now
        break;
    }

    switch (pricing) {
      case PricingOptions.BmHigher:
        break;
      case PricingOptions.QmHigher:
        break;
      case PricingOptions.BmEqQm:
        break;
    }

    list = this.worthyFilter(list, perspective, worthiness);

    if (keyword && keyword.trim()) {
      const kwMatch = str => str && str.toString().toLowerCase().includes(keyword.toLowerCase())
      let digits = keyword.replace(/[^a-zA-Z0-9]/g, '');
      list = list.filter(({_id, _bid, name, bname, address, baddress, channels, bchannels}) => {
        return [_id, _bid, name, bname, address, baddress].some(x => kwMatch(x))
        || (digits && ((channels || []).some(p => p.type === 'Phone' && p.value.includes(digits)) || (bchannels || []).some(p => p.value.includes(digits))))
      })
    }
    this.filteredRows = list;
    this.calcSummary();
    this.paginate(0)
  }

  paged() {
    return this.filteredRows.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize)
  }

  groupChannels({channels, bchannels, hide, bhide}, type) {
    let qmWhole = hide ? [] : (channels || []).filter(c => c.type === type).map(c => c.value);
    let bmWhole = bhide ? [] : (bchannels || []).filter(c => c.type === type).map(c => c.value);
    let whole = Array.from(new Set([...qmWhole, ...bmWhole]))
    let shared = whole.filter(p => qmWhole.includes(p) && bmWhole.includes(p));
    let qmOnly = qmWhole.filter(p => !shared.includes(p));
    let bmOnly = bmWhole.filter(p => !shared.includes(p));
    let contents = [];
    if (shared.length > 0) {
      contents.push(shared.join(', ') + ' (Both)');
    }
    if (qmOnly.length > 0) {
      contents.push(qmOnly.join(', ') + ' (QM)');
    }
    if (bmOnly.length > 0) {
      contents.push(bmOnly.join(', ') + ' (BM)')
    }
    return contents.join(', ');
  }

  clearFilter() {
    this.filters = {
      keyword: '',
      activeDefinition: '',
      status: '',
      platform: '',
      hasPlaceId: '',
      sameName: '',
      tier: '',
      gmbStatus: '',
      gmbWebsite: '',
      postmates: '',
      pricing: '',
      perspective: '',
      worthiness: ''
    }

    this.filter();
  }

}

