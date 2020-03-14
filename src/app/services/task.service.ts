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

    const openTransferTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Transfer GMB Ownership',
        result: null
      },
      limit: 6000
    }).toPromise();

    // patch those tasks to be closed! by system
    const pairs = openTransferTasks.map(task => ({
      old: {
        _id: task._id
      },
      new: {
        _id: task._id,
        comments: (task.comments || '') + '\n[closed by system]\n',
        result: 'CANCELED',
        resultAt: { $date: new Date() }
      }
    }));
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', pairs).toPromise();

    return openTransferTasks;
  }


  /** Remove invalid apply tasks: already gained GMB ownership somewhere! */
  async purgeApplyTasks() {

    const openApplyTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Apply GMB Ownership',
        result: null
      },
      limit: 6000
    }).toPromise();

    if (openApplyTasks.length > 500) {
      openApplyTasks.length = 500;
    }
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', openApplyTasks.map(t => ({
      old: { _id: t._id },
      new: {
        _id: t._id,
        result: 'CLOSED',
        resultAt: { $date: new Date() },
        comments: (t.comments ? t.comments + '\n' : '') + 'already published. [closed by system]'
      }
    }))).toPromise();

    return openApplyTasks;
  }

  async scanForAppealTasks() {
    const openAppealTasks = [];
    const openAppealSize = 2000;
    let openAppealSkip = 0;

    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'task',
        query: {
          name: 'Appeal Suspended GMB',
          result: null
        },
        skip: openAppealSkip,
        limit: openAppealSize
      }).toPromise();

      openAppealTasks.push(...batch);

      if (batch.length === 0) {
        break;
      }
      openAppealSkip += openAppealSize;
    }

    console.log('openAppealTasks', openAppealTasks);

    const gmbAccounts = [];
    const gmbAccountsSize = 50;
    let gmbAccountsSkip = 0;

    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
        skip: gmbAccountsSkip,
        limit: gmbAccountsSize
      }).toPromise();

      gmbAccounts.push(...batch);

      if (batch.length === 0) {
        break;
      }
      gmbAccountsSkip += gmbAccountsSize;
    }

    const gmbBizList = [];
    const gmbBizSize = 2000;
    let gmbBizSkip = 0;

    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          name: 1,
          cid: 1
        },
        skip: gmbBizSkip,
        limit: gmbBizSize
      }).toPromise();

      gmbBizList.push(...batch);

      if (batch.length === 0) {
        break;
      }
      gmbBizSkip += gmbBizSize;
    }

    const nonDisabledRestaurants = [];
    const nonDisabledSize = 2000;
    let nonDisabledSkip = 0;

    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
        skip: nonDisabledSkip,
        limit: nonDisabledSize
      }).toPromise();

      nonDisabledRestaurants.push(...batch);

      if (batch.length === 0) {
        break;
      }
      nonDisabledSkip += nonDisabledSize;
    }


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

    const gmbBizBatchSize = 3000;
    const gmbBizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          name: 1
        },
        skip: gmbBizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      gmbBizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }


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
    const gmbAccountsBatchSize = 100;
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

  // we have request against a location (gmbBiz?)
  async scanForTransferTask(prtFilter) {
    const rtFilter = new RegExp(prtFilter || '.');
    const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        "locations.status": 1,
        "locations.cid": 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizBatchSize = 3000;
    const gmbBizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          name: 1,
          qmenuId: 1,
          cid: 1
        },
        skip: gmbBizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      gmbBizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }


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


    const transferBatchSize = 2000;
    const outstandingTransferTasks = [];
    while (true) {
      const oneRun = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
        skip: outstandingTransferTasks.length,
        limit: transferBatchSize

      }).toPromise();
      outstandingTransferTasks.push(...oneRun);
      if (oneRun.length === 0 || oneRun.length < transferBatchSize) {
        break;
      }
    }

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
        name: 1,
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
      return restaurant && (!restaurant.web || !restaurant.ignoreGmbOwnershipRequest) && !restaurant.disabled && rtFilter.test(restaurant.name || "");
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
