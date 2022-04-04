import { Helper } from 'src/app/classes/helper';
import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from "../../../services/api.service";
import {environment} from "../../../../environments/environment";
import {PagerComponent} from '@qmenu/ui/bundles/qmenu-ui.umd';

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
    worthiness: ''
  }

  sumBmActiveOnly = true;
  sumQmActiveOnly = true;

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
  showPostmatesStatus = false;
  showSalesWorthiness = false

  constructor(private _api: ApiService) { }

  async ngOnInit() {
    $("[data-toggle='tooltip']").tooltip();
    await this.getViabilities();
    await this.preload();
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
      postmates: PostmatesOptions,
      pricing: PricingOptions,
      perspective: SalesPerspectiveOptions,
      worthiness: SalesWorthinessOptions
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
              'gmbOwnerHistory.time': 1,
              'gmbOwnerHistory.gmbOwner': 1,
              website: "$web.qmenuWebsite",
              name: 1,
              courier: '$courier.name',
              lat: '$googleAddress.lat',
              lng: '$googleAddress.lng',
              score: "$score",
              createdAt: "$createdAt",
              owner: "$googleListing.gmbOwner",
              channels: 1,
              "computed.tier.ordersPerMonth": 1
            }
          }
        ],
      }, 5000));

      const gmbBiz = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {cid: 1, gmbOwner: 1, place_id: 1},
        limit: 1000000000
      }).toPromise();
      let gmbWebsiteOwnerDict = {};
      gmbBiz.forEach(({cid, place_id, gmbOwner}) => {
        gmbWebsiteOwnerDict[place_id + cid] = gmbOwner
      })

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
        // active: has order in last 30 days
        rt.inactive = !rtsHasOrderSet.has(rt._id);
        rt.tier = Helper.getTier(((rt.computed || {}).tier || {}).ordersPerMonth);
        
        if (rt.gmbOwnerHistory && rt.gmbOwnerHistory.length > 0) {
          rt.gmbOwnerHistory.sort((a, b) => new Date(b.time).valueOf() - new Date(a.time).valueOf());
          rt.hasGmb = rt.gmbOwnerHistory[0].gmbOwner === 'qmenu';
        } else {
          rt.hasGmb = false
        }
        rt.hasGMBWebsite = gmbWebsiteOwnerDict[rt.place_id + rt.cid] === 'qmenu'
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
      })
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

  getPlaceId(row) {
    if (row.place_id && !row.hide) {
      return row.place_id;
    }
    if (row.bplace_id && !row.bhide) {
      return row.bplace_id;
    }
    return 'N/A';
  }

  getTierColor(tier = 0, btier = 0) {
    return ['', "bg-success", "bg-warning", "bg-danger"][Math.min(tier, btier) || Math.max(tier, btier)]
  }

  getEiterTier(rt) {
    let qt = rt.tier || 0, bt = rt.btier || 0;
    return (Math.min(qt, bt) || Math.max(qt, bt))
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
      sameName, gmbStatus, pricing, postmates,
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
    console.log(list);
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
      postmates: '',
      pricing: '',
      perspective: '',
      worthiness: ''
    }

    this.filter();
  }

}

