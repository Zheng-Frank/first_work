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
  filteredRows = [];
  domains = [];
  managedDomain = "Manged Domains";
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.populate();
  }

  async populate() {
    const restaurantBatchSize = 1000;
    const allRestaurants = [];
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

    const domainBatchSize = 1000;
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

    this.rows = allRestaurants.map(r => ({
      restaurant: r,
      domain: this.getDomainType(r.web && r.web.qmenuWebsite),
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
    if (this.showOnlyDisabled) {
      this.filteredRows = this.filteredRows.filter(row => row.restaurant.disabled);
    }
    if (this.showNotDisabled) {
      this.filteredRows = this.filteredRows.filter(row => !row.restaurant.disabled);
    }

    if (this.showMissingWebsite) {
      this.filteredRows = this.filteredRows.filter(row => row.restaurant.googleListing && !row.restaurant.googleListing.gmbWebsite);
    }

    switch (this.managedDomain) {
      case 'only active':
        const now = new Date();
        this.filteredRows = this.filteredRows.filter(e =>  new Date(e.expiry).valueOf() < now.valueOf());
        break;
      default:
        break;
    }
  }

  getDomainType(webSite: string) {
    const now = new Date();
    this.domains = this.domains.filter(e => e.status === 'ACTIVE' || new Date(e.expiry).valueOf() > now.valueOf());
    let matchDomain = this.domains.filter(each => webSite && webSite.toLocaleLowerCase().indexOf(each.name) >= 0);
    if (matchDomain && matchDomain.length > 0) {
      return matchDomain[0].type
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
        let result = await this._api.get(environment.qmenuApiUrl + "utils/check-url", query).toPromise();
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

    console.log('succeededRows', succeededRows);
    console.log('failedRows', failedRows);

  }

  async injectWebsite() {
    console.log('this.filteredRows', this.filteredRows);
    let batchSize = 1;
    //this.filteredRows = this.filteredRows.slice(16);

    const batchedItems = Array(Math.ceil(this.filteredRows.length / batchSize)).fill(0).map((i, index) => this.filteredRows.slice(index * batchSize, (index + 1) * batchSize)).filter(batch => batch.length > 0);
    for (let batch of batchedItems) {
      const promises = batch.map(item =>
        this._api
          .post(environment.qmenuApiUrl + 'utils/crypto', { salt: item.account.email, phrase: item.account.password }).toPromise()
          .then(password => this._api.post(
            environment.autoGmbUrl + 'updateWebsite', {
              email: item.account.email,
              password: password,
              appealId: item.location.appealId,
              websiteUrl: "https://qmenu.us/#/" + item.restaurant.alias,
              stayAfterScan: false
            }
          ).toPromise())
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
      const batchResult = await Helper.processBatchedPromises(promises);
      // // // update account's history
      // const patchPairs = batch.map((item, index) => {
      //   const injection = {};
      //   injection[item.location.appealId] = {
      //     time: new Date(),
      //     success: batchResult[index].success
      //   }
      //   return {
      //     old: { _id: item.account._id, injection: {} },
      //     new: { _id: item.account._id, injection }
      //   };
      // });
      // console.log(patchPairs);
      // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbAccount', patchPairs).toPromise();
    } // end batch

  }


}
