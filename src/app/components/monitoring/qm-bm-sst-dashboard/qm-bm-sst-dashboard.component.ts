import { Component, OnInit } from '@angular/core';
import {ApiService} from "../../../services/api.service";
import {environment} from "../../../../environments/environment";

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

  filteredRows = [];

  filters = {
    keyword: '',
    platform: '',
    status: '',
    hasPlaceId: '',
    sameName: '',
    tier: ''
  }

  qmRTs = [];
  bmRTs = [];
  unionRTs = [];
  qmRTsPlaceDict = {};
  bmRTsPlaceDict = {};
  showBmPricing = true;

  constructor(private _api: ApiService) { }

  async ngOnInit() {
    $("[data-toggle='tooltip']").tooltip();
    await this.preload();
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
      }, 20000));
      this.qmRTs.forEach(rt => {
        if (rt.place_id) {
          this.qmRTsPlaceDict[rt.place_id] = rt;
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
            channels.push({ value: item[`Phone${num}`]});
          }
          if (item[`CellPhone${num}`]) {
            channels.push({ value: item[`CellPhone${num}`]});
          }
        });
        let place_id = item.GooglePlaceID;
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
          createdAt: item.createdAt
        }

        if (place_id) {
          this.bmRTsPlaceDict[place_id] = data;
        }
        return data;
      });
      let bmOnly = this.bmRTs.filter(({bplace_id}) => !bplace_id || !this.qmRTsPlaceDict[bplace_id]);
      console.log('qm: ', this.qmRTs.length, 'bm: ', this.bmRTs.length, 'bm only: ', bmOnly.length)
      this.unionRTs = [...this.qmRTs, ...bmOnly].map(x => ({...x, ...(this.bmRTsPlaceDict[x.place_id]) || {}}));
      console.log('union...', this.unionRTs.length)
      this.filter();
    } catch (error) {
      console.error(error);
    }
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
        list = list.filter(row => !row.disabled || !row.bdisabled);
        break;
      case StatusOptions.BothUp:
        list = list.filter(row => !row.disabled && !row.bdisabled);
        break;
      case StatusOptions.QmUp:
        list = list.filter(row => !row.disabled);
        break;
      case StatusOptions.BmUp:
        list = list.filter(row => !row.bdisabled);
        break;
      case StatusOptions.BmUpQmDown:
        list = list.filter(row => !row.bdisabled && row.disabled);
        break;
      case StatusOptions.QmUpBmDown:
        list = list.filter(row => !row.disabled && row.bdisabled);
        break;
      case StatusOptions.BothDown:
        list = list.filter(row => row.bdisabled && row.disabled);
        break;
      case StatusOptions.QmDown:
        list = list.filter(row => row.disabled);
        break;
      case StatusOptions.BmDown:
        list = list.filter(row => row.bdisabled);
        break;
    }

    switch (hasPlaceId) {
      case PlaceIdOptions.Has:
        // todo: logic tobe confirmed
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
        list = list.filter(({name, bname}) => name !== bname);
        break;
    }

    switch (tier) {
      case TierOptions.Tier1Either:
        break;
      case TierOptions.Tier2Either:
        break;
      case TierOptions.Tier3Either:
        break;
      case TierOptions.Tier1Both:
        break;
      case TierOptions.Tier2Both:
        break;
      case TierOptions.Tier3Both:
        break;
      case TierOptions.Unknown:
        break;
    }

    if (keyword && keyword.trim()) {
      const kwMatch = str => str && str.toLowerCase().includes(keyword.toLowerCase())
      let digits = keyword.replace(/\D/g, '');
      list = list.filter(({name, bname, address, baddress, channels, bchannels}) => {
        return kwMatch(name) || kwMatch(bname) || kwMatch(address) || kwMatch(baddress)
        || (channels || []).some(p => p.value.includes(digits)) || (bchannels || []).some(p => p.value.includes(digits))
      })
    }
    this.filteredRows = list;
  }

  clearFilter() {
    this.filters = {
      keyword: '',
      status: undefined,
      platform: undefined,
      hasPlaceId: undefined,
      sameName: undefined,
      tier: undefined
    }

    this.filter();
  }

}

