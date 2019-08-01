import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { GmbRequest } from '../../../classes/gmb/gmb-request';
import { Gmb3Service } from 'src/app/services/gmb3.service';

@Component({
  selector: 'app-gmb2-dashboard',
  templateUrl: './gmb2-dashboard.component.html',
  styleUrls: ['./gmb2-dashboard.component.css']
})
export class Gmb2DashboardComponent implements OnInit {

  gmbAccounts: GmbAccount[] = [];
  gmbBizList: GmbBiz[] = [];
  gmbRequests: GmbRequest[] = [];

  publishedTotal;
  suspendedTotal;

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
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
          published: 1,
          suspended: 1
        },
        limit: 7000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        projection: {
          name: 1
        },
        limit: 7000
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
        limit: 7000
      }),
    ).subscribe(
      results => {
        this.gmbAccounts = results[0].map(g => new GmbAccount(g)); //.sort((g1, g2) => g1.email > g2.email ? 1 : -1);

        this.publishedTotal = this.gmbAccounts.reduce((sum, a) => sum + (a.published || 0), 0);
        this.suspendedTotal = this.gmbAccounts.reduce((sum, a) => sum + (a.suspended || 0), 0);

        this.gmbBizList = results[1].map(b => new GmbBiz(b));
        this.gmbRequests = results[2].map(r => new GmbRequest(r));
      },
      error => {
        this._global.publishAlert(AlertType.Danger, error);
      }
    );
  }
}
