import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
@Component({
  selector: 'app-monitoring-gmb',
  templateUrl: './monitoring-gmb.component.html',
  styleUrls: ['./monitoring-gmb.component.css']
})
export class MonitoringGmbComponent implements OnInit {
  rows = [];
  showOnlyBadGmb = false;
  showOnlyDisabled = false;
  filteredRows = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.populate();
  }

  async populate() {
    // all restaurant stubs
    const allRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        alias: 1,
        disabled: 1,
        score: 1,
        "googleListing.cid": 1,
        "rateSchedules.agent": 1,
        createdAt: 1
      },
      limit: 200000
    }).toPromise();

    const gmbAccountsWithLocations = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        "email": 1,
        "locations.cid": 1,
        "locations.status": 1
      },
      limit: 6000
    }).toPromise();

    const cidAccountLocationMap = {};

    gmbAccountsWithLocations.map(account => account.locations.map(loc => {
      // make Published overrule other status
      if (loc.status === 'Published') {
        cidAccountLocationMap[loc.cid] = {
          account: account,
          location: loc
        };
      } else {
        cidAccountLocationMap[loc.cid] = cidAccountLocationMap[loc.cid] || {
          account: account,
          location: loc
        };
      }
    }));

    this.rows = allRestaurants.map(r => ({
      restaurant: r,
      account: (cidAccountLocationMap[(r.googleListing || {}).cid] || {}).account,
      location: (cidAccountLocationMap[(r.googleListing || {}).cid] || {}).location,
    }));
    // sort desc by score
    this.rows.sort((r1, r2) => (r2.restaurant.score || 0) - (r1.restaurant.score || 0));
    // this.rows.length > 500 ? this.rows.length = 500 : '';
    this.filter();
  }

  filter() {
    this.filteredRows = this.rows;
    if (this.showOnlyBadGmb) {
      this.filteredRows = this.filteredRows.filter(row => !row.location || row.location.status !== 'Published');
    }
    if (this.showOnlyDisabled) {
      this.filteredRows = this.filteredRows.filter(row => row.restaurant.disabled);

    }
  }

}
