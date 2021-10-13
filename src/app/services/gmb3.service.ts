import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { TaskService } from './task.service';
import { GlobalService } from './global.service';
import { AlertType } from '../classes/alert-type';
import { GmbBiz } from '../classes/gmb/gmb-biz';
import { Restaurant } from '@qmenu/ui';
@Injectable({
  providedIn: 'root'
})
export class Gmb3Service {

  constructor(private _api: ApiService, private _task: TaskService, private _global: GlobalService) {
  }

  async computeGmbRequestTasksThatJustLost() {
    // transfer tasks that are NOT in original accounts anymore!
    const runningGmbRequestTasksWithPins = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'GMB Request',
        result: null,
        'request.pinHistory.pin': { $exists: true }
      },
      projection: {
        "request.email": 1,
        "relatedMap.cid": 1,
        "relatedMap.place_id": 1,
        "comments": 1
      },
      limit: 100000
    }).toPromise();

    console.log('runningGmbRequestTasksWithPins', runningGmbRequestTasksWithPins);

    const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        "locations.cid": 1,
        "locations.place_id": 1,
        "locations.status": 1
      },
      limit: 100000
    }).toPromise();

    const publishedCids = new Set();
    const publishedPlaceIds = new Set();
    gmbAccounts.map(acct => (acct.locations || []).map(loc => {
      if (loc.status === 'Published') {
        publishedCids.add(loc.cid);
        publishedPlaceIds.add(loc.place_id);
      }
    }));

    const lostList = runningGmbRequestTasksWithPins.filter(task => {
      const cid = task.relatedMap.cid;
      const palce_id = task.relatedMap.place_id;
      return !publishedCids.has(cid) && !publishedPlaceIds.has(palce_id);

    });

    console.log('lost list: ', lostList);
    const rtIds = lostList.map(t => t.relatedMap.restaurantId);
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $in: rtIds.map(rtId => ({ $oid: rtId })) }
      },
      projection: {
        googleListing: 1,
      },
      limit: rtIds.length
    }).toPromise();
    // we also would like to test current GMB of restaurant's google listing to make sure
    const trulyLostList = lostList.filter(t => !restaurants.some(rt => rt._id === t.relatedMap.restaurantId && rt.googleListing && rt.googleListing.gmbOwner === 'qmenu'));
    console.log('truly lost list: ', trulyLostList);
    // now reschedule those by systems!
    if (trulyLostList.length > 0) {
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

    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        "locations.place_id": 1,
        "locations.status": 1
      },
    }, 6000)

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

    const gmbBizBatchSize = 3000;
    const gmbBizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: { cid: 1 },
        skip: gmbBizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      gmbBizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }

    const existingCidSet = new Set(gmbBizList.map(biz => biz.cid));
    console.log('existingCidSet', existingCidSet);

    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: { $in: [null, false] }
      },
      projection: {
        name: 1,
        "googleListing.cid": 1
      }
    }, 6000)

    const restaurantCidNamePairs = restaurants.filter(r => r.googleListing && r.googleListing.cid).map(r => ({ name: r.name, cid: r.googleListing.cid }));
    console.log('restaurantCidNamePairs', restaurantCidNamePairs);

    const accounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        "locations.cid": 1,
        "locations.name": 1
      },
    }, 6000)

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

    const fields = ['phone', 'place_id', 'gmbOwner', 'gmbWebsite', 'menuUrls', 'closed', 'reservations', 'serviceProviders'];

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

      const old = { _id: gmbBiz._id };
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
      const gmbBizBatchSize = 3000;
      let gmbBizWithSameCids = [];
      while (true) {
        const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'gmbBiz',
          projection: {
            cid: 1
          },
          skip: gmbBizWithSameCids.length,
          limit: gmbBizBatchSize
        }).toPromise();
        gmbBizWithSameCids.push(...batch);
        if (batch.length === 0 || batch.length < gmbBizBatchSize) {
          break;
        }
      }




      const cidSet = new Set(resultsWithCids.map(result => result.cid));

      gmbBizWithSameCids = gmbBizWithSameCids.filter(biz => cidSet.has(biz.cid));

      if (gmbBizWithSameCids.length > 0) {

        const fields = ['phone', 'place_id', 'gmbOwner', 'gmbWebsite', 'menuUrls', 'closed', 'reservations', 'serviceProviders'];

        const bizPatchPairs = gmbBizWithSameCids.map(gmbBiz => {

          const crawledResult = resultsWithCids.filter(r => r.cid === gmbBiz.cid)[0];
          // except cid because we'd like to have scan account's cid instead?
          // let's just override!
          const oldBiz = { _id: gmbBiz._id };
          const newBiz = { _id: gmbBiz._id };

          fields.map(f => { newBiz[f] = crawledResult[f]; oldBiz[f] = "random"; });
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

  async checkGmbOwnership(restaurantId: string) {
    try {
      return await this._api.post(environment.appApiUrl + "gmb/generic", {
        name: "check-gmb-api-ownership",
        payload: {
          "restaurantId": restaurantId
        }
      }).toPromise();
    } catch (error) {
      console.error(`Error. Couldn't retrieve GMB ownership`, error);
      return false;
    }
  }

}
