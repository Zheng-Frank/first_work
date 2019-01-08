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
      etc: {
        fromEmail: gmbAccount.email
      },
      description: gmbBiz.name,
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
   * This will remove non-closed, !postcard, over 50 days invalid transfer task (where original GMB ownership's lost!)
   */
  async purgeTransferTasks() {

    const openTransferTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Transfer GMB Ownership',
        result: null
      },
      limit: 5000
    }).toPromise();

    console.log('Open transfer tasks: ', openTransferTasks);

    const bizIds = openTransferTasks.map(task => task.relatedMap.gmbBizId);
    const requestIds = openTransferTasks.map(task => task.relatedMap.gmbRequestId);

    const gmbBizList = [];

    const batchSize = 100;

    const requests = [];
    while (bizIds.length > 0) {
      const slice = bizIds.splice(0, batchSize);

      const list = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          _id: { $in: slice.map(id => ({ $oid: id })) },
        },
        projection: {
          gmbOwnerships: { $slice: -4 }
        },
        limit: 5000
      }).toPromise();

      gmbBizList.push(...list);

      const requestsSlice = requestIds.splice(0, batchSize);
      const batchedRequests = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbRequest',
        query: {
          _id: { $in: requestsSlice.map(id => ({ $oid: id })) },
        },
        projection: {
          email: 1
        },
        limit: 5000
      }).toPromise();
      requests.push(...batchedRequests);
    }

    const myAccounts = await this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbAccount",
      projection: {
        email: 1
      },
      limit: 1000
    }).toPromise();

    const myEmailsSet = new Set(myAccounts.map(a => a.email));
    console.log('myemails', myEmailsSet);
    console.log('requests', requests);
    const myRequestIdsSet = new Set(requests.filter(request => myEmailsSet.has(request.email)).map(r => r._id));

    console.log('myRequestIdSet', myRequestIdsSet)
    // // some tasks were wrongly created to against self :(
    const againMyselfTasks = openTransferTasks.filter(t => myRequestIdsSet.has(t.relatedMap.gmbRequestId) && (!t.transfer || !t.transfer.code));

    console.log('against myself tasks, no code yet ', againMyselfTasks);

    const bizMap = {};

    gmbBizList.map(b => bizMap[b._id] = b);
    // current biz's account is NOT original's account, and NOT postcard
    const toBeClosed = openTransferTasks.filter(t => {
      const gmbBiz = bizMap[t.relatedMap['gmbBizId']];
      if (!gmbBiz) {
        console.log('gmbBiz Not Found!', t.relatedMap);
        console.log('task', t);
        return true;
      }
      const notPostcard = t.transfer.verificationMethod !== 'Postcard';
      const noCode = !t.transfer.code;
      const lastEmail = (gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1] || {}).email;

      const originalAccountLost = lastEmail !== t.transfer.fromEmail;

      if (originalAccountLost && notPostcard && noCode) {
        t.comments = (t.comments ? t.comments + ' ' : '') + 'Ownership transferred to ' + (lastEmail || 'N/A');
        return true;
      }
      return false;
    });

    console.log('To be closed: ', toBeClosed);

    // patch those tasks to be closed! by system
    const pairs = [...toBeClosed, ...againMyselfTasks].map(t => ({
      old: {
        _id: t._id
      },
      new: {
        _id: t._id,
        assignee: 'system',
        comments: (t.comments || '') + '\n[closed by system: NOT postcard, NO code, GMB lost, or against self]',
        result: 'CANCELED',
        resultAt: { $date: new Date() }
      }
    }));

    await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();

    return toBeClosed;
  }

  /**
 * This will remove non-claimed, non-closed, invalid transfer task (where original GMB ownership's lost!)
 */
  async purgeAppealTasks() {
    const openAppealTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Appeal Suspended GMB',
        result: null
      },
      limit: 5000
    }).toPromise();

    console.log('Open appeal tasks: ', openAppealTasks);

    const bizIds = openAppealTasks.map(task => task.relatedMap.gmbBizId);

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
          gmbOwnerships: { $slice: -4 }
        },
        limit: 5000
      }).toPromise();
      gmbBizList.push(...list);
    }

    const bizMap = {};
    gmbBizList.map(b => bizMap[b._id] = b);


    // find those that's published (last ownership has email && status is not suspended!)
    const toBeClosed = openAppealTasks.filter(t => {
      const gmbBiz = bizMap[t.relatedMap['gmbBizId']];
      if (!gmbBiz) {
        console.log('gmbBiz Not Found!', t.relatedMap);
        console.log('task', t);
        // delete the task!
        return true;
      }
      return gmbBiz && gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].email && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status !== 'Suspended';
    });

    console.log('To be closed: ', toBeClosed);
    // patch those tasks to be closed! by system
    const pairs = toBeClosed.map(t => ({
      old: {
        _id: t._id
      },
      new: {
        _id: t._id,
        assignee: 'system',
        result: 'CANCELED',
        comments: (t.comments || '') + '\n[closed by system]',
        resultAt: { $date: new Date() }
      }
    }));

    await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();

    return toBeClosed;
  }

  async purgeApplyTasks() {
    const openApplyTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Apply GMB Ownership',
        result: null
      },
      limit: 5000
    }).toPromise();

    console.log('Open apply tasks: ', openApplyTasks);

    const bizIds = openApplyTasks.map(task => task.relatedMap.gmbBizId);

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
          gmbOwnerships: { $slice: -4 }
        },
        limit: 5000
      }).toPromise();
      gmbBizList.push(...list);
    }

    const bizMap = {};
    gmbBizList.map(b => bizMap[b._id] = b);

    // find those that's published (last ownership has email!)
    const toBeClosed = openApplyTasks.filter(t => {
      const gmbBiz = bizMap[t.relatedMap['gmbBizId']];
      if (!gmbBiz) {
        console.log('gmbBiz Not Found!', t.relatedMap);
        console.log('task', t);
        return false;
      }
      return gmbBiz && gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].email;
    });

    console.log('To be closed:', toBeClosed);
    // patch those tasks to be closed! by system
    const pairs = toBeClosed.map(t => ({
      old: {
        _id: t._id
      },
      new: {
        _id: t._id,
        assignee: t.assignee || 'system',
        result: 'CANCELED',
        comments: (t.comments || '') + '\n[closed by system: GMB OWNED.]',
        resultAt: { $date: new Date() }
      }
    }));

    await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();

    return toBeClosed;
  }

  async deleteOutdatedTasks() {
    const closedTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: { $exists: 1 }
      },
      limit: 1000
    }).toPromise();
    console.log(closedTasks)
    const days45 = 45 * 24 * 3600000;
    const toBeRemovedTasks = closedTasks.filter(t => t.result && (t.assignee === 'system' || (new Date().valueOf() - new Date(t.resultAt).valueOf()) > days45));
    console.log('Expired Tasks: ', toBeRemovedTasks);
    // may be too many for one iteration to remove
    if (toBeRemovedTasks.length > 100) {
      toBeRemovedTasks.length = 100;
    }
    await this._api.delete(environment.adminApiUrl + 'generic', {
      resource: 'task',
      ids: toBeRemovedTasks.map(t => t._id)
    }).toPromise();
    return toBeRemovedTasks;
  }

  async deleteMissingBizIdTasks() {
    const openTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: null
      },
      limit: 2000
    }).toPromise();
    console.log(openTasks);

    const bizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1
      },
      limit: 5000
    }).toPromise();

    const taskBizIdSet = new Set(openTasks.filter(t => t.relatedMap && t.relatedMap.gmbBizId).map(t => t.relatedMap.gmbBizId));
    const bizIdSet = new Set(bizList.map(b => b._id));

    const missingInBizSet = new Set([...taskBizIdSet].filter(id => !bizIdSet.has(id)));

    const toBeRemovedTasks = openTasks.filter(t => t.relatedMap && missingInBizSet.has(t.relatedMap.gmbBizId));
    console.log(toBeRemovedTasks);

    await this._api.delete(environment.adminApiUrl + 'generic', {
      resource: 'task',
      ids: toBeRemovedTasks.map(t => t._id)
    }).toPromise();
    return toBeRemovedTasks;
  }

}
