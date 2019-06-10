import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Helper } from 'src/app/classes/helper';
@Component({
  selector: 'app-monitoring-gmb',
  templateUrl: './monitoring-gmb.component.html',
  styleUrls: ['./monitoring-gmb.component.css']
})
export class MonitoringGmbComponent implements OnInit {
  rows = [];
  showOnlyBadGmb = false;
  showOnlyDisabled = false;
  showOnlyPublished = false;
  showMissingWebsite = false;
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
        googleListing: 1,
        "rateSchedules.agent": 1,
        web: 1,
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
    if (this.showOnlyPublished) {
      this.filteredRows = this.filteredRows.filter(row => !row.restaurant.disabled && (row.location && row.location.status == 'Published'));
    }
    if (this.showOnlyBadGmb) {
      this.filteredRows = this.filteredRows.filter(row => !row.location || row.location.status !== 'Published');
    }
    if (this.showOnlyDisabled) {
      this.filteredRows = this.filteredRows.filter(row => row.restaurant.disabled);

    }

    if (this.showMissingWebsite) {
      this.filteredRows = this.filteredRows.filter(row => row.restaurant.googleListing && !row.restaurant.googleListing.gmbWebsite );

    }
  }

  async scanWebsite() {

    let websites = this.filteredRows.map(row => row.restaurant.web && row.restaurant.web.qmenuWebsite)

    let batchSize = 1;
    const failedRows = [];
    const succeededRows = [];

    let batchedWebsite = Array(Math.ceil(websites.length / batchSize)).fill(0).map((i, index) => websites.slice(index * batchSize, (index + 1) * batchSize));
    //batchedWebsite = batchedWebsite.slice(0,1)
    for (let batch of batchedWebsite) {
      const query = { website: batch.join(',') };
      try {
        let result = await this._api.get(environment.adminApiUrl + "utils/check-url", query).toPromise();
        Object.keys(result).map(key => {
          this.filteredRows.filter(row => row.restaurant.web && row.restaurant.web.qmenuWebsite && Helper.areDomainsSame(key, row.restaurant.web.qmenuWebsite))[0].websiteStatus = result[key];

        })
        succeededRows.push(result);
      }
      catch (e) {
        failedRows.push(batch);
      }
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 1000)
      });
    }

    this.filteredRows.map(each => {

    })

    console.log('succeededRows', succeededRows);
    console.log('failedRows', failedRows);

  }

}
