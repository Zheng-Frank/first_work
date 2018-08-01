import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-gmb2-dashboard',
  templateUrl: './gmb2-dashboard.component.html',
  styleUrls: ['./gmb2-dashboard.component.css']
})
export class Gmb2DashboardComponent implements OnInit {

  gmbAccounts: GmbAccount[] = [];
  constructor(private _api: ApiService, private _global: GlobalService) { 
        this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "gmb",
      projection: {
        email: 1
      },
      limit: 5000
    })
      .subscribe(
        gmbs => {
          this.gmbAccounts = gmbs.map(g => new GmbAccount(g)).sort((g1, g2) => g1.email > g2.email ? 1 : -1);
        },
        error => {
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  ngOnInit() {
  }

}
