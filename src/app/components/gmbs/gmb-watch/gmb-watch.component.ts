import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { GmbWatch } from '../../../classes/gmb-watch';
@Component({
  selector: 'app-gmb-watch',
  templateUrl: './gmb-watch.component.html'
})
export class GmbWatchComponent implements OnInit {

  gmbWatch: GmbWatch;

  constructor(private _api: ApiService, private _global: GlobalService) {

  }

  ngOnInit() {
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmb-watch",
      query: {},
      limit: 1
    }).subscribe(watchlist => {
      if (watchlist.length === 0) {
        this._global.publishAlert(AlertType.Danger, 'Please manually insert one gmb-watch document');
      } else {
        this.gmbWatch = watchlist[0];
      }
    }, error => {
      this._global.publishAlert(AlertType.Danger, 'Failed pulling data from DB');
    });
  }

}
