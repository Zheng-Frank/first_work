import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
@Component({
  selector: 'app-monitoring-script',
  templateUrl: './monitoring-script.component.html',
  styleUrls: ['./monitoring-script.component.css']
})
export class MonitoringScriptComponent implements OnInit {

  items = [];
  apiLoading = false;
  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService) {
  }
  async ngOnInit() {
    this.populate();
  }

  async populate() {
    this.apiLoading = true;
    const scriptNames = [
      "appeal-suspended",
      "crawl-cmo-google-listing",
      "crawl-gmb-biz",
      "crawl-rt-google-listing",
      "gmb-biz-data-maintain",
      "inject-qmenu-websites",
      "purge-and-new-appeal-tasks",
      "refresh-location-status",
      "refresh-max-listings",
      "refresh-ownership-requests",
    ];


    const results = await Promise.all(scriptNames.map(scriptName => this._api.get(
      environment.qmenuApiUrl + 'generic', {
      resource: 'script-report',
      query: { name: scriptName },
      limit: 1,
      sort: { createdAt: -1 }
    }
    ).toPromise()));
    this.items = results.filter(result => result.length > 0).map(result => {
      const item = result[0];
      if (item.endedAt) {
        item.timeSpan = "~" + Math.ceil((new Date(item.endedAt).valueOf() - new Date(item.startedAt).valueOf()) / 1000) + "s";
      }
      return item;
    });
    this.apiLoading = false;
  }

  printConsole(item) {
    console.log(item);
  }

}
