import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from 'src/app/classes/alert-type';
@Component({
  selector: 'app-monitoring-db',
  templateUrl: './monitoring-db.component.html',
  styleUrls: ['./monitoring-db.component.css']
})
export class MonitoringDbComponent implements OnInit {

  apiLoading = false;
  now = new Date();
  documentName;
  documentNames = ["blacklist", "customer", "event", "execution", "gmb-pin", "gmbRequest", "job", "order", "postcard", "restaurant", "sesame-login", "sms-login", "task"];
  analysis = {};
  constructor(private _api: ApiService, private _global: GlobalService) {
  }
  async ngOnInit() {
  }

  async populate() {
    if (!this.documentName) {
      return;
    }
    this.apiLoading = true;
    try {
      // load max of 10000 items, sorted by createdAt, from DB
      const docs = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: this.documentName,
        query: {},
        projection: {
          createdAt: 1,
          _id: 0
        },
        sort: {
          createdAt: -1
        },
        limit: 100000
      }).toPromise();
      this.analyze(docs);

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, "ERROR");
    }
    this.apiLoading = false;
  }

  analyze(docs) {
    // break by dates
    const dict = {};
    for (let doc of docs) {
      const dateString = new Date(doc.createdAt).toDateString();
      dict[dateString] = dict[dateString] || 0;
      dict[dateString] = dict[dateString] + 1;
    }
    this.analysis = dict;
  }

}
