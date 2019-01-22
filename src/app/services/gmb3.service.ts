import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { GmbAccount } from '../classes/gmb/gmb-account';
import { GmbLocation } from '../classes/gmb/gmb-location';
import { GmbBiz } from '../classes/gmb/gmb-biz';
import { GmbRequest } from '../classes/gmb/gmb-request';
import { zip } from 'rxjs';
import { Task } from '../classes/tasks/task';
import { TaskService } from './task.service';
import { mergeMap } from "rxjs/operators";
import { GlobalService } from './global.service';
import { AlertType } from '../classes/alert-type';
import { Helper } from '../classes/helper';

@Injectable({
  providedIn: 'root'
})
export class Gmb3Service {

  constructor(private _api: ApiService, private _task: TaskService, private _global: GlobalService) {
  }

  async computePostcardTasksThatJustLost() {
    // transfer tasks that are NOT in original accounts anymore!
    const runningTransferTasksWithCode = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Transfer GMB Ownership',
        result: null,
        'transfer.code': { $exists: true }
      },
      limit: 1000
    }).toPromise();

    console.log('runningTransferTasksWithCode', runningTransferTasksWithCode);

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        accounts: 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizIdMap = gmbBizList.reduce((map, biz) => (map[biz._id] = biz, map), {});

    const lostList = runningTransferTasksWithCode.filter(task => {
      const gmbBiz = gmbBizIdMap[task.relatedMap.gmbBizId];
      const holdingAccount = ((gmbBiz || {}).accounts || []).filter(acct => acct.id === task.relatedMap.gmbAccountId)[0];
      const holdingAccountHistory = ((holdingAccount || {}).history || []);
      // ONLY published, we keep it. If anything else, we'd like to transfer away
      const lastIsPublished = ['Published'].some(status => status === holdingAccountHistory.map(h => h.status).slice(-1)[0]);
      return !lastIsPublished;
    });

    // now reschedule those by systems!
    console.log('lost list: ', lostList);
    if (lostList.length > 0) {
      const pairs = [];
      pairs.push(...lostList.map(t => ({
        old: {
          _id: t._id
        },
        new: {
          _id: t._id,
          scheduledAt: { $date: new Date() },
          comments: (!t.comments || t.comments.indexOf('[rescheduled by system]') < 0) ? (t.comments || '') + ' [rescheduled by system]' : t.comments
        }
      })));

      await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();
    }
    return lostList;
  }


}
