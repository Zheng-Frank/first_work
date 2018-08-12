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

  injectingIds = false;
  // use this variable to track which restaurant is being calculated
  bizInCalculating: any = null;

  constructor(private _api: ApiService, private _global: GlobalService) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setMonth(thirtyDaysAgo.getMonth() - 1);
    zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
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

  ngOnInit() {
  }

  injectRestaurantIds() {
    this.injectingIds = true;
    // we can  only match by official phone number, we need to assume restaurants don't share same phone numbers
    zip(
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
        console.log('non-matched');
        console.log(nonMatched);
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
    ))
      .subscribe(
        result => {
          this.injectingIds = false;
        },
        error => {
          this.injectingIds = false;
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  calculateRestaurantScores(skipRestaurantWithScores) {
    // grab ALL restaurant --> loop through each to get last 1000 orders --> calculate a score
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbBiz",
      query: {
        qmenuId: { $exists: 1 }
      },
      projection: {
        qmenuId: 1,
        name: 1
      },
      limit: 5000
    }).subscribe(
      async bizList => {
        for (let biz of bizList) {
          this.bizInCalculating = biz;
          try {
            let t = await this.injectScore(biz);
          }
          catch (error) {
            console.log(error);
          }
        }
        this.bizInCalculating = null;
      },
      error => {
        this.bizInCalculating = null;
        this._global.publishAlert(AlertType.Danger, 'Error Querying Biz List');
      });
  }

  injectScore(biz) {
    return new Promise((resolve, reject) => {
      this._api.get(environment.qmenuApiUrl + "generic", {
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
      }).pipe(mergeMap(orders => {
        const score = this.getScore(orders);

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
        ]);
      })).subscribe(
        result => {
          resolve();
        },
        error => {
          reject(error);
        }
      );

    });
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

}
