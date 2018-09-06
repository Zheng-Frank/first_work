import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { mergeMap } from 'rxjs/operators';
import { GmbRequest } from '../../../classes/gmb/gmb-request';
import { GmbService } from '../../../services/gmb.service';

@Component({
  selector: 'app-gmb2-dashboard',
  templateUrl: './gmb2-dashboard.component.html',
  styleUrls: ['./gmb2-dashboard.component.css']
})
export class Gmb2DashboardComponent implements OnInit {

  gmbAccounts: GmbAccount[] = [];
  gmbBizList: GmbBiz[] = [];
  gmbRequests: GmbRequest[] = [];

  ownedGmbBizList = [];

  sections = [
    { title: '➀ Scan GMB Accounts', description: 'Retrieve all managed locations', loading: false, executeFunction: 'scanAllAccounts' },
    { title: '➁ Crawl Google Listings', description: 'Update to reflect latest google listing status', loading: false, executeFunction: 'crawlAllBiz' },
    { title: '➂ Sync GMB and Restaurant', description: 'Link restaurant and GMB locations', loading: false, executeFunction: 'injectRestaurantIds' },
    { title: '➃ Inject Restaurant Scores', description: 'Evaluate each restaurant and assign a score value', loading: false, executeFunction: 'injectScores' },
    { title: '➄ Scan Account Emails', description: 'Get all ownership requests', loading: false, executeFunction: 'scanAllEmails' }]

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb: GmbService) {
    this.refresh();
  }

  ngOnInit() {
  }

  refresh() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setMonth(thirtyDaysAgo.getMonth() - 1);
    zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1,
          // gmbScannedAt: 1,
          // emailScannedAt: 1
        },
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        projection: {
          "gmbOwnerships.email": 1
        },
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbRequest",
        query: {
          date: { $gte: { $date: thirtyDaysAgo } },
          handledDate: {
            $exists: false
          }
        },
        projection: {
          email: 1
        },
        limit: 5000
      }),
    ).subscribe(
      results => {
        this.gmbAccounts = results[0].map(g => new GmbAccount(g)); //.sort((g1, g2) => g1.email > g2.email ? 1 : -1);
        this.gmbBizList = results[1].map(b => new GmbBiz(b));
        this.gmbRequests = results[2].map(r => new GmbRequest(r));
        const emails = this.gmbAccounts.map(ga => ga.email);
        this.ownedGmbBizList = this.gmbBizList.filter(b => b.hasOwnership(emails));
      },
      error => {
        this._global.publishAlert(AlertType.Danger, error);
      }
    );
  }

  async processSection(section) {
    section.loading = true;
    try {
      await this[section.executeFunction]();
      // do a refresh all so many updates
      this.refresh();
    } catch (error) {
      console.log(error);
    }
    section.loading = false;
  }

  async scanAllAccounts() {
    const failedAccounts = [];
    // we would like to scan all based on gmbScannedAt
    return new Promise((resolve, reject) => {
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1,
          password: 1,
          gmbScannedAt: 1
        },
        limit: 5000
      }).subscribe(
        async accounts => {
          accounts = accounts.map(a => new GmbAccount(a)).sort((a1, a2) => (a1.gmbScannedAt || new Date(0)).valueOf() - (a2.gmbScannedAt || new Date(0)).valueOf());

          // // TEMP: only scanned
          // accounts = accounts.filter(a => a.gmbScannedAt);
          // accounts.length = 4;

          const batchSize = 5;
          const batchedAccounts = Array(Math.ceil(accounts.length / batchSize)).fill(0).map((i, index) => accounts.slice(index * batchSize, (index + 1) * batchSize));

          for (let batch of batchedAccounts) {
            try {
              await Promise.all(batch.map(account =>
                new Promise((resolve, reject) => {
                  this._gmb.scanOneGmbAccountLocations(account).then(ok => {
                    resolve();
                    this._global.publishAlert(AlertType.Success, '✓ ' + account.email, 2000);
                  }).catch(error => {
                    this._global.publishAlert(AlertType.Danger, '✗ ' + account.email);
                    failedAccounts.push(account);
                    resolve();
                  }
                  );
                })
              ));

            }
            catch (error) {
              console.log(error);
              this._global.publishAlert(AlertType.Danger, '✗ ' + batch.map(account => account.email).join(', '), 2000);
            }
          }

          console.log('Failed accounts:');

          console.log(failedAccounts)

          resolve();
        },
        error => reject(error));
    });
  }

  async crawlAllBiz() {
    // we would like to scan all based on gmbScannedAt
    return new Promise((resolve, reject) => {
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        projection: {
          name: 1,
          address: 1,
          place_id: 1,
          phone: 1,
          crawledAt: 1
        },
        limit: 5000
      }).subscribe(
        async bizList => {
          bizList = bizList.map(a => new GmbBiz(a)).sort((a1, a2) => (a1.crawledAt || new Date(0)).valueOf() - (a2.crawledAt || new Date(0)).valueOf());

          // // TEMP: try 4 only
          // bizList.length = 1;

          const batchSize = 1;
          const batchedBizList = Array(Math.ceil(bizList.length / batchSize)).fill(0).map((i, index) => bizList.slice(index * batchSize, (index + 1) * batchSize));

          for (let batch of batchedBizList) {
            try {
              await Promise.all(batch.map(biz => this._gmb.crawlOneGoogleListing(biz)));
              this._global.publishAlert(AlertType.Success, '✓ ' + batch.map(biz => biz.name).join(', '), 2000);
            }
            catch (error) {
              console.log(error);
              this._global.publishAlert(AlertType.Danger, '✗ ' + batch.map(biz => biz.name).join(', '), 2000);
            }
          }

          resolve();
        },
        error => reject(error));
    });
  }

  async injectRestaurantIds() {

    // we can  only match by official phone number, we need to assume restaurants don't share same phone numbers
    return zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          "phones.phoneNumber": 1,
          name: 1
        },
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        projection: {
          qmenuId: 1,
          phone: 1,
          name: 1,
          "gmbOwnerships.email": 1
        },
        limit: 5000
      })
    ).pipe(mergeMap(
      results => {
        const phoneRestaurantMap = {};
        results[0].map(r => (r.phones || []).map(phone => phoneRestaurantMap[phone.phoneNumber] = r._id));
        const bizList = results[1] as GmbBiz[];
        bizList.map(biz => biz.qmenuId = phoneRestaurantMap[biz.phone]);

        const matched = bizList.filter(b => b.qmenuId);
        const nonMatched = bizList.filter(b => !b.qmenuId);
        if (nonMatched.length > 0) {
          this._global.publishAlert(AlertType.Danger, "Not Matched: " + nonMatched.length + ". Use debugger console to see un-matched list!");
        }

        this._global.publishAlert(AlertType.Success, "Matched: " + matched.length);
        return this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz",
          matched.map(biz => ({
            old: {
              _id: biz._id
            },
            new: {
              _id: biz._id,
              qmenuId: biz.qmenuId
            }
          }))
        );
      }
    )).toPromise();
  }

  async injectScores() {
    // grab ALL restaurant --> loop through each to get last 1000 orders --> calculate a score
    const bizList = await this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbBiz",
      query: {
        qmenuId: { $exists: 1 },
        score: { $exists: 0 }
      },
      projection: {
        qmenuId: 1,
        name: 1,
        score: 1
      },
      limit: 5000
    }).toPromise();

    // skip those with score 4+
    for (let biz of bizList) {
      try {
        let t = await this.injectOneScore(biz);
        console.log('updated: ' + biz.name + ', score = ' + biz.score);
      }
      catch (error) {
        console.log(error);
      }
    }
  }

  async injectOneScore(biz) {

    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
        restaurant: {
          $oid: biz.qmenuId
        }
      },
      projection: {
        createdAt: 1
      },
      sort: { createdAt: -1 },
      limit: 1000
    }).toPromise();
    const score = this.getScore(orders);
    // update biz's score
    biz.score = score;
    return this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz", [
      {
        old: {
          _id: biz._id
        },
        new: {
          _id: biz._id,
          score: score
        }
      }
    ]).toPromise();
  }

  private getScore(orders) {
    // counting days with orders (having gmbs?) and do an average
    const dateMap = {};
    // "2018-08-10T00:26:03.990Z" ==> "Thu Aug 09 2018"
    orders.map(order => {
      const key = new Date(order.createdAt).toDateString();
      dateMap[key] = dateMap[key] ? dateMap[key] + 1 : 1;
    });
    return Math.floor(orders.length / (Object.keys(dateMap).length || 1));
  }

  async scanAllEmails() {
    // we would like to scan all based on gmbScannedAt
    return new Promise((resolve, reject) => {
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1,
          password: 1,
          emailScannedAt: 1
        },
        limit: 5000
      }).subscribe(
        async accounts => {
          accounts = accounts.map(a => new GmbAccount(a)).sort((a1, a2) => (a1.emailScannedAt || new Date(0)).valueOf() - (a2.emailScannedAt || new Date(0)).valueOf());
          // TEMP: only scanned
          // accounts = accounts.filter(a => a.emailScannedAt);
          // accounts.length = 3;

          const batchSize = 3;
          const batchedAccounts = Array(Math.ceil(accounts.length / batchSize)).fill(0).map((i, index) => accounts.slice(index * batchSize, (index + 1) * batchSize));

          for (let batch of batchedAccounts) {
            try {
              await Promise.all(batch.map(account => this._gmb.scanAccountEmails(account, false)));
              this._global.publishAlert(AlertType.Success, '✓ ' + batch.map(account => account.email).join(', '), 2000);
            }
            catch (error) {
              console.log(error);
              this._global.publishAlert(AlertType.Danger, '✗ ' + batch.map(account => account.email).join(', '), 2000);
            }
          }

          resolve();
        },
        error => reject(error));
    });
  }

  async scanAll() {
    for (let i = 0; i < 3; i++) {
      for (let section of this.sections) {
        try {
          await this[section.executeFunction]();
        } catch (error) {
        }
      }
    }

  }
}
