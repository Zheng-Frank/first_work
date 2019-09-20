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

    const openTransferTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Transfer GMB Ownership',
        result: null
      },
      limit: 6000
    }).toPromise();

    const accounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        email: 1,
        "locations.status": 1,
        "locations.cid": 1
      },
      limit: 6000
    }).toPromise();

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        "googleListing.cid": 1,
        disabled: 1
      },
      limit: 6000
    }).toPromise();

    const disabledRestaurants = restaurants.filter(r => r.disabled);
    const nonDisabledRestaurants = restaurants.filter(r => !r.disabled);

    const gmbBizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        cid: 1,
        qmenuId: 1
      },
      limit: 6000
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

      const havingTransferCode = task.transfer.code;
      const isPostcard = task.transfer.verificationMethod === 'Postcard';

      const isVeryOldAppeal = task.transfer.appealedAt && (new Date().valueOf() - new Date(task.transfer.appealedAt).valueOf() > 21 * 24 * 3600000);

      if (accountALost.length > 0 && !havingTransferCode && (!isPostcard || isVeryOldAppeal)) {
        return {
          reason: `account A lost. A email = ${accountALost[0].email} , is postcard = ${isPostcard}, having code = ${havingTransferCode} , is over 21 days = ${isVeryOldAppeal}`,
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
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', pairs).toPromise();

    return tobeClosedTasksWithReasons;
  }


  /** Remove invalid apply tasks: already gained GMB ownership somewhere! */
  async purgeApplyTasks() {

    // several scenarios
    // 1. original gmbBiz id is missing, 
    // 2. original restaurant was disabled
    // 3. already gained ownership somewhere

    const openApplyTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Apply GMB Ownership',
        result: null
      },
      limit: 6000
    }).toPromise();

    console.log('Open apply tasks: ', openApplyTasks);

    const gmbBizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        cid: 1,
        qmenuId: 1
      },
      limit: 6000
    }).toPromise();

    console.log('gmbBizList: ', gmbBizList);

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        disabled: 1,
        "googleListing.cid": 1
      },
      limit: 6000
    }).toPromise();

    const disabledRestaurants = restaurants.filter(r => r.disabled);
    const enabledRestaurants = restaurants.filter(r => !r.disabled);

    console.log('disabled restaurants: ', disabledRestaurants);
    const accounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
        // BEAWARE SAME cid for two restaurants case!! (Poke Bowl, Kumo Sushi),
        // We don't want to close those tasks with enabled restaurant but same cid
        const disabledMatched = disabledRestaurants.filter(r => r._id === gmbBiz.qmenuId || (r.googleListing && r.googleListing.cid === gmbBiz.cid));
        const enabledMatched = enabledRestaurants.filter(r => r._id === gmbBiz.qmenuId || (r.googleListing && r.googleListing.cid === gmbBiz.cid));
        return disabledMatched.length > 0 && enabledMatched.length === 0;
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
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', tasksMissingBizIds.map(t => ({
        old: { _id: t._id },
        new: {
          _id: t._id,
          result: 'CLOSED',
          resultAt: { $date: new Date() }, comments: (t.comments ? t.comments + '\n' : '') + 'missing gmbBiz id. [closed by system]'
        }
      }))).toPromise();
    }

    if (tasksWithDisabledRestaurants.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', tasksWithDisabledRestaurants.map(t => ({
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
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', tasksWithAlreadyPublished.map(t => ({
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


  async scanForAppealTasks() {
    const openAppealTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Appeal Suspended GMB',
        result: null
      },
      limit: 6000
    }).toPromise();

    console.log('openAppealTasks', openAppealTasks);

    const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        email: 1,
        "locations.cid": 1,
        "locations.name": 1,
        "locations.status": 1,
        "locations.appealId": 1,
        "locations.address": 1,
        "locations.statusHistory": { $slice: 1 }
      },
      limit: 6000
    }).toPromise();

    const gmbBizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        cid: 1
      },
      limit: 6000
    }).toPromise();

    const nonDisabledRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: { $in: [null, false] }
      },
      projection: {
        alias: 1,
        "googleListing.cid": 1,
        web: 1,
        score: 1
      },
      limit: 6000
    }).toPromise();

    const suspendedAccountLocationPairs = [];
    gmbAccounts.map(account => account.locations.map(loc => {
      if (loc.status === 'Suspended' && new Date().valueOf() - new Date(loc.statusHistory[0].time).valueOf() < 21 * 24 * 3600000) {
        const gmbBiz = gmbBizList.filter(b => b.cid === loc.cid)[0];
        const restaurant = nonDisabledRestaurants.filter(r => r.googleListing && r.googleListing.cid === loc.cid)[0];
        if (gmbBiz) {
          suspendedAccountLocationPairs.push({ account: account, location: loc, gmbBiz: gmbBiz, restaurant: restaurant })
        }
      }
    }));

    console.log('suspendedAccountLocationPairs', suspendedAccountLocationPairs);


    // no such cids are published anywhere,
    // no same cid already in appealing process
    // no same cid in this batch either!

    const inAppealingCids = new Set();
    openAppealTasks.map(t => inAppealingCids.add(t.relatedMap.location.cid));
    console.log(inAppealingCids);

    const publishedCidSet = new Set();
    gmbAccounts.map(account => (account.locations || []).map(loc => { if (loc.status === 'Published') { publishedCidSet.add(loc.cid) } }));
    console.log(publishedCidSet);


    // sometimes there is still no restaurant created yet for a GMB entity

    const newSuspendedAccountLocationsPairs = suspendedAccountLocationPairs.filter(pair => pair.restaurant && !publishedCidSet.has(pair.location.cid) && !inAppealingCids.has(pair.location.cid));

    console.log('newSuspendedAccountLocationsPairs', newSuspendedAccountLocationsPairs);

    const newAppealTasks = newSuspendedAccountLocationsPairs.map(pair => {

      let targetWebsite = pair.location.website;

      // try to assign qmenu website!
      if (pair.restaurant && pair.restaurant.web && pair.restaurant.web.qmenuWebsite) {
        targetWebsite = pair.restaurant.web.qmenuWebsite;
      }

      if (pair.restaurant && pair.restaurant.web && pair.restaurant.web.useBizWebsite && pair.restaurant.web.bizManagedWebsite) {
        targetWebsite = pair.restaurant.web.bizManagedWebsite;
      }
      return {
        name: 'Appeal Suspended GMB',
        relatedMap: {
          gmbBizId: pair.gmbBiz._id,
          gmbAccountId: pair.account._id,
          appealId: pair.location.appealId,
          location: pair.location,
          website: targetWebsite
        },
        scheduledAt: {
          $date: new Date()
        },
        etc: {
          fromEmail: pair.account.email
        },
        description: pair.gmbBiz.name,
        roles: ['GMB', 'ADMIN'],
        score: pair.restaurant.score
      }
    });

    console.log('newAppealTasks: ', newAppealTasks);


    // lets create the task!
    const result = await this._api.post(environment.qmenuApiUrl + 'generic?resource=task', newAppealTasks);

    return newAppealTasks
  }


  /** Some tasks's gmbBizId is already missing */
  async purgeMissingIdsTasks() {
    const openTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: null
      },
      projection: {
        relatedMap: 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
 * Invalid appeal tasks: 
 * 1. running time too long! (created 30 days ago)
 * 2. or appealId NOT found or suspended any more
 */
  async purgeAppealTasks() {
    
    const openAppealTasks = [];
    const batchSize = 1000;
    let skip = 0;
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'task',
        query: {
          name: 'Appeal Suspended GMB',
          result: null
        },
        skip: skip,
        limit: batchSize
      }).toPromise();
      if (batch.length === 0) {
        break;
      }
      openAppealTasks.push(...batch);
      skip += batchSize;
    }



    const gmbAccounts = [];
    const gmbAccountsBatchSize = 1000;
    let gmbAccountsSkip = 0;
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        query: {
          locations: { $exists: 1 }
        },
        projection: {
          email: 1,
          "locations.appealId": 1,
          "locations.address": 1,
          "locations.name": 1,
          "locations.status": 1
        },
        skip: gmbAccountsSkip,
        limit: gmbAccountsBatchSize
      }).toPromise();
      if (batch.length === 0) {
        break;
      }
      gmbAccounts.push(...batch);
      gmbAccountsSkip += gmbAccountsBatchSize;
    }

   
 

    console.log('Open appeal tasks: ', openAppealTasks);

    const appealIdNotFoundTasks = openAppealTasks.filter(t => !gmbAccounts.some(account => account.locations.some(loc => loc.appealId === t.relatedMap.location.appealId)));
    const addressNotFoundTasks = openAppealTasks.filter(t => !gmbAccounts.some(account => account.locations.some(loc => loc.address === t.relatedMap.location.address)));
    const bizNameNotFoundTasks = openAppealTasks.filter(t => !gmbAccounts.some(account => account.locations.some(loc => loc.name === t.relatedMap.location.name)));
    const locationIsNotSuspendedAnymore = openAppealTasks.filter(t => !gmbAccounts.some(account => account.locations.some(loc => loc.appealId === t.relatedMap.location.appealId && loc.status === 'Suspended')));
    const taskIsTooOld = openAppealTasks.filter(t => new Date().valueOf() - new Date(t.createdAt).valueOf() > 30 * 24 * 3600000);

    console.log('appealIdNotFoundTasks', appealIdNotFoundTasks);
    console.log('addressNotFoundTasks', addressNotFoundTasks);
    console.log('bizNameNotFoundTasks', bizNameNotFoundTasks);
    console.log('locationIsNotSuspendedAnymore', locationIsNotSuspendedAnymore);
    console.log('taskIsTooOld', taskIsTooOld);

    const patchList = [
      ...appealIdNotFoundTasks.map(t => ({ task: t, reason: 'missing appealId' })),
      ...addressNotFoundTasks.map(t => ({ task: t, reason: 'missing address' })),
      ...bizNameNotFoundTasks.map(t => ({ task: t, reason: 'missing biz name' })),
      ...locationIsNotSuspendedAnymore.map(t => ({ task: t, reason: 'not suspended anymore' })),
      ...taskIsTooOld.map(t => ({ task: t, reason: 'too old' })),
    ].map(tr => ({
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

    console.log(patchList)

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', patchList).toPromise();

    return [...appealIdNotFoundTasks, ...locationIsNotSuspendedAnymore, ...taskIsTooOld];
  }


  async deleteOutdatedTasks() {
    const closedTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
    await this._api.delete(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      ids: toBeRemovedTasks.map(t => t._id)
    }).toPromise();
    return toBeRemovedTasks;
  }

  async deleteMissingBizIdTasks() {
    const openTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: null
      },
      limit: 2000
    }).toPromise();
    console.log(openTasks);

    const bizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1
      },
      limit: 6000
    }).toPromise();

    const taskBizIdSet = new Set(openTasks.filter(t => t.relatedMap && t.relatedMap.gmbBizId).map(t => t.relatedMap.gmbBizId));
    const bizIdSet = new Set(bizList.map(b => b._id));

    const missingInBizSet = new Set([...taskBizIdSet].filter(id => !bizIdSet.has(id)));

    const toBeRemovedTasks = openTasks.filter(t => t.relatedMap && missingInBizSet.has(t.relatedMap.gmbBizId));
    console.log(toBeRemovedTasks);

    await this._api.delete(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      ids: toBeRemovedTasks.map(t => t._id)
    }).toPromise();
    return toBeRemovedTasks;
  }


  // we have request against a location (gmbBiz?)
  async scanForTransferTask() {
    const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        "locations.status": 1,
        "locations.cid": 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        qmenuId: 1,
        cid: 1
      },
      limit: 6000
    }).toPromise();

    const myEmails = new Set(gmbAccounts.map(acct => acct.email));
    const gmbBizIdMap = gmbBizList.reduce((result, biz) => (result[biz._id] = biz, result), {});
    const gmbAccountIdMap = gmbAccounts.reduce((result, acct) => (result[acct._id] = acct, result), {});

    let recentRequests = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbRequest',
      sort: {
        createdAt: -1
      },
      limit: 1400
    }).toPromise();

    console.log('recentRequests', recentRequests);

    const outstandingTransferTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
        if (!request.cid) {
          request.cid = gmbBiz.cid;
        }
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
        } else {

        }

      }
    });

    console.log(bizAccountRequestsMap);

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
            newTransferTasks.push({
              dueDate: dueDays[dueDays.length - 1].dueDate,
              gmbBiz: gmbBiz,
              gmbAccount: gmbAccount,
              gmbRequest: dueDays[dueDays.length - 1].gmbRequest
            });
          } else {
            console.log('Found existing: ', gmbAccount.email, gmbBiz.name, existingTasks)
          }
        }
      }

    }); // end each biz + account

    console.log('new tasks before filtering', newTransferTasks);

    if (newTransferTasks.length === 0) {
      return [];
    }

    const relatedQmenuIds = [...new Set(newTransferTasks.map(t => t.gmbBiz.qmenuId).filter(id => id))];
    const relatedCids = [...new Set(newTransferTasks.map(t => t.gmbBiz.cid).filter(cid => cid))];

    console.log(relatedQmenuIds);
    console.log(relatedCids);

    const relatedRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        $or: [
          {
            _id: { $in: relatedQmenuIds.map(id => ({ $oid: id })) },
          },
          {
            "googleListing.cid": { $in: relatedCids }
          }
        ]
      },

      projection: {
        disabled: 1,
        score: 1,
        "googleListing.cid": 1,
        web: 1
      },
      limit: newTransferTasks.length
    }).toPromise();

    const cidRestaurantMap = relatedRestaurants.reduce((map, r) => (map[(r.googleListing || {}).cid] = r, map), {});


    const validTransferTasks = newTransferTasks.filter(t => {
      const restaurant = cidRestaurantMap[t.gmbBiz.cid];
      return restaurant && (!restaurant.web || !restaurant.ignoreGmbOwnershipRequest) && !restaurant.disabled;
    });

    const tasks = validTransferTasks
      .map(t => ({
        name: 'Transfer GMB Ownership',
        scheduledAt: new Date(t.dueDate.valueOf() - 2 * 24 * 3600000), // we'd like to have immediate attention!
        description: t.gmbBiz.name,
        roles: ['GMB', 'ADMIN'],
        score: (cidRestaurantMap[t.gmbBiz.cid] || {}).score,
        relatedMap: { cid: t.gmbBiz.cid, gmbBizId: t.gmbBiz._id, gmbAccountId: t.gmbAccount._id, gmbRequestId: t.gmbRequest._id },
        transfer: {
          fromEmail: t.gmbAccount.email,
          againstEmail: t.gmbRequest.email,
          appealValidateDate: t.dueDate
        }
      }));

    if (tasks.length > 0) {
      const taskIds = await this._api.post(environment.qmenuApiUrl + 'generic?resource=task', tasks);
    }

    console.log('ceated tasks,', tasks);
    return tasks;
  } // end scan




}
