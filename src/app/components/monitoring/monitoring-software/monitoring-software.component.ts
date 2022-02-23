import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-monitoring-software',
  templateUrl: './monitoring-software.component.html',
  styleUrls: ['./monitoring-software.component.css']
})
export class MonitoringSoftwareComponent implements OnInit {

  runtimes: any = [];
  now = new Date();
  constructor(private _api: ApiService) {
    this.loadSoftwareRuntimes();
  }

  ngOnInit() {
  }

  async loadSoftwareRuntimes() {
    const recentRuntimes = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'runtime',
      projection: {
        id: 1,
        software: 1,
        "browser.parsedResult.browser.name": 1,
        "browser.parsedResult.os.name": 1,
        "user.user.username": 1,
        "user.customer.firstName": 1,
        "user.customer.lastName": 1,
        "user.restaurant.name": 1,
        "shell.name": 1,
        "shell.version": 1,
        "shell.platform": 1,
        createdAt: 1
      },
      sort: { _id: -1 },
      limit: 100000
    }).toPromise();
    const idMap = {};
    recentRuntimes.forEach(r => {
      idMap[r.id] = idMap[r.id] || r;
      idMap[r.id].count = (idMap[r.id].count || 0) + 1;
    });
    this.runtimes = Object.values(idMap);
  }

}
