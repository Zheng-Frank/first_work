import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { GmbBiz } from '../classes/gmb/gmb-biz';
import { GmbAccount } from '../classes/gmb/gmb-account';
import { zip, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private _api: ApiService) { }

  /** A gmb scan found s biz is suspended. We need to insert a new task if it's not yet in the 
   * task list (both gmbAccountId and bizId)
  */
  async upsertSuspendedTask(gmbBiz: GmbBiz, gmbAccount: GmbAccount) {
    // Query existing non-closed tasks that name is 'Appeal Suspended GMB', the gmbAccount and gmbBiz
    const results = await zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "task",
        query: {
          name: 'Appeal Suspended GMB',
          "relatedMap.gmbBizId": gmbBiz._id,
          "relatedMap.gmbAccountId": gmbAccount._id,
          "relatedMap.appealId": gmbBiz.appealId,
          result: null // either null or non-exist
        },
        limit: 1
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        query: { _id: { $oid: gmbBiz._id } },
        projection: {
          name: 1,
          score: 1
        },
        limit: 1
      })
    ).toPromise();

    const openTask = results[0][0];

    if (openTask) {
      return openTask;
    }

    const gmbBizWithScore: GmbBiz = results[1][0];

    const newTask = {
      name: 'Appeal Suspended GMB',
      relatedMap: {
        gmbBizId: gmbBiz._id,
        gmbAccountId: gmbAccount._id,
        appealId: gmbBiz.appealId
      },
      scheduledAt: {
        $date: new Date()
      },
      // fake transfer object (compatible with transfer tasks)
      transfer: {
        fromEmail: gmbAccount.email
      },
      description: gmbBiz.name + ' @ ' + gmbAccount.email.split('@')[0],
      roles: ['GMB', 'ADMIN'],
      score: gmbBizWithScore.score
    } as any;

    // lets create the task!
    const result = await this._api.post(environment.adminApiUrl + 'generic?resource=task', [newTask]);
    newTask['_id'] = result[0];
    newTask['scheduledAt'] = new Date();
    return newTask;
  }

  /**
   * This will remove non-claimed, non-closed, invalid transfer task (where original GMB ownership's lost!)
   */
  async purgeTransferTasks() {
    const openNonClaimedTransferTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Transfer GMB Ownership',
        assignee: null
      },
      limit: 500
    }).toPromise();

    const bizIds = openNonClaimedTransferTasks.map(task => task.relatedMap.gmbBizId);

    const gmbBizList = [];

    const batchSize = 100;

    while (bizIds.length > 0) {
      const slice = bizIds.splice(0, batchSize);
      const list = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          _id: { $in: slice.map(id => ({ $oid: id })) },
        },
        projection: {
          gmbOwnerships: 1
        },
        limit: 5000
      }).toPromise();
      gmbBizList.push(...list);
    }

    const bizMap = {};
    gmbBizList.map(b => bizMap[b._id] = b);

    const toBeClosed = openNonClaimedTransferTasks.filter(t => {
      const gmbBiz = bizMap[t.relatedMap['gmbBizId']];
      return gmbBiz && gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].email !== t.transfer.fromEmail;
    });

    // patch those tasks to be closed! by system
    const pairs = toBeClosed.map(t => ({
      old: {
        _id: t._id
      },
      new: {
        _id: t._id,
        assignee: 'system',
        result: 'CANCELED',
        resultAt: { $date: new Date() }
      }
    }));

    await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();

    return toBeClosed;
  }

}
