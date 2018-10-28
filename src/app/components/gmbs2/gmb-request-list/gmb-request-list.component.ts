import { Component, OnInit } from '@angular/core';
import { GmbRequest } from '../../../classes/gmb/gmb-request';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { Task } from '../../../classes/tasks/task';

@Component({
  selector: 'app-gmb-request-list',
  templateUrl: './gmb-request-list.component.html',
  styleUrls: ['./gmb-request-list.component.css']
})
export class GmbRequestListComponent implements OnInit {

  requests: any[] = [];
  filteredRequests: any[] = [];

  now = new Date();
  user;

  refreshing = false;

  crawling = false;

  includeHandled = false;

  myColumnDescriptors = [
    {
      label: "Date"
    },

    {
      label: "Name"
    },
    {
      label: "Score"
    },
    {
      label: "Account"
    },
    {
      label: "Requester"
    },
    {
      label: "Comments"
    },
    {
      label: "Actions"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.user = _global.user;
    this.refresh();
  }

  ngOnInit() {
  }

  refresh() {
    this.now = new Date();
    this.refreshing = true;
    zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
        },
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbRequest",
        limit: 5000
      }),
      // also find those tasks with requestId
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "task",
        query: {
          "relatedMap.gmbRequestId": {$exists: 1}
        },
        sort: {
          createdAt: -1
        },
        limit: 500
      }),
    )
      .subscribe(
        results => {
          this.refreshing = false;

          const bizMap = {};
          const accountMap = {};
          const taskMap = {};
          results[0].map(b => new GmbBiz(b)).map(b => bizMap[b._id] = b);
          results[1].map(a => new GmbAccount(a)).map(a => accountMap[a._id] = a);
          (results[3] as Task[]).map(t => t.relatedMap && t.relatedMap['gmbRequestId'] ? (taskMap[t.relatedMap['gmbRequestId']] = t) : (null));
          const now = new Date();

          const getState = (date: Date) => {
            const timePassed = now.valueOf() - date.valueOf();
            const daySpan = 24 * 3600 * 1000;
            if (timePassed > 7 * daySpan) {
              return 'danger';
            } else if (timePassed > 5 * daySpan) {
              return 'warning';
            } else if (timePassed > 3 * daySpan) {
              return 'info';
            }
          }
          this.requests = results[2]
            .map(r => new GmbRequest(r))
            .map(r => ({
              request: r,
              biz: bizMap[r.gmbBizId],
              isQmenuRequest: results[1].some(a => a.email === r.email),
              account: accountMap[r.gmbAccountId],
              accountEmail: (accountMap[r.gmbAccountId] || {}).email,
              task: new Task(taskMap[r._id]),
              state: getState(r.date)
            }))
            .sort((a, b) => b.request.date - a.request.date);
          this.applyFilter();
        },
        error => {
          this.refreshing = false;
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  applyFilter() {
    this.filteredRequests = this.requests.filter(r => this.includeHandled ? this.requests : this.requests.filter(r => !r.request.handledAt));
  }

  taskUpdated(event) {
    // ideally this can apply only to affected entities
    this.refresh();
  }

  crawlAll() {
    alert('not done yet');
  }

}
