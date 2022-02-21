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

enum StatusOptions {
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
    status: '',
    hasPlaceId: '',
    sameName: '',
    tier: ''
  }

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

  qmRTs = [];
  bmRTs = [];
  unionRTs = [];
  qmRTsPlaceDict = {};
  bmRTsPlaceDict = {};
  showBmPricing = true;
  showSummary = false;

  constructor(private _api: ApiService) { }

  async ngOnInit() {
    $("[data-toggle='tooltip']").tooltip();
    await this.preload();
  }

  countByTier(list, tier) {
    return list.filter(rt => this.getEiterTier(rt) === tier).length
  }

  calcSummary() {
    let bmOnly = this.bmRTs.filter(({bplace_id}) => !bplace_id || !this.qmRTsPlaceDict[bplace_id]);
    this.unionRTs = [...this.qmRTs, ...bmOnly].map(x => ({...x, ...(this.bmRTsPlaceDict[x.place_id]) || {}}));
    this.summary.overall = this.unionRTs;
    this.summary.both = this.unionRTs.filter(({_id, _bid}) => _id && _bid);
    this.summary.qmOnly = this.qmRTs.filter(({place_id}) => !this.bmRTsPlaceDict[place_id])
    this.summary.bmOnly = this.bmRTs.filter(({bplace_id}) => !this.qmRTsPlaceDict[bplace_id])
    this.summary.qmAll = this.qmRTs
    this.summary.bmAll = this.bmRTs
  }

  paginate(index) {
    this.pageIndex = index;
    this.myPager1.currentPageNumber = index;
    this.myPager2.currentPageNumber = index;
  }

  dropdowns(key) {
    return Object.values({
      platform: PlatformOptions,
      status: StatusOptions,
      tier: TierOptions,
      place_id: PlaceIdOptions,
      name: RTsNameOptions
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
              disabled: 1,
              website: "$web.qmenuWebsite",
              name: 1,
              score: "$score",
              createdAt: "$createdAt",
              owner: "$googleListing.gmbOwner",
              channels: {
                $filter: {
                  input: "$channels",
                  as: "channel",
                  cond: { $eq: ["$$channel.type", "Phone"] }
                }
              },
            }
          }
        ],
      }, 10000));
      this.qmRTs.forEach(rt => {
        if (rt.place_id) {
          this.qmRTsPlaceDict[rt.place_id] = rt;
        }
        rt.tier = this.getTier(rt.score)
      })
      // --- BeyondMenu restaurants
      let bmRTs = await this._api.post(environment.gmbNgrok + 'get-bm-restaurant').toPromise();
      this.bmRTsPlaceDict = {};
      this.bmRTs = bmRTs.map(item => {
        // --- phone and cellphone
        const channels = [];
        [1, 2, 3, 4].map(num => {
          if (item[`Phone${num}`]) {
            channels.push({ value: item[`Phone${num}`]});
          }
          if (item[`CellPhone${num}`]) {
            channels.push({ value: item[`CellPhone${num}`]});
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
          createdAt: item.createdAt,
          btier: Math.floor((TierDec2021 + TierNov2021 + TierOct2021) / 3),
          bpricing: pricing
        }

        if (place_id) {
          this.bmRTsPlaceDict[place_id] = data;
        }
        return data;
      });
      this.calcSummary();
      this.filter();
    } catch (error) {
      console.error(error);
    }
  }

  getTier(score) {
    if (!score) {
      return 0;
    } else if (score >= 0 && score < 3) {
      return 3;
    } else if (score >= 3 && score < 6) {
      return 2;
    } else {
      return 1;
    }
  }

  getTierColor(tier = 0, btier = 0) {
    return ['', "bg-success", "bg-warning", "bg-danger"][Math.min(tier, btier) || Math.max(tier, btier)]
  }

  getEiterTier(rt) {
    let qt = rt.tier || 0, bt = rt.btier || 0;
    return (Math.min(qt, bt) || Math.max(qt, bt))
  }

  filter() {
    let { platform, status, tier, hasPlaceId, sameName, keyword } = this.filters;
    let list = this.unionRTs;
    switch (platform) {
      case PlatformOptions.Both:
        list = list.filter(({_id, _bid}) => _id &&  _bid);
        break;
      case PlatformOptions.BmOnly:
        list = this.bmRTs.filter(({bplace_id}) => !this.qmRTsPlaceDict[bplace_id])
        break;
      case PlatformOptions.QmOnly:
        list = this.qmRTs.filter(({place_id}) => !this.bmRTsPlaceDict[place_id])
        break;
    }

    switch (status) {
      case StatusOptions.EitherUp:
        list = list.filter(row => (row._id && !row.disabled) || (row._bid && !row.bdisabled));
        break;
      case StatusOptions.BothUp:
        list = list.filter(row => row._id && !row.disabled && row._bid && !row.bdisabled);
        break;
      case StatusOptions.QmUp:
        list = list.filter(row => row._id && !row.disabled);
        break;
      case StatusOptions.BmUp:
        list = list.filter(row => row._bid && !row.bdisabled);
        break;
      case StatusOptions.BmUpQmDown:
        list = list.filter(row => row._id && row._bid && !row.bdisabled && row.disabled);
        break;
      case StatusOptions.QmUpBmDown:
        list = list.filter(row => row._id && row._bid && !row.disabled && row.bdisabled);
        break;
      case StatusOptions.BothDown:
        list = list.filter(row => row._id && row.bdisabled && row._bid && row.disabled);
        break;
      case StatusOptions.QmDown:
        list = list.filter(row => row._id && row.disabled);
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

    if (keyword && keyword.trim()) {
      const kwMatch = str => str && str.toLowerCase().includes(keyword.toLowerCase())
      let digits = keyword.replace(/\D/g, '');
      list = list.filter(({name, bname, address, baddress, channels, bchannels}) => {
        return kwMatch(name) || kwMatch(bname) || kwMatch(address) || kwMatch(baddress)
        || (digits && ((channels || []).some(p => p.value.includes(digits)) || (bchannels || []).some(p => p.value.includes(digits))))
      })
    }
    this.filteredRows = list
    this.paginate(0)
  }

  paged() {
    return this.filteredRows.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize)
  }

  phones(channels) {
    return (channels || []).map(c => c.value).join(', ')
  }

  clearFilter() {
    this.filters = {
      keyword: '',
      status: '',
      platform: '',
      hasPlaceId: '',
      sameName: '',
      tier: ''
    }

    this.filter();
  }

}

