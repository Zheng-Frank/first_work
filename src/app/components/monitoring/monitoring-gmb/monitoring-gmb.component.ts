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
  showOnlyDisabled = false;
  showNotDisabled = false;
  showOnlyPublished = false;
  showMissingWebsite = false;
  showExpiredDomain = false;
  filteredRows = [];
  domains = [];
  domainRtDict = {};
  managedDomain = "Manged Domains";
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.populate();
  }

  async populate() {
    const restaurantBatchSize = 1000;
    let allRestaurants = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
        skip: allRestaurants.length,
        limit: restaurantBatchSize
      }).toPromise();
      allRestaurants.push(...batch);
      if (batch.length === 0 || batch.length < restaurantBatchSize) {
        break;
      }
    }


    const gmbAccountBatchSize = 1000;
    const gmbAccountsWithLocations = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        query: {
          locations: { $exists: 1 }
        },
        projection: {
          "email": 1,
          password: 1,
          "locations.cid": 1,
          "locations.status": 1,
          "locations.appealId": 1
        },
        skip: gmbAccountsWithLocations.length,
        limit: gmbAccountBatchSize
      }).toPromise();
      gmbAccountsWithLocations.push(...batch);
      if (batch.length === 0 || batch.length < gmbAccountBatchSize) {
        break;
      }
    }

    const domainBatchSize = 3000;
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'domain',
        skip: this.domains.length,
        limit: domainBatchSize
      }).toPromise();
      this.domains.push(...batch);
      if (batch.length === 0 || batch.length < domainBatchSize) {
        break;
      }
    }

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
    //this.domains = this.domains.filter(e=> !e.status || e.status ==='ACTIVE');

    //allRestaurants = allRestaurants.filter(r => r._id === '5ad9d66f8ffa501400cdeb84');
    this.domains.map(domain => {
      allRestaurants.map(rt => {
        let website = rt.web && rt.web.qmenuWebsite && rt.web.qmenuWebsite.toLowerCase();
        // compare http://www.biteofchinatogo.com/ to biteofchinatogo.com
        website = website && website.replace(/(^\w+:|^)\/\//, '').replace('/', '').replace('www.', '');
        //For Godaddy website, it is already expired but transfer to AWS
        //"status": "TRANSFERRED_OUT",
        //"type": "GODADDY",
        if (website === domain.name && domain.status !=="TRANSFERRED_OUT") {
          this.domainRtDict[rt._id] = domain;
        }

      })
    });

    this.rows = allRestaurants.map(r => ({
      restaurant: r,
      domainType: this.domainRtDict[r._id] && this.domainRtDict[r._id].type,
      domain: this.domainRtDict[r._id],
      account: (cidAccountLocationMap[(r.googleListing || {}).cid] || {}).account,
      location: (cidAccountLocationMap[(r.googleListing || {}).cid] || {}).location,
    }));
    // sort desc by score
    this.rows.sort((r1, r2) => (r2.restaurant.score || 0) - (r1.restaurant.score || 0));
    // this.rows.length > 500 ? this.rows.length = 500 : '';
    this.filter();
  }

  filter() {
    const now = new Date();
    this.filteredRows = this.rows;
    if (this.showOnlyPublished) {
      this.filteredRows = this.filteredRows.filter(row => !row.restaurant.disabled && (row.location && row.location.status == 'Published'));
    }
    if (this.showOnlyDisabled) {
      this.filteredRows = this.filteredRows.filter(row => row.restaurant.disabled);
    }
    if (this.showNotDisabled) {
      this.filteredRows = this.filteredRows.filter(row => !row.restaurant.disabled);
    }

    if (this.showMissingWebsite) {
      this.filteredRows = this.filteredRows.filter(row => row.restaurant.googleListing && !row.restaurant.googleListing.gmbWebsite);
    }

    if (this.showExpiredDomain) {
      this.filteredRows = this.filteredRows.filter(e => e.domain && (new Date(e.domain.expiry)).valueOf() < now.valueOf());
    }


    switch (this.managedDomain) {
      case 'only active':
        this.filteredRows = this.filteredRows.filter(e => e.domain && (new Date(e.domain.expiry)).valueOf() > now.valueOf());
        break;
      case 'expired':
        this.filteredRows = this.filteredRows.filter(e => e.domain && (new Date(e.domain.expiry)).valueOf() < now.valueOf());
        break;
      default:
        break;
    }
  }

}
