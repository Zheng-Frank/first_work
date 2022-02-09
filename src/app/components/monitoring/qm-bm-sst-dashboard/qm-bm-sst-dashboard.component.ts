import { Component, OnInit } from '@angular/core';
import {ApiService} from "../../../services/api.service";
import {environment} from "../../../../environments/environment";
import {expressionChangedAfterItHasBeenCheckedError} from "@angular/core/src/view/errors";

@Component({
  selector: 'app-qm-bm-sst-dashboard',
  templateUrl: './qm-bm-sst-dashboard.component.html',
  styleUrls: ['./qm-bm-sst-dashboard.component.css']
})
export class QmBmSstDashboardComponent implements OnInit {

  // stats = {
  //   qmTotal: 0,
  //   bmTotal: 0,
  //   qmMatchingBm: 0,
  //   qmNotMatchingBm: 0
  // };

  filteredRows = [];

  filters = {
    searchText: '',
    owner: 'BelongingQmAndBm',
    activeIn: 'ActiveInQMorBm',
    hasPlaceId: true,
    sameName: true
  }

  qmRestaurants = [];
  bmRestaurants = [];
  cachedData = [];

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.preload();
  }

  async preload() {
    try {

      // --- qMenu restaurants
      this.qmRestaurants = (await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: "restaurant",
        aggregate: [
          {
            $project: {
              place_id: "$googleListing.place_id",
              address: "$googleAddress.formatted_address",
              disabled: 1,
              website: "$web.qmenuWebsite",
              name: 1,
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
      }, 1000));

      // --- BeyondMenu restaurants
      this.bmRestaurants = (await this._api.post(environment.gmbNgrok + 'get-bm-restaurant').toPromise()).map(item => {
        // --- phone
        const phones = [];
        [1, 2, 3, 4].map(num => {
          if (item[`Phone${num}`]) {
            phones.push({ value: item[`Phone${num}`]});
          }
        });

        // --- cellphone
        const cphones = [];
        [1, 2, 3, 4].map(num => {
          if (item[`CellPhone${num}`]) {
            cphones.push({ value: item[`CellPhone${num}`]});
          }
        });

        return {
          _bid: item.BusinessEntityID,
          bplace_id: item.GooglePlaceID,
          baddress: `${item.Address}, ${item.City || ''}, ${item.State || ''} ${item.ZipCode || ''}`.trim(),
          bdisabled: !item.Active,
          bwebsite: item.CustomerDomainName,
          bname: item.BusinessName,
          bowner: 'beyondmenu',
          bhasGmb: item.IsBmGmbControl,
          bchannels: [...phones, ...cphones]
        }
      });

      this.cachedData = this.qmRestaurants
        .filter(qmRt => this.bmRestaurants.some(bmRt => (bmRt.bplace_id || 'rubbish') === qmRt.place_id))
        .map(qmRt => {
          return {
            ...qmRt,
            ...this.bmRestaurants.find(bmRt => (bmRt.bplace_id || 'rubbish') === qmRt.place_id)
          }
        });

      this.filter();
    } catch (error) {
      console.error(error);
    }
  }

  filter() {
    // console.log(this.filters);

    switch (this.filters.owner) {
      case 'BelongingQmAndBm':
        this.filteredRows = this.cachedData;
        break;

      case 'BelongingQM':
        this.filteredRows = this.cachedData.filter(data => data.owner === 'qmenu' /* && !data.bhasGmb && data.bowner !== 'beyondmenu' */);
        break;

      case 'BelongingBM':
        this.filteredRows = this.cachedData.filter(data => data.bowner === 'beyondmenu' /* && data.bhasGmb */)
        break;
    }

    // ---
    switch (this.filters.activeIn) {
      case 'ActiveInQMorBm':
        this.filteredRows = this.filteredRows.filter(row => !row.disabled || !row.bdisabled);
        break;

      case 'ActiveInQMandBm':
        this.filteredRows = this.filteredRows.filter(row => !row.disabled && !row.bdisabled);
        break;

      case 'ActiveInQM':
        this.filteredRows = this.filteredRows.filter(row => !row.disabled);
        break;

      case 'ActiveInBM':
        this.filteredRows = this.filteredRows.filter(row => !row.bdisabled);
        break;

      case 'ActiveInBMnotQM':
        this.filteredRows = this.filteredRows.filter(row => !row.bdisabled && row.disabled);
        break;

      case 'ActiveInQMnotBM':
        this.filteredRows = this.filteredRows.filter(row => !row.disabled && row.bdisabled);
        break;

      case 'InactiveInQMandBM':
        this.filteredRows = this.filteredRows.filter(row => row.bdisabled && row.disabled);
        break;

      case 'InactiveInQM':
        this.filteredRows = this.filteredRows.filter(row => row.disabled);
        break;

      case 'InactiveInBM':
        this.filteredRows = this.filteredRows.filter(row => row.bdisabled);
        break;

    }

    // ---
    if (this.filters.hasPlaceId) {
      this.filteredRows = this.filteredRows.filter(row => row.place_id || row.bplace_id);
    } else {
      this.filteredRows = this.filteredRows.filter(row => !row.place_id || !row.bplace_id);
    }

    // ---
    if (this.filters.sameName) {
      this.filteredRows = this.filteredRows.filter(row => row.name === row.bname);
    } else {
      this.filteredRows = this.filteredRows.filter(row => row.name !== row.bname);
    }

    if (this.filters.searchText && this.filters.searchText.trim().length > 2) {
      this.filteredRows = this.filteredRows
        .filter(data =>
          (data.name.toLocaleLowerCase().startsWith(this.filters.searchText.trim().toLocaleLowerCase()) || data.bname.toLocaleLowerCase().startsWith(this.filters.searchText.trim().toLocaleLowerCase())) ||
          (data.address && data.address.toLocaleLowerCase().includes(this.filters.searchText.trim().toLocaleLowerCase()) || data.baddress && data.baddress.toLocaleLowerCase().includes(this.filters.searchText.trim().toLocaleLowerCase())) ||
          (( data.channels && data.channels.some(phone => phone.value.includes(this.filters.searchText.trim().replace(/\-/g, '')))) || (data.bchannels && data.bchannels.some(phone => phone.value.includes(this.filters.searchText.trim().replace(/\-/g, '')))))
        );
    }





    // console.log('filteredRows', this.filteredRows);
  }

  clearFilter() {
    this.filters = {
      searchText: '',
      owner: 'BelongingQmAndBm',
      activeIn: 'ActiveInQMorBm',
      hasPlaceId: true,
      sameName: true
    }

    this.filter();
  }

  onFilterSelected(filter) {
    console.log(filter);
  }
}

