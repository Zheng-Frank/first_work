import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { TaskService } from './task.service';
import { GlobalService } from './global.service';
import { AlertType } from '../classes/alert-type';
import { GmbBiz } from '../classes/gmb/gmb-biz';
import { Task } from '../classes/tasks/task';
import { Helper } from '../classes/helper';
@Injectable({
  providedIn: 'root'
})
export class Gmb3Service {

  constructor(private _api: ApiService, private _task: TaskService, private _global: GlobalService) {
  }

  async scanAccountsForLocations(emails: string[], stayAfterScan) {
    // parallely requesting but we don't want to stop even some are failed.
    const promises = emails.map(email => new Promise((resolve, reject) => {
      this.scanOneAccountForLocations(email, stayAfterScan).then(resolve).catch(resolve);
    }));

    return await Promise.all(promises);
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
    console.log('scannedLocations', scannedLocations);
    const scannedTime = new Date();

    // match locations back! using appealId???
    const newLocations = scannedLocations.filter(loc => !(account.locations || []).some(loc2 => loc2.appealId === loc.appealId));
    const oldLocations = (account.locations || []).filter(loc1 => scannedLocations.some(loc2 => loc2.appealId === loc1.appealId));
    const removedLocations = (account.locations || []).filter(loc1 => !scannedLocations.some(loc2 => loc2.appealId === loc1.appealId));

    // push all new locations (add a statusHistory!)
    newLocations.map(loc => {
      loc.statusHistory = [{
        time: scannedTime,
        status: loc.status
      }];
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
    });
    // push a 'removed' status to those removed
    removedLocations.map(loc => {
      // only record those that's not already marked as removed
      if (loc.status !== 'Removed') {
        loc.status = 'Removed';
        loc.statusHistory.unshift({
          time: scannedTime,
          status: loc.status
        });
      }
    });


    const updatedLocations = [...newLocations, ...oldLocations, ...removedLocations];
    updatedLocations.sort((loc1, loc2) => loc1.name > loc2.name ? 1 : 0);
    // purge duplicated status (it happened for legacy reason)

    updatedLocations.map(loc => {
      loc.statusHistory = loc.statusHistory.filter((h, index) => h.status !== (loc.statusHistory[index + 1] || {}).status);
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
        locations: { $exists: 1 }
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
        throw 'NOT MATCHED ANYTHING'
      }
      item.gmbBizId = matchedBiz._id;
      item.cid = matchedBiz.cid;
      item.gmbAccountId = account._id;
      item.gmbAccountEmail = account.email;

    });

    const nonMatchedItems = newItems.filter(i => !i.gmbBizId);
    const matchedItems = newItems.filter(i => i.gmbBizId);

    console.log('new', newItems);
    console.log('matched', matchedItems);
    console.log('nonmatched', nonMatchedItems);

    if (matchedItems.length > 0) {
      this._global.publishAlert(AlertType.Success, 'Found new' + matchedItems.length);
      await this._api.post(environment.adminApiUrl + 'generic?resource=gmbRequest', matchedItems).toPromise();
    }

