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


  /**
   * This will remove non-closed, !postcard, invalid transfer task (where original GMB ownership's lost!)
   */
  async purgeTransferTasks() {

    // 1. already published in B account,
    // 2. no postal type, but A lost ownership, or restaurant was disabled

    const openTransferTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Transfer GMB Ownership',
        result: null
      },
      limit: 5000
    }).toPromise();

    const accounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        email: 1,
        "locations.status": 1,
        "locations.cid": 1
      },
      limit: 5000
    }).toPromise();

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        "googleListing.cid": 1,
        disabled: 1
      },
      limit: 5000
    }).toPromise();

    const disabledRestaurants = restaurants.filter(r => r.disabled);
    const nonDisabledRestaurants = restaurants.filter(r => !r.disabled);

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        cid: 1,
        qmenuId: 1
      },
      limit: 5000
    }).toPromise();

    console.log('Open transfer tasks: ', openTransferTasks);
    console.log('Gmb accounts: ', accounts);
    console.log('Gmb biz: ', gmbBizList);
    console.log('Restaurants disabled: ', disabledRestaurants);

    const tobeClosedTasksWithReasons = openTransferTasks.map(task => {
      const gmbBizId = task.relatedMap.gmbBizId;
      const gmbBiz = gmbBizList.filter(biz => biz._id === gmbBizId)[0];
      if (!gmbBiz) {
        return {
          reason: 'missing gmbBiz ' + gmbBizId,
          task: task
        };
      }

      const matchedDisabledRestaurants = disabledRestaurants.filter(r => r.googleListing && r.googleListing.cid && r.googleListing.cid === gmbBiz.cid || r._id === gmbBiz.qmenuId);
      const matchedNonDisabledRestaurants = nonDisabledRestaurants.filter(r => r.googleListing && r.googleListing.cid && r.googleListing.cid === gmbBiz.cid || r._id === gmbBiz.qmenuId);

      if (matchedNonDisabledRestaurants.length === 0 && matchedDisabledRestaurants.length > 0) {
        return {
          reason: 'restaurant disabled. restaurant id = ' + matchedDisabledRestaurants[0]._id,
          task: task
        };
      }

      const accountBPublished = accounts.filter(account => account.email === task.transfer.toEmail && account.locations.some(loc => loc.cid === gmbBiz.cid && loc.status === 'Published'));
      if (accountBPublished.length > 0) {
        return {
          reason: 'account B published. B email = ' + accountBPublished[0]._id,
          task: task
        };
      }

      const accountALost = accounts.filter(account => account.email === task.transfer.fromEmail && !account.locations.some(loc => loc.cid === gmbBiz.cid && loc.status === 'Published'));

      const isPostcardOrHavingTranferCode = task.transfer.verificationMethod === 'Postcard' || task.transfer.code;

      const isVeryOldAppeal = task.transfer.appealedAt && (new Date().valueOf() - new Date(task.transfer.appealedAt).valueOf() > 21 * 24 * 3600000);

      if (accountALost.length > 0 && (!isPostcardOrHavingTranferCode || isVeryOldAppeal)) {
        return {
          reason: 'account A lost. A email = ' + accountALost[0].email + ', is postcard or having code = ' + isPostcardOrHavingTranferCode + ', is over 21 days = ' + isVeryOldAppeal,
          task: task
        };
      }

      return false;
    }).filter(result => result);


    console.log('tobeClosedTasksWithReasons', tobeClosedTasksWithReasons);

    // patch those tasks to be closed! by system
    const pairs = tobeClosedTasksWithReasons.map(tr => ({
      old: {
        _id: tr.task._id
      },
      new: {
        _id: tr.task._id,
        comments: (tr.task.comments || '') + '\n[closed by system]\n' + tr.reason,
        result: 'CANCELED',
        resultAt: { $date: new Date() }
      }
    }));
    await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();

    return tobeClosedTasksWithReasons;
  }


  /** Remove invalid apply tasks: already gained GMB ownership somewhere! */
  async purgeApplyTasks() {

    // several scenarios
    // 1. original gmbBiz id is missing, 
    // 2. original restaurant was disabled
    // 3. already gained ownership somewhere

    const openApplyTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Apply GMB Ownership',
        result: null
      },
      limit: 5000
    }).toPromise();

    console.log('Open apply tasks: ', openApplyTasks);

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        cid: 1,
        qmenuId: 1
      },
      limit: 6000
    }).toPromise();

    console.log('gmbBizList: ', gmbBizList);

    const disabledRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: true
      },
      projection: {
        disabled: 1,
        "googleListing.cid": 1
      },
      limit: 6000
    }).toPromise();

    console.log('disabled restaurants: ', disabledRestaurants);
    const accounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        "locations.status": 1,
        "locations.cid": 1
      },
      limit: 6000
    }).toPromise();
    console.log('accounts: ', accounts);

    const gmbBizIdMap = gmbBizList.reduce((map, biz) => (map[biz._id] = biz, map), {});
    const gmbBizCidMap = gmbBizList.reduce((map, biz) => (map[biz.cid] = biz, map), {});
    const gmbBizQmenuIdMap = gmbBizList.reduce((map, biz) => (map[biz.qmenuId] = biz, map), {});


    const tasksMissingBizIds = openApplyTasks.filter(t => !gmbBizIdMap[t.relatedMap.gmbBizId]);

    console.log('tasksMissingBizIds', tasksMissingBizIds);

    const tasksWithDisabledRestaurants = openApplyTasks.filter(t => {
      const gmbBiz = gmbBizIdMap[t.relatedMap.gmbBizId];
      if (gmbBiz) {
        const restaurants = disabledRestaurants.filter(r => r._id === gmbBiz.qmenuId || (r.googleListing && r.googleListing.cid === gmbBiz.cid));
        return restaurants.length > 0;
      }
      return false;
    });

    console.log('tasksWithDisabledRestaurants', tasksWithDisabledRestaurants);

    const tasksWithAlreadyPublished = openApplyTasks.filter(t => {
      const gmbBiz = gmbBizIdMap[t.relatedMap.gmbBizId];
      if (gmbBiz) {
        const publishedAccounts = accounts.filter(a => a.locations.some(loc => loc.cid === gmbBiz.cid && loc.status === 'Published'));
        return publishedAccounts.length > 0;
      }
      return false;
    });

    if (tasksMissingBizIds.length > 0) {
      await this._api.patch(environment.adminApiUrl + 'generic?resource=task', tasksMissingBizIds.map(t => ({
        old: { _id: t._id },
        new: {
          _id: t._id,
          result: 'CLOSED',
          resultAt: { $date: new Date() }, comments: (t.comments ? t.comments + '\n' : '') + 'missing gmbBiz id. [closed by system]'
        }
      }))).toPromise();
    }

    if (tasksWithDisabledRestaurants.length > 0) {
      await this._api.patch(environment.adminApiUrl + 'generic?resource=task', tasksWithDisabledRestaurants.map(t => ({
        old: { _id: t._id },
        new: {
          _id: t._id,
          result: 'CLOSED',
          resultAt: { $date: new Date() },
          comments: (t.comments ? t.comments + '\n' : '') + 'restaurant was disabled. [closed by system]'
        }
      }))).toPromise();
    }

    if (tasksWithAlreadyPublished.length > 0) {
      await this._api.patch(environment.adminApiUrl + 'generic?resource=task', tasksWithAlreadyPublished.map(t => ({
        old: { _id: t._id },
        new: {
          _id: t._id,
          result: 'CLOSED',
          resultAt: { $date: new Date() },
          comments: (t.comments ? t.comments + '\n' : '') + 'already published. [closed by system]'
        }
      }))).toPromise();
    }
    return [...tasksMissingBizIds, ...tasksWithDisabledRestaurants, ...tasksWithAlreadyPublished];
  }

  /** Some tasks's gmbBizId is already missing */
  async purgeMissingIdsTasks() {
    const openTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: null
      },
      projection: {
        relatedMap: 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1
      },
      limit: 6000
    }).toPromise();

    const dict = {};
    gmbBizList.map(biz => dict[biz._id] = biz);

    const missingGmbBizIdTasks = openTasks.filter(t => t.relatedMap && t.relatedMap.gmbBizId && !dict[t.relatedMap.gmbBizId]);

    console.log(missingGmbBizIdTasks)
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


  // we have request against a location (gmbBiz?)
  async scanForTransferTask() {
    const gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        locations: 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        score: 1,
        qmenuId: 1,
        cid: 1,
        ignoreGmbOwnershipRequest: 1
      },
      limit: 6000
    }).toPromise();

    const myEmails = new Set(gmbAccounts.map(acct => acct.email));
    const gmbBizIdMap = gmbBizList.reduce((result, biz) => (result[biz._id] = biz, result), {});
    const gmbAccountIdMap = gmbAccounts.reduce((result, acct) => (result[acct._id] = acct, result), {});

    const recentRequests = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbRequest',
      sort: {
        createdAt: -1
      },
      limit: 1400
    }).toPromise();

    const outstandingTransferTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Transfer GMB Ownership',
        result: null,
        // 'transfer.code': { $exists: true }
      },
      projection: {
        relatedMap: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 6000
    }).toPromise();


    // tracking hostile requests
    const bizAccountRequestsMap = {};

    recentRequests.map(request => {
      const gmbAccount = gmbAccountIdMap[request.gmbAccountId];
      const gmbBiz = gmbBizIdMap[request.gmbBizId];
      if (gmbBiz && gmbAccount) {
        // valid attacker:
        // 1. account must be currently published
        // 2. request time is after published time
        // 3. NOT self
        const isSelf = myEmails.has(request.email);
        const isPublished = gmbAccount.locations.some(loc => request.cid && loc.cid === request.cid && loc.status === 'Published');

        if (!isSelf && isPublished) {
          const compositeId = gmbBiz._id + gmbAccount._id;
          bizAccountRequestsMap[compositeId] = bizAccountRequestsMap[compositeId] || [];
          bizAccountRequestsMap[compositeId].push({
            gmbBiz: gmbBiz,
            gmbAccount: gmbAccount,
            gmbRequest: request
          });
        }

      }
    });

    const newTransferTasks = [];

    Object.keys(bizAccountRequestsMap).map(key => {

      const gmbBiz = bizAccountRequestsMap[key][0].gmbBiz;
      const gmbAccount = bizAccountRequestsMap[key][0].gmbAccount;

      // calculate the *ealiest(smalleest)* deadline to transfer (normal -> +7, reminder -> +4)

      // gorup by request email to make figure out first, second, and third reminder!
      const requests = bizAccountRequestsMap[key].map(row => row.gmbRequest);
      // sort requests DESC
      requests.sort((r1, r2) => new Date(r2.date).valueOf() - new Date(r1.date).valueOf());
      for (let i = 0; i < requests.length - 1; i++) {
        if (requests[i].isReminder) {
          for (let j = i + 1; j < requests.length; j++) {
            if (requests[j].email === requests[i].email && new Date(requests[i].date).valueOf() - new Date(requests[j].date).valueOf() < 8 * 24 * 3600000) {
              if (requests[j].isReminder) {
                requests[i].previousReminders = requests[i].previousReminders || 0;
                requests[i].previousReminders = requests[i].previousReminders + 1;
                requests[i].foundOriginal = true;
              } else {
                requests[i].foundOriginal = true;
              }
            }
          }
        }
      }

      const dueDays = bizAccountRequestsMap[key].map(row => {
        const dueDate = new Date(row.gmbRequest.date);
        dueDate.setDate(dueDate.getDate() + (row.gmbRequest.isReminder ? (row.gmbRequest.foundOriginal ? (4 - 2 * (row.gmbRequest.previousReminders || 0)) : 0) : 7));
        return { dueDate: dueDate, gmbAccount: gmbAccount, gmbBiz: gmbBiz, gmbRequest: row.gmbRequest };
      });

      dueDays.sort((d1, d2) => d1.dueDate.valueOf() - d2.dueDate.valueOf());
      // console.log(dueDays);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 21);

      const dueDate = dueDays[dueDays.length - 1].dueDate;

      if (dueDate.valueOf() < threshold.valueOf()) {
        console.log('SKIP OLD ONES' + ' ' + gmbBiz.name + ' @ ' + gmbAccount.email);
      } else {
        const stillPublished = gmbAccount.locations.some(loc => loc.cid === gmbBiz.cid && loc.status === 'Published');
        if (!stillPublished) {
          console.log('SKIP: ' + gmbBiz.name + ' is no longer published under ' + gmbAccount.email);
        } else {
          const existingTasks = outstandingTransferTasks.filter(t => t.relatedMap.gmbAccountId === gmbAccount._id && t.relatedMap.gmbBizId === gmbBiz._id);
          if (existingTasks.length === 0) {
            console.log('DANGER!');
            newTransferTasks.push({
              dueDate: dueDays[dueDays.length - 1].dueDate,
              gmbBiz: gmbBiz,
              gmbAccount: gmbAccount,
              gmbRequest: dueDays[dueDays.length - 1].gmbRequest
            });
          }
        }
      }

    }); // end each biz + account

    console.log('new tasks before filtering', newTransferTasks);

    if (newTransferTasks.length === 0) {
      return [];
    }

    const relatedRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $in: newTransferTasks.map(t => t.gmbBiz.qmenuId).filter(id => id).map(id => ({ $oid: id })) } },
      projection: {
        disabled: 1
      },
      limit: newTransferTasks.length
    }).toPromise();

    console.log(relatedRestaurants);

    const validTransferTasks = newTransferTasks.filter(t => !t.gmbBiz.ignoreGmbOwnershipRequest && !(relatedRestaurants.filter(r => r._id === t.gmbBiz.qmenuId).map(r => r.disabled)[0]));

    const tasks = validTransferTasks
      .map(t => ({
        name: 'Transfer GMB Ownership',
        scheduledAt: new Date(t.dueDate.valueOf() - 2 * 24 * 3600000), // we'd like to have immediate attention!
        description: t.gmbBiz.name,
        roles: ['GMB', 'ADMIN'],
        score: t.gmbBiz.score,
        relatedMap: { cid: t.gmbBiz.cid, gmbBizId: t.gmbBiz._id, gmbAccountId: t.gmbAccount._id, gmbRequestId: t.gmbRequest._id },
        transfer: {
          fromEmail: t.gmbAccount.email,
          againstEmail: t.gmbRequest.email,
          appealValidateDate: t.dueDate
        }
      }));

    const taskIds = await this._api.post(environment.adminApiUrl + 'generic?resource=task', tasks);
    console.log('ceated tasks,', tasks);
    return tasks;
  } // end scan




}
