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

  averageRequestsPerDay = 0;
  rows = [];
  now = new Date();

  emailGroupedRows = [];

  myColumnDescriptors = [
    {
      label: "Biz Name"
    },
    {
      label: "Account"
    },
    {
      label: "Requests"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.refresh();
  }

  ngOnInit() {
  }

  async refresh() {
    this.now = new Date();

    const requests = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbRequest',
      query: {
        isReminder: false
      },
      projection: {
        date: 1,
        business: 1,
        email: 1,
        isReminder: 1,
        requester: 1,
        gmbAccountId: 1,
        gmbBizId: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 6000
    }).toPromise();

    requests.map(req => req.date = new Date(req.date));
    requests.sort((r1, r2) => r2.date.valueOf() - r1.date.valueOf());

    const gmbBizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1
      },
      limit: 6000
    }).toPromise();

    const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1
      },
      limit: 6000
    }).toPromise();

    const myEmailSet = new Set(gmbAccounts.map(a => a.email));
    const attackingRequests = requests.filter(req => !req.isReminder && !myEmailSet.has(req.email));
    const firstAttackDate = new Date(attackingRequests[attackingRequests.length - 1].date);
    const lastAttackdate = new Date(attackingRequests[0].date);
    this.averageRequestsPerDay = Math.ceil(attackingRequests.length / (1 + (lastAttackdate.valueOf() - firstAttackDate.valueOf()) / (24 * 3600000)));



    const gmbAccountIdDict = {};
    gmbAccounts.map(account => gmbAccountIdDict[account._id] = account);
    const gmbBizIdDict = {};
    gmbBizList.map(biz => gmbBizIdDict[biz._id] = biz);

    requests.map(req => {
      req.isQmenu = myEmailSet.has(req.email);
      req.gmbAccount = gmbAccountIdDict[req.gmbAccountId];
      req.gmbBiz = gmbBizIdDict[req.gmbBizId];
    });

    // group by gmbBizId + gmbAccountId
    const dict = {};
    requests.map(request => {
      const key = request.gmbAccountId + request.gmbBizId;
      if (!dict[key]) {
        dict[key] = {
          requests: [],
          gmbAccount: gmbAccounts.filter(acct => acct._id === request.gmbAccountId)[0],
          gmbBiz: gmbBizList.filter(biz => biz._id === request.gmbBizId)[0],
        };
      }
      dict[key].requests.push(request);
    });


    this.rows = Object.keys(dict).map(k => dict[k]);

    // group by email!
    const emailDict = {};
    requests.map(request => {
      const key = request.email;
      if (!emailDict[key]) {
        emailDict[key] = {
          requests: [],
          requesterEmail: key,
          isQmenu: myEmailSet.has(key)
        };
      }
      emailDict[key].requests.push(request);
    });
    this.emailGroupedRows = Object.keys(emailDict).map(k => emailDict[k]);

  }

}