    if (nonMatchedItems.length > 0) {
      this._global.publishAlert(AlertType.Danger, 'Not matched requests: ' + nonMatchedItems.length);
      console.log(nonMatchedItems);
    }
    await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount', [
      {
        old: { _id: account._id },
        new: { _id: account._id, emailScannedAt: { $date: new Date() } }
      }
    ]).toPromise();
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

      await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();
    }
    return lostList;
  }

  /**This will pull restaurant (non-disabled), current accounts, current gmbBiz list to determin what's missing and create stubs */
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
      query: {
        disabled: { $in: [null, false] }
      },
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

    // create gmbBiz

    await this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', uniquePairs).toPromise();

  }

  async crawlBatchedGmbBizList(gmbBizList: GmbBiz[]) {

    if (gmbBizList.some(biz => !biz.cid)) {
      throw 'No cid found for biz ' + gmbBizList.filter(biz => !biz.cid)[0]._id;
    }

    // parallelly requesting
    const allRequests = gmbBizList.map(gmbBiz => this._api.get(environment.adminApiUrl + "utils/scan-gmb", { ludocid: gmbBiz.cid, q: 'K' }).toPromise());

    const crawledResults = await Helper.processBatchedPromises(allRequests);

    const patchPairs = crawledResults.map((result, index) => {

      const crawledResult = result.result || {};
      const gmbBiz = gmbBizList[index];
      // except cid because we'd like to have scan account's cid instead?
      const kvps = ['phone', 'place_id', 'gmbOwner', 'gmbOpen', 'gmbWebsite', 'menuUrls', 'closed', 'reservations', 'serviceProviders'].map(key => ({ key: key, value: crawledResult[key] }));

      // if gmbWebsite belongs to qmenu, we assign it to qmenuWebsite, only if there is no existing qmenuWebsite!
      if (crawledResult['gmbOwner'] === 'qmenu' && !gmbBiz.qmenuWebsite) {
        kvps.push({ key: 'qmenuWebsite', value: crawledResult['gmbWebsite'] });
      }

      if (crawledResult.cid && crawledResult.cid !== gmbBiz.cid) {
        kvps.push({ key: 'cidmismatch', value: true });
      }

      // let's just override!
      const oldBiz = { _id: gmbBiz._id };
      const newBiz = { _id: gmbBiz._id };

      kvps.map(kvp => newBiz[kvp.key] = kvp.value);
      // also update crawledAt
      newBiz['crawledAt'] = { $date: new Date() };

      return { pair: { old: oldBiz, new: newBiz }, kvps: kvps };
    });

    await this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz", patchPairs.map(p => p.pair)).toPromise();

    gmbBizList.map((gmbBiz, index) => {
      // update original
      patchPairs[index].kvps.map(kvp => gmbBiz[kvp.key] = kvp.value);
      gmbBiz.crawledAt = new Date();
    });
    return crawledResults;
  }

  async crawlBatchedRestaurants(restaurants) {

    // parallelly requesting
    const allRequests = restaurants.map(r => this._api.get(environment.adminApiUrl + "utils/scan-gmb", { q: r.name + " " + r.googleAddress.formatted_address }).toPromise());
    const results = await Helper.processBatchedPromises(allRequests);

    const goodResults = results.map((r, i) => ({ restaurant: restaurants[i], result: r.result, success: r.success })).filter(r => r.success);
    goodResults.map(r => r.result.crawledAt = new Date());

    const patchPairs = goodResults.map((r, index) => ({
      old: { _id: r.restaurant._id },
      new: { _id: r.restaurant._id, googleListing: r.result }
    }));

    await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", patchPairs).toPromise();

    restaurants.map((r, index) => {
      // update original
      r.googleListing = results[index].result;
    });
    return results;
  }


  /** gmbBiz --> restaurants, restaurants --> gmbBiz */
  async shareScanResultsForSameCids() {
    // later. Maybe we should consider listings of restaurant instead!!!
  }

  /** Appeal an Appeal GMB Task, using random names */
  async appeal(tasks: Task[]) {

    const randomNames = `Rosena Massaro
  Jeanmarie Eynon
  Burma Busby
  Charlyn Wall
  Daniel Carrillo
  Shanon Chalker
  Alberta Gorski
  Steffanie Mccullen
  Chanelle Stukes
  Harlan Horman
  Aura Fleming
  Edyth Applebee
  Francisco Halloway
  Maryjo Isakson
  Eveline Lager
  Isabel Middleton
  Edda Rickel
  Margareta Joye
  Nona Fager
  Lynelle Coutee
  Rasheeda Gillmore
  Kiesha Padula
  Maryalice Matheny
  Jacqueline Danos
  Alden Crossman
  Corinna Edge
  Cassandra Trial
  Zulema Freedman
  Brunilda Halberg
  Jewell Pyne
  Jeff Kemmerer
  Rosalee Heard
  Maximina Gangi
  Merrie Kall
  Leilani Zeringue
  Bradly Backes
  Samella Bleich
  Barrie Whetzel
  Shakia Bischof
  Gregoria Neace
  Denice Vowels
  Carlotta Barton
  Andy Saltsman
  Octavia Geis
  Danelle Kornreich
  Danica Stanfield
  Shay Nilsson
  Nan Jaffee
  Laraine Fritzler
  Christopher Pagani`;

    const names = randomNames.split('   ').map(n => n.trim());
    const accounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        password: 1
      },
      limit: 6000
    }).toPromise();
    for (let task of tasks) {
      const randomName = names[new Date().valueOf() % names.length];
      try {
        const gmbAccount = accounts.filter(a => a._id === task.relatedMap.gmbAccountId)[0];
        let password = gmbAccount.password;
        if (password.length > 20) {
          password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: gmbAccount.email, phrase: password }).toPromise();
        }
        console.log(task)
        await this._api.post(
          environment.autoGmbUrl + 'appealSuspended', {
            email: gmbAccount.email,
            password: password,
            params: {
              name: randomName,
              email: gmbAccount.email,
              bizName: task.relatedMap.location.name,
              address: task.relatedMap.location.address,
              website: task.relatedMap.website,
              phone: task.relatedMap.location.phone,
              appealId: task.relatedMap.appealId
            }
          }
        ).toPromise();

        const appealedAt = new Date();
        // postpone 21 days
        const appealedAt21 = new Date();
        appealedAt21.setDate(appealedAt.getDate() + 21);
        await this._api.patch(environment.adminApiUrl + 'generic?resource=task', [
          {
            old: {
              _id: task._id
            },
            new: {
              _id: task._id,
              etc: {
                appealedAt: { $date: appealedAt }
              },
              scheduledAt: { $date: appealedAt21 }
            }
          }
        ]).toPromise();
        //update original
        task.etc.appealedAt = appealedAt;
        task.scheduledAt = appealedAt21;
      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, 'Error appealing ' + task.description);
      }
    }
  }

}
