import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { TaskService } from './task.service';
import { GlobalService } from './global.service';
import { AlertType } from '../classes/alert-type';
@Injectable({
  providedIn: 'root'
})
export class Gmb3Service {

  constructor(private _api: ApiService, private _task: TaskService, private _global: GlobalService) {
  }

  async scanOneAccountForLocations(email, stayAfterScan) {
    const account = (await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        email: email
      },
      projection: {
        password: 1,
        email: 1,
        locations: 1
      },
      limit: 1
    }).toPromise())[0];

    const appealIdsToSkipDetails = (account.locations || []).filter(loc => loc.appealId && loc.cid).map(loc => loc.appealId);
    let password = account.password;
    if (password.length > 20) {
      password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: account.email, phrase: password }).toPromise();
    }
    const scanResult = await this._api.post(environment.autoGmbUrl + 'scanLocations3', { email: email, password: password, appealIdsToSkipDetails: appealIdsToSkipDetails, stayAfterScan: stayAfterScan }).toPromise();
    const scannedLocations = scanResult.locations;
    const scannedTime = new Date();

    // match locations back! using appealId???
    const newLocations = scannedLocations.filter(loc => !(account.locations || []).some(loc2 => loc2.appealId === loc.appealId));
    const oldLocations = (account.locations || []).filter(loc1 => scannedLocations.some(loc2 => loc2.appealId === loc1.appealId));
    const removedLocations = (account.locations || []).filter(loc1 => !scannedLocations.some(loc2 => loc2.appealId === loc1.appealId));

    const updatedLocations = [];

    // push all new locations (add a statusHistory!)
    newLocations.map(loc => {
      loc.statusHistory = [{
        time: scannedTime,
        status: loc.status
      }];
      updatedLocations.push(loc);
    });

    // push those old locations but if there is a status update, unshift one history as well
    oldLocations.map(loc => {
      const scannedLoc = scannedLocations.filter(loc2 => loc2.appealId === loc.appealId)[0];
      if (loc.status !== scannedLoc.status) {
        loc.statusHistory.unshift({
          time: scannedTime,
          status: scannedLoc.status
        });
      }
      // also update every fields from scannedLoc
      Object.assign(loc, scannedLoc);
      updatedLocations.push(loc);
    });

    // push a 'removed' status to those removed
    removedLocations.map(loc => {
      loc.status = 'Removed';
      loc.statusHistory.unshift({
        time: scannedTime,
        status: loc.status
      });
      updatedLocations.push(loc);
    });

    await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount', [
      {
        old: { _id: account._id },
        new: { _id: account._id, gmbScannedAt: { $date: new Date() }, locations: updatedLocations, pagerSize: scanResult.pagerSize, allLocations: scanResult.allLocations, published: scanResult.published, suspended: scanResult.suspended }
      }
    ]).toPromise();

    console.log('new', newLocations);
    console.log('old (but maybe updated)', oldLocations);
    console.log('removed', removedLocations);

    return scannedLocations;
  }

  async scanOneEmailForGmbRequests(email, stayAfterScan) {
    const account = (await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        email: email,
      },
      projection: {
        password: 1,
        email: 1,
        locations: 1
      },
      limit: 1
    }).toPromise())[0];


    const daysAgo15 = new Date();
    daysAgo15.setDate(daysAgo15.getDate() - 15);

    const existingRequests = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbRequest',
      query: {
        gmbAccountId: account._id,
        createdAt: { $gte: { $date: daysAgo15 } }
      },
      projection: {
        gmbBizId: 1,
        gmbAccountId: 1,
        date: 1,
        business: 1,
        email: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 100000
    }).toPromise();
    existingRequests.sort((r1, r2) => new Date(r1.date).valueOf() - new Date(r2.date).valueOf());


    let password = account.password;

    if (password.length > 20) {
      password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: account.email, phrase: password }).toPromise();
    }

    // scan locations
    const scanResult = await this._api.post(environment.autoGmbUrl + 'retrieveGmbRequests', { email: account.email, password: password, stayAfterScan: stayAfterScan }).toPromise();
    console.log('scanned ', scanResult);

    // convert date to $date
    scanResult.map(sr => sr.date = new Date(sr.date));

    // remove those that are more than 15 days old!
    const scanResultWithin15Days = scanResult.filter(item => new Date(item.date).valueOf() > daysAgo15.valueOf());
    console.log('within 15 days ', scanResultWithin15Days);
    // SAME email, business, and date --> same request!
    const newItems = scanResultWithin15Days.filter(item => !existingRequests.some(r => r.business === item.business && r.email === item.email && new Date(r.date).valueOf() === new Date(item.date).valueOf()));
    console.log('new items: ', newItems);
    // match gmbBizId: (by name under account??? what if duplicate?)
    // if we didn't find a match, skip it. This may due to outdated account scan (gmbBiz doesn't register yet)

    // get existing gmbBizList to match for
    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        cid: 1
      },
      limit: 6000
    }).toPromise();

    newItems.map(item => {
      // biz match strategy: same name, same account email, and first encounter of status before this item's date is Published!

      const matchedLocation = account.locations.map(loc => {
        const exactNameMatched = loc.name.toLowerCase() === item.business.toLowerCase();
        const skippedKeywords = ['the', 'restaurant', '&', 'and'];
        const fuzzyNameMatched = loc.name.toLowerCase().split(' ').filter(t => t && skippedKeywords.indexOf(t) < 0).join(',') === item.business.toLowerCase().split(' ').filter(t => t && skippedKeywords.indexOf(t) < 0).join(',');

        const lastIsPublished = loc.status === 'Published';

        const holdingAccountHistoryBefore = loc.statusHistory.filter(h => new Date(h.time).valueOf() < new Date(item.date).valueOf());
        const wasPublished = (holdingAccountHistoryBefore[0] || {}).status === 'Published';

        const nameScore = exactNameMatched ? 10 : (fuzzyNameMatched ? 8 : 0);
        const statusScore = wasPublished ? 4 : (lastIsPublished ? 3 : 0);
        return {
          score: nameScore + statusScore,
          location: loc
        };
      }).sort((r1, r2) => r2.score - r1.score)[0];

      const matchedBiz = gmbBizList.filter(biz => biz.cid === (matchedLocation || {}).cid || 'nonexist')[0];
      
      if (!matchedBiz) {
        console.log('NO MATCH');
        console.log(account.email);
        console.log(gmbBizList);
        console.log(item);
        // throw 'NOT MATCHED ANYTHING'
      }

      item.gmbBizId = matchedBiz.biz._id;
      item.cid = matchedBiz.biz.cid;
      item.gmbAccountId = account._id;
      item.gmbAccountEmail = account.email;

    });

    const nonMatchedItems = newItems.filter(i => !i.gmbBizId);
    const matchedItems = newItems.filter(i => i.gmbBizId);

    if (matchedItems.length > 0) {
      this._global.publishAlert(AlertType.Success, 'Found new' + matchedItems.length);
      // await this._api.post(environment.adminApiUrl + 'generic?resource=gmbRequest', newItems).toPromise();
    }

    if (nonMatchedItems.length > 0) {
      this._global.publishAlert(AlertType.Danger, 'Not matched requests: ' + nonMatchedItems.length);
      console.log(nonMatchedItems);
    }

    alert('actual scan email is commented out')
    // await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount', [
    //   {
    //     old: { _id: account._id },
    //     new: { _id: account._id, emailScannedAt: { $date: new Date() } }
    //   }
    // ]).toPromise();
    console.log('updated emailScannedAt for ' + account.email);

    return newItems;

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

    const gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        locations: 1
      },
      limit: 6000
    }).toPromise();

    const gmbAccountIdMap = gmbAccounts.reduce((map, acct) => (map[acct._id] = acct, map), {});

    const lostList = runningTransferTasksWithCode.filter(task => {
      const holdingAccount = gmbAccountIdMap[task.relatedMap.gmbAccountId];
      return ((holdingAccount || {}).locations || []).some(loc => loc.place_id === ((task.transfer || {}).request || {}).place_id && loc.status !== 'Published');
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

      alert('actual patch is commented out')
      //  await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();
    }
    return lostList;
  }

  /**This will pull restaurant, current accounts, current gmbBiz list to determin what's missing and create stubs */
  async generateMissingGmbBizListings() {

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: { cid: 1 },
      limit: 6000
    }).toPromise();

    const existingCidSet = new Set(gmbBizList.map(biz => biz.cid));
    console.log('existingCidSet', existingCidSet);

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.cid": 1
      },
      limit: 6000
    }).toPromise();

    const restaurantCidNamePairs = restaurants.filter(r => r.googleListing && r.googleListing.cid).map(r => ({ name: r.name, cid: r.googleListing.cid }));
    console.log('restaurantCidNamePairs', restaurantCidNamePairs);

    const accounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        "locations.cid": 1,
        "locations.name": 1
      },
      limit: 6000
    }).toPromise();

    const accountCidNamePairs = accounts.reduce((cids, account) => (cids.push(...(account.locations || []).filter(loc => loc.cid).map(loc => ({ name: loc.name, cid: loc.cid }))), cids), []);
    console.log('accountCidNamePairs', accountCidNamePairs);

    const allPairs = [...restaurantCidNamePairs, ...accountCidNamePairs];
    console.log('allPairs', allPairs);

    const unfoundPairs = allPairs.filter(pair => !existingCidSet.has(pair.cid));
    console.log('unfoundPairs', unfoundPairs);

    // remove dup
    const uniquePairs = [...new Set(unfoundPairs.map(p => p.cid))].map(cid => unfoundPairs.filter(p => p.cid === cid)[0]);

    console.log('unique pairs', uniquePairs);

  }
}
