import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { TaskService } from './task.service';
import { GlobalService } from './global.service';
import { AlertType } from '../classes/alert-type';
import { GmbBiz } from '../classes/gmb/gmb-biz';
import { Task } from '../classes/tasks/task';
import { Restaurant } from '@qmenu/ui';
@Injectable({
  providedIn: 'root'
})
export class Gmb3Service {

  constructor(private _api: ApiService, private _task: TaskService, private _global: GlobalService) {
  }

  async injectRestaurantScore(restaurant: Restaurant) {

    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
        restaurant: {
          $oid: restaurant._id
        }
      },
      projection: {
        createdAt: 1
      },
      sort: { createdAt: -1 },
      limit: 200
    }).toPromise();
    const score = this.getScore(orders);
    // update restaurant's score
    await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
      {
        old: {
          _id: restaurant._id
        },
        new: {
          _id: restaurant._id,
          score: score
        }
      }
    ]).toPromise();
    return score;
  }

  private getScore(orders) {
    // counting days with orders (having gmbs?) and do an average
    const dateMap = {};
    // "2018-08-10T00:26:03.990Z" ==> "Thu Aug 09 2018"
    orders.map(order => {
      const key = new Date(order.createdAt).toDateString();
      dateMap[key] = dateMap[key] ? dateMap[key] + 1 : 1;
    });
    return Math.floor(orders.length / (Object.keys(dateMap).length || 1));
  }

  async scanAccountsForLocations(emails: string[], stayAfterScan) {
    // parallely requesting but we don't want to stop even some are failed.
    const promises = emails.map(email => new Promise((resolve, reject) => {
      this.scanOneAccountForLocations(email, stayAfterScan).then(resolve).catch(resolve);
    }));

    return await Promise.all(promises);
  }

  async scanOneAccountForLocations(email, stayAfterScan) {
    const account = (await this._api.get(environment.qmenuApiUrl + 'generic', {
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
    // const appealIdsNotToSkipDetails = (account.locations || []).filter(loc => !(loc.appealId && loc.cid)).map(loc => loc.appealId);
    // console.log('email',email);
    // console.log('appealIdsToSkipDetails', appealIdsToSkipDetails);
    // console.log('appealIdsNotToSkipDetails', appealIdsNotToSkipDetails);
    //throw "stop";
    let password = account.password;
    if (password.length > 20) {
      password = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', { salt: account.email, phrase: password }).toPromise();
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

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbAccount', [
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
    const account = (await this._api.get(environment.qmenuApiUrl + 'generic', {
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

    const existingRequests = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
      password = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', { salt: account.email, phrase: password }).toPromise();
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
    let newItems = scanResultWithin15Days.filter(item => !existingRequests.some(r => r.business === item.business && r.email === item.email && new Date(r.date).valueOf() === new Date(item.date).valueOf()));
    console.log('new items: ', newItems);
    // match gmbBizId: (by name under account??? what if duplicate?)
    // if we didn't find a match, skip it. This may due to outdated account scan (gmbBiz doesn't register yet)

    // get existing gmbBizList to match for
    const gmbBizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        cid: 1
      },
      limit: 6000
    }).toPromise();

    newItems.map(item => {
      // biz match strategy: same name, same account email, and first encounter of status before this item's date is Published!

      const matchedLocationAndScore = account.locations.map(loc => {
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
      const matchedCid = matchedLocationAndScore ? matchedLocationAndScore.location.cid : 'nonexist';
      const matchedBiz = gmbBizList.filter(biz => biz.cid === matchedCid)[0];
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
      await this._api.post(environment.qmenuApiUrl + 'generic?resource=gmbRequest', matchedItems).toPromise();
    }

    if (nonMatchedItems.length > 0) {
      this._global.publishAlert(AlertType.Danger, 'Not matched requests: ' + nonMatchedItems.length);
      console.log(nonMatchedItems);
    }
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbAccount', [
      {
        old: { _id: account._id },
        new: { _id: account._id, emailScannedAt: { $date: new Date() } }
      }
    ]).toPromise();
    console.log('updated emailScannedAt for ' + account.email);
    return newItems;

  }

  async loginEmailAccount(email, stayAfterScan) {
    const account = (await this._api.get(environment.qmenuApiUrl + 'generic', {
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


    let password = account.password;

    if (password.length > 20) {
      password = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', { salt: account.email, phrase: password }).toPromise();
    }
    await this._api.post(environment.autoGmbUrl + 'login', { email: account.email, password: password, stayAfterScan: stayAfterScan }).toPromise();

  }
  async computePostcardTasksThatJustLost() {
    // transfer tasks that are NOT in original accounts anymore!
    const runningTransferTasksWithCode = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Transfer GMB Ownership',
        result: null,
        'transfer.code': { $exists: true }
      },
      limit: 1000
    }).toPromise();

    console.log('runningTransferTasksWithCode', runningTransferTasksWithCode);

    const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        "locations.place_id": 1,
        "locations.status": 1
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

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', pairs).toPromise();
    }
    return lostList;
  }

  /**This will pull restaurant (non-disabled), current accounts, current gmbBiz list to determin what's missing and create stubs */
  async generateMissingGmbBizListings() {

    const gmbBizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
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

    const accounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
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

    await this._api.post(environment.qmenuApiUrl + 'generic?resource=gmbBiz', uniquePairs).toPromise();

  }

  async crawlBatchedGmbBizList(gmbBizList: GmbBiz[]) {

    if (gmbBizList.some(biz => !biz.cid)) {
      throw 'No cid found for biz ' + gmbBizList.filter(biz => !biz.cid)[0]._id;
    }

    // parallelly requesting
    const allRequests = gmbBizList.map(biz => this.crawlOneGmbWithoutUpdating(biz));
    const results: any = await Promise.all(allRequests);

    // we still want to update crawledAt, regardless of good or bad crawl result. If cid mismatch, we skip update (otherwise our owned gmb will try to update misinformation)

    const fields = ['phone', 'place_id', 'gmbOwner', 'gmbOpen', 'gmbWebsite', 'menuUrls', 'closed', 'reservations', 'serviceProviders'];

    const patchPairs = results.map((result, index) => {

      const gmbBiz = gmbBizList[index];
      const newItem: any = {
        _id: gmbBiz._id,
        crawledAt: { $date: new Date() }
      };

      if (result) {
        // except cid because we'd like to have scan account's cid instead?
        if (result.cid && result.cid === gmbBiz.cid) {
          fields.map(f => newItem[f] = result[f]);
        } else {
          this._global.publishAlert(AlertType.Danger, 'mismatched gmbBiz');
          console.log('mismatch: ', gmbBiz);
        }
      }

      const old = {_id: gmbBiz._id};
      fields.map(field => old[field] = "random");
      return {
        old: old,
        new: newItem
      };

    });

    await this._api.patch(environment.qmenuApiUrl + "generic?resource=gmbBiz", patchPairs).toPromise();

    // save to original
    gmbBizList.map((gmbBiz, index) => {
      // update original
      const result = results[index];
      if (result) {
        fields.map(f => gmbBiz[f] = result[f]);
      }
      gmbBiz.crawledAt = new Date();
    });

    return gmbBizList;
  }


  async crawlBatchedRestaurants(restaurants) {

    // parallelly requesting
    const allRequests = restaurants.map(r => this.crawlOneRestaurantWithoutUpdating(r));
    const results: any = await Promise.all(allRequests);

    // if we didn't get result back, we still want to add crawledAt
    const patchPairs = restaurants.map((r, index) => {
      let result = results[index];
      if (result) {
        result.crawledAt = { $date: new Date() };
        return {
          old: { _id: r._id },
          new: { _id: r._id, googleListing: result }
        }
      } else {
        return {
          old: { _id: r._id, googleListing: {} },
          new: { _id: r._id, googleListing: { crawledAt: { $date: new Date() } } }
        }
      }
    });

    await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", patchPairs).toPromise();
    // we would also like to patch gmbBiz with same cids! (considering scan is more expensive than retrieving out own database)
    const resultsWithCids = results.filter(result => result && result.cid);
    if (resultsWithCids.length > 0) {
      let gmbBizWithSameCids = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          cid: 1
        },
        limit: 10000
      }).toPromise();

      const cidSet = new Set(resultsWithCids.map(result => result.cid));     

      gmbBizWithSameCids = gmbBizWithSameCids.filter(biz => cidSet.has(biz.cid ));

      if (gmbBizWithSameCids.length > 0) {

        const fields = ['phone', 'place_id', 'gmbOwner', 'gmbOpen', 'gmbWebsite', 'menuUrls', 'closed', 'reservations', 'serviceProviders'];

        const bizPatchPairs = gmbBizWithSameCids.map(gmbBiz => {

          const crawledResult = resultsWithCids.filter(r => r.cid === gmbBiz.cid)[0];
          // except cid because we'd like to have scan account's cid instead?
          // let's just override!
          const oldBiz = { _id: gmbBiz._id };
          const newBiz = { _id: gmbBiz._id };

          fields.map(f => newBiz[f] = crawledResult[f]);
          // also update crawledAt
          newBiz['crawledAt'] = { $date: new Date() };

          return { old: oldBiz, new: newBiz };
        });
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=gmbBiz", bizPatchPairs).toPromise();
        console.log('update gmbBiz: ', gmbBizWithSameCids.length);
      }
    }

    restaurants.map((r, index) => {
      // update original
      r.googleListing = r.googleListing || results[index];
    });
    return results;
  }


  async crawlOneRestaurantWithoutUpdating(restaurant) {

    // parallelly requesting
    try {
      const result = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { q: restaurant.name + " " + restaurant.googleAddress.formatted_address }).toPromise();
      return result;
    } catch (error) {
      try {
        // 4016 W Washington Blvd, Los Angeles, CA 90018, USA --> CA 90018 USA
        const result = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { q: restaurant.name + " " + restaurant.googleAddress.formatted_address.split(', ').slice(-2).join(' ') }).toPromise();
        return result;
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }

  async crawlOneGmbWithoutUpdating(gmbBiz: GmbBiz) {

    // parallelly requesting
    try {
      const result = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { ludocid: gmbBiz.cid, q: gmbBiz.name + " " + gmbBiz.address }).toPromise();
      return result;
    } catch (error) {
      try {
        // 4016 W Washington Blvd, Los Angeles, CA 90018, USA --> CA 90018 USA
        const result = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { ludocid: gmbBiz.cid, q: gmbBiz.name + " " + (gmbBiz.address || '').split(', ').slice(-2).join(' ') }).toPromise();
        return result;
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }

  /** gmbBiz --> restaurants, restaurants --> gmbBiz */
  async shareScanResultsForSameCids() {
    // later. Maybe we should consider listings of restaurant instead!!!
  }

  /** Appeal an Appeal GMB Task, using random names */
  async appeal(tasks: Task[]) {

    const randomNames = "Rosena Massaro,Jeanmarie Eynon,Burma Busby,Charlyn Wall,Daniel Carrillo,Shanon Chalker,Alberta Gorski,Steffanie Mccullen,Chanelle Stukes,Harlan Horman,Aura Fleming,Edyth Applebee,Francisco Halloway,Maryjo Isakson,Eveline Lager,Isabel Middleton,Edda Rickel,Margareta Joye,Nona Fager,Lynelle Coutee,Rasheeda Gillmore,Kiesha Padula,Maryalice Matheny,Jacqueline Danos,Alden Crossman,Corinna Edge,Cassandra Trial,Zulema Freedman,Brunilda Halberg,Jewell Pyne,Jeff Kemmerer,Rosalee Heard,Maximina Gangi,Merrie Kall,Leilani Zeringue,Bradly Backes,Samella Bleich,Barrie Whetzel,Shakia Bischof,Gregoria Neace,Denice Vowels,Carlotta Barton,Andy Saltsman,Octavia Geis,Danelle Kornreich,Danica Stanfield,Shay Nilsson,Nan Jaffee,Laraine Fritzler,Christopher Pagani";

    const names = randomNames.split(',').map(n => n.trim());
    const accounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        password: 1
      },
      limit: 6000
    }).toPromise();
    for (let task of tasks) {
      const randomName = names[Math.floor(Math.random()*names.length)];
      try {
        const gmbAccount = accounts.filter(a => a._id === task.relatedMap.gmbAccountId)[0];
        let password = gmbAccount.password;
        if (password.length > 20) {
          password = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', { salt: gmbAccount.email, phrase: password }).toPromise();
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
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', [
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
