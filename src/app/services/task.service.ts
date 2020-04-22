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
}
