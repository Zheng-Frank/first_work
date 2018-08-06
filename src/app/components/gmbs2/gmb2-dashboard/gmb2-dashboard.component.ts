import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';

@Component({
  selector: 'app-gmb2-dashboard',
  templateUrl: './gmb2-dashboard.component.html',
  styleUrls: ['./gmb2-dashboard.component.css']
})
export class Gmb2DashboardComponent implements OnInit {

  gmbAccounts: GmbAccount[] = [];
  gmbBizList: GmbBiz [] = [];

  ownedGmbBizList = [];

  constructor(private _api: ApiService, private _global: GlobalService) {
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
      })
    ).subscribe(
      results => {
        this.gmbAccounts = results[0].map(g => new GmbAccount(g)); //.sort((g1, g2) => g1.email > g2.email ? 1 : -1);
        this.gmbBizList = results[1].map(b => new GmbBiz(b));
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

}
