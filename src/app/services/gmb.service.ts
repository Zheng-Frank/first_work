import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { GmbAccount } from '../classes/gmb/gmb-account';
import { GmbLocation } from '../classes/gmb/gmb-location';
import { GmbBiz } from '../classes/gmb/gmb-biz';
import { GmbRequest } from '../classes/gmb/gmb-request';
import { zip } from 'rxjs';
import { Task } from '../classes/tasks/task';
import { TaskService } from './task.service';
import { mergeMap } from "rxjs/operators";
import { GlobalService } from './global.service';
import { AlertType } from '../classes/alert-type';
import { Helper } from '../classes/helper';

@Injectable({
  providedIn: 'root'
})
export class GmbService {

  constructor(private _api: ApiService, private _task: TaskService, private _global: GlobalService) {
  }

  async scanOneGmbAccountLocations(gmbAccount: GmbAccount) {
    let password = gmbAccount.password;
    if (password.length > 20) {
      password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: gmbAccount.email, phrase: password }).toPromise();
    }

    // scan locations
    const scanResult = await this._api.post(environment.autoGmbUrl + 'retrieveGmbLocations', { email: gmbAccount.email, password: password }).toPromise();
    const locations = scanResult.locations;

    // 10/28/2018 Treating Pending edits as Published!
    locations.map(loc => {
      if (loc.status === 'Pending edits') {
        loc.status = 'Published';
      }
    });

    console.log(locations)
    // pre-process:
    // order: 'Published' > 'Suspended' > 'Pending verification' > 'Verification required' > 'Duplicate'
    // keep only ONE based on place_id

    const statusOrder = ['Duplicate', 'Verification required', 'Pending verification', 'Suspended', 'Published'];

    const placeIdLocationMap = {};
    const addressLocationMap = {};
    locations.map(loc => {
      if (!placeIdLocationMap[loc.place_id]) {
        placeIdLocationMap[loc.place_id] = loc;
      }
      const order1 = statusOrder.indexOf(placeIdLocationMap[loc.place_id].status);
      const order2 = statusOrder.indexOf(loc.status);
      if (order2 > order1) {
        placeIdLocationMap[loc.place_id] = loc;
      }

      if (!addressLocationMap[loc.address]) {
        addressLocationMap[loc.address] = loc;
      }
      const order3 = statusOrder.indexOf(addressLocationMap[loc.address].status);
      const order4 = statusOrder.indexOf(loc.status);
      if (order4 > order3) {
        addressLocationMap[loc.address] = loc;
      }
    });

    // register locations as gmbBiz
    const place_ids = Object.keys(placeIdLocationMap);

    const addresses = [...new Set(locations.map(loc => loc.address))];

    // let's get all existing bizList: we need to batch it because of GET length limit :(
    let existingGmbBizList = [];
    const batchSize = 30;
    const batchedLocations = Array(Math.ceil(locations.length / batchSize)).fill(0).map((i, index) => locations.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedLocations) {
      const gmbBizList = await this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        query: {
          $or: [{ place_id: { $in: batch.map(loc => loc.place_id) } }, { "gmbOwnerships.email": gmbAccount.email }, { address: { $in: batch.map(loc => loc.address) } }]

        },
        projection: {
          address: 1,
          appealId: 1,
          cid: 1,
          gmbWebsite: 1,
          name: 1,
          place_id: 1,
          gmbOwnerships: 1,
          score: 1
        },
        limit: 5000
      }).toPromise();
      existingGmbBizList.push(...gmbBizList);
    }

    // convert to GmbBiz type
    existingGmbBizList = existingGmbBizList.map(b => new GmbBiz(b));

    // we have LOTS of duplication of gmbBizList, let's purge
    const idBizMap = {};
    const placeIdBizMap = {};
    const addressBizMap = {};
    existingGmbBizList.map(b => {
      idBizMap[b._id] = b;
      placeIdBizMap[b.place_id] = b;
      addressBizMap[b.address] = b;
    });
    // keep only unique ones
    existingGmbBizList = Object.keys(idBizMap).map(key => idBizMap[key]);

    console.log("Existing GMB List: ", existingGmbBizList);

    // query ALL outstanding task: 
    const outstandingTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        $or: [
          {
            "relatedMap.gmbAccountId": gmbAccount._id
          },
          {
            "relatedMap.gmbBizId": { $in: Object.keys(idBizMap).map(id => id) } // no need $oid because here we store id as string
          }],
        result: null
      },
      limit: 5000
    }).toPromise();
    console.log("Outstanding Tasks: ", outstandingTasks);

    //////////////////////////////////////////////////////////////////////////////


    // Situation: location is Non-duplicate here, address's the same, but NOT same place_id => need to update place_id!
    const placeIdUpdatedLocations = locations.filter(loc => loc.status !== 'Duplicate' && !placeIdBizMap[loc.place_id] && addressBizMap[loc.address]);
    placeIdUpdatedLocations.map(loc => placeIdBizMap[loc.place_id] = addressBizMap[loc.address]);

    if (placeIdUpdatedLocations.length > 0) {
      console.log('Need Update place_id: ', placeIdUpdatedLocations);
      const patchedBizPairs = placeIdUpdatedLocations.map(loc => {
        const biz = placeIdBizMap[loc.place_id] || addressBizMap[loc.address];
        return {
          old: {
            _id: biz._id
          },
          new: {
            _id: biz._id,
            place_id: loc.place_id
          }
        };
      });
      await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', patchedBizPairs).toPromise();
      this._global.publishAlert(AlertType.Info, 'Updated place_id: ' + placeIdUpdatedLocations.map(loc => loc.name));
    }


    // Situation: location is Non-duplicate here, address's the same, but NOT same place_id => need to update place_id!
    const appealIdUpdatedBizList = existingGmbBizList.filter(b => {
      if (b.place_id && b.address) {
        const loc = placeIdLocationMap[b.place_id] || addressLocationMap[b.address];
        return loc && loc.appealId && loc.appealId !== b.appealId;
      }
      return false;
    });

    console.log('Appeal ID Updated: ', appealIdUpdatedBizList);
    if (appealIdUpdatedBizList.length > 0) {
      const patchedBizPairs = appealIdUpdatedBizList.map(biz => {
        const loc = placeIdLocationMap[biz.place_id] || addressLocationMap[biz.address];
        return {
          old: {
            _id: biz._id
          },
          new: {
            _id: biz._id,
            appealId: loc.appealId
          }
        };
      });
      await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', patchedBizPairs).toPromise();
      this._global.publishAlert(AlertType.Info, 'Updated apealId: ' + appealIdUpdatedBizList.map(biz => biz.name));
    }

    // find out Status updated, Suspended/Published
    const statusUpdatedBizList = existingGmbBizList.filter(biz => {
      const matchedLocation = placeIdLocationMap[biz.place_id] || addressLocationMap[biz.address];
      if (!matchedLocation) {
        return false;
      }

      const lastOwnership = biz.getLastGmbOwnership();

      // loc is either Published or Suspended, and then lastOwnership is either NOT this account, or having different status
      const owned = matchedLocation.status === 'Published' || matchedLocation.status === 'Suspended';
      const lastOwnershipChanged = !lastOwnership || lastOwnership.email !== gmbAccount.email;
      const sameButLastStatusChanged = matchedLocation && lastOwnership && lastOwnership.email === gmbAccount.email && (lastOwnership.status !== matchedLocation.status);
      return owned && (lastOwnershipChanged || sameButLastStatusChanged);

    });

    if (statusUpdatedBizList.length > 0) {

      console.log('Need Update Status: ', statusUpdatedBizList);
      // we need to close outstanding Apply Task (No Code ones, Possible post card), close Appeal Task if published(already won)
      const toBeClosedTasks = outstandingTasks.filter(t => {
        if (t.relatedMap && statusUpdatedBizList.some(biz => biz._id === t.relatedMap.gmbBizId)) {
          const biz = idBizMap[t.relatedMap.gmbBizId];
          const matchedLocation = placeIdLocationMap[biz.place_id] || addressLocationMap[biz.address];
          const isAppealTaskInvalid = t.name === 'Appeal Suspended GMB' && matchedLocation.status === 'Published';
          const isApplyTaskInvalid = t.name === 'Apply GMB Ownership' && matchedLocation.status === 'Published' && (t.transfer && t.transfer.verificationMethod !== 'Postcard' && !t.transfer.code);
          const isTransferTaskInvalid = t.name === 'Transfer GMB Ownership' && matchedLocation.status !== 'Published' && (t.transfer && t.transfer.verificationMethod !== 'Postcard' && !t.transfer.code);
          return isAppealTaskInvalid || isApplyTaskInvalid || isTransferTaskInvalid;
        }
        return false;
      });

      console.log('To Be Closed Tasks Because of Published/Suspended:');
      console.log(toBeClosedTasks);
      if (toBeClosedTasks.length > 0) {
        const pairs = [];
        pairs.push(...toBeClosedTasks.map(t => ({
          old: {
            _id: t._id
          },
          new: {
            _id: t._id,
            result: 'CLOSED',
            resultAt: { $date: new Date() },
            comments: (t.comments ? t.comments + ' ' : '') + '[closed by system]'
          }
        })));

        await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();
        this._global.publishAlert(AlertType.Info, 'Task closed: ' + toBeClosedTasks.length);

      }

      const updatedPairs = statusUpdatedBizList.map(b => {
        const cloneOfGmbOwnerships = JSON.parse(JSON.stringify(b.gmbOwnerships));
        const matchedLocation = placeIdLocationMap[b.place_id] || addressLocationMap[b.address];
        cloneOfGmbOwnerships.push({
          possessedAt: { $date: new Date() },
          email: gmbAccount.email,
          status: matchedLocation.status
        });
        return ({
          old: {
            _id: b._id,
            gmbOwnerships: b.gmbOwnerships
          },
          new: {
            _id: b._id,
            gmbOwnerships: cloneOfGmbOwnerships
          }
        });
      });

      await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', updatedPairs).toPromise();
      this._global.publishAlert(AlertType.Info, 'Updated Status: ' + statusUpdatedBizList.map(b => b.name));

    }


    // (no place_id match, no address match, NOT duplicate) => new;
    // what about duplicated ?? let's skip because we've previously scanned them in
    const locationsToInsert: GmbLocation[] =
      locations.filter(loc => loc.status !== 'Duplicate' && !existingGmbBizList.some(biz => biz.place_id === loc.place_id || biz.address === loc.address));
    const newBizList = locationsToInsert.map(loc => ({
      address: loc.address,
      appealId: loc.appealId,
      cid: loc.cid,
      gmbWebsite: loc.homepage,
      name: loc.name,
      place_id: loc.place_id,
      origin: gmbAccount.email,
      gmbOwnerships:
        loc.status === 'Published' || loc.status === 'Suspended' ?
          [{
            appealId: loc.appealId,
            possessedAt: { $date: new Date() },
            email: gmbAccount.email,
            status: loc.status
          }]
          :
          []
    }));

    console.log('NEW: ', locationsToInsert);
    // Save new locations to DB
    if (newBizList.length > 0) {
      await this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', newBizList).toPromise();
      this._global.publishAlert(AlertType.Info, 'New Biz Found: ' + newBizList.map(b => b.name));
    }

    // find out LOST list
    // (used to be this account, not in scanned list or became Duplicate/Verification Required etc.) => lost 

    const lostOwnershipBizList = existingGmbBizList.filter(biz => {
      if (biz.gmbOwnerships && biz.gmbOwnerships.length > 0) {
        const lastEmail = biz.gmbOwnerships[biz.gmbOwnerships.length - 1].email;
        if (lastEmail === gmbAccount.email) {
          // not in scanned list or is Duplicate!
          // location id different, but address same: possible changed names, so we need to check name one more time
          const matchedLocation = placeIdLocationMap[biz.place_id] || (addressLocationMap[biz.address] && addressLocationMap[biz.address].name === biz.name);
          if (!matchedLocation || (matchedLocation.status !== 'Published' && matchedLocation.status !== 'Suspended')) {
            return true;
          }
        }
      }
      return false;
    });

    console.log('LOST: ', lostOwnershipBizList);

    if (lostOwnershipBizList.length > 0) {

      // 1. Update the biz (insert unknown ownership time)
      const lostPairs = lostOwnershipBizList.map(b => {
        const cloneOfGmbOwnerships = JSON.parse(JSON.stringify(b.gmbOwnerships));
        cloneOfGmbOwnerships.push({
          possessedAt: { $date: new Date() }
        });
        return ({
          old: {
            _id: b._id,
            gmbOwnerships: b.gmbOwnerships
          },
          new: {
            _id: b._id,
            gmbOwnerships: cloneOfGmbOwnerships
          }
        });

      });

      await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', lostPairs).toPromise();
      this._global.publishAlert(AlertType.Info, 'Lost ownerships: ' + lostOwnershipBizList.map(b => b.name));

      // 2. close appeal or non-postcard, no-code transfer tasks
      const toBeClosedTasks = outstandingTasks.filter(t => {
        if (t.relatedMap && lostOwnershipBizList.some(biz => biz._id === t.relatedMap.gmbBizId)) {
          return t.name === 'Appeal Suspended GMB' || (t.transfer && t.transfer.verificationMethod !== 'Postcard' && !t.transfer.code);
        }
        return false;
      });
      console.log('To Be Closed Tasks: ', toBeClosedTasks);

      // 3. reschedule task with code (doesn't matter type of verificatoin method anymore) to now!
      const toBeScheduledNowTasks = outstandingTasks.filter(t => {
        if (t.relatedMap && lostOwnershipBizList.some(biz => biz._id === t.relatedMap.gmbBizId)) {
          return t.transfer && t.transfer.code;
        }
        return false;
      });
      console.log('To Be Scheduled Now: ', toBeScheduledNowTasks);

      if (toBeClosedTasks.length > 0 || toBeScheduledNowTasks.length > 0) {
        const pairs = [];
        pairs.push(...toBeClosedTasks.map(t => ({
          old: {
            _id: t._id
          },
          new: {
            _id: t._id,
            result: 'CLOSED',
            resultAt: { $date: new Date() },
            comments: (t.comments ? t.comments + ' ' : '') + '[closed by system]'
          }
        })));
        pairs.push(...toBeScheduledNowTasks.map(t => ({
          old: {
            _id: t._id
          },
          new: {
            _id: t._id,
            scheduledAt: { $date: new Date() },
            comments: (t.comments ? t.comments + ' ' : '') + '[rescheduled by system]'
          }
        })));

        await this._api.patch(environment.adminApiUrl + 'generic?resource=task', pairs).toPromise();
        this._global.publishAlert(AlertType.Info, 'Task closed: ' + toBeClosedTasks.length);
        this._global.publishAlert(AlertType.Info, 'Task scheduled to NOW: ' + toBeScheduledNowTasks.length);
      }

    }
    // also update gmbScannedAt and total locations
    await this._api.patch(environment.adminApiUrl + "generic?resource=gmbAccount", [{
      old: { _id: gmbAccount._id },
      new: { _id: gmbAccount._id, gmbScannedAt: { $date: new Date() }, allLocations: scanResult.allLocations, published: scanResult.published, suspended: scanResult.suspended }
    }]).toPromise();

    // update original:
    gmbAccount.gmbScannedAt = new Date();
    gmbAccount.allLocations = scanResult.allLocations;
    gmbAccount.published = scanResult.published;
    gmbAccount.suspended = scanResult.suspended;


    // generate Appeal Suspended GMB task for those suspended
    // 1. NO outstanding appeal task
    //    a. same biz
    // 2. Biz is not published anywhere

    const suspendedLocations = locations.filter(loc => loc.status === 'Suspended');

    const newSuspendedLocations = suspendedLocations.filter(loc => {
      const biz = placeIdBizMap[loc.place_id] || addressBizMap[loc.address];
      const taskExisted = biz && outstandingTasks.some(task => task.name === 'Appeal Suspended GMB' && task.relatedMap['gmbBizId'] === biz._id);

      const lastOwnerEmail = biz && biz.gmbOwnerships && biz.gmbOwnerships[biz.gmbOwnerships.length - 1] && biz.gmbOwnerships[biz.gmbOwnerships.length - 1].email;
      return !taskExisted && (!biz || !lastOwnerEmail || lastOwnerEmail === gmbAccount.email);
    });

    console.log('NEW SUSPENDED: ', newSuspendedLocations);

    // create Appeal Suspended GMB tasks
    if (newSuspendedLocations.length > 0) {
      const newAppealTasks = newSuspendedLocations.map(loc => {
        const biz = placeIdBizMap[loc.place_id] || addressBizMap[loc.address];
        const newTask = {
          name: 'Appeal Suspended GMB',
          relatedMap: {
            gmbBizId: biz._id,
            gmbAccountId: gmbAccount._id,
            appealId: biz.appealId
          },
          scheduledAt: {
            $date: new Date()
          },
          etc: {
            fromEmail: gmbAccount.email
          },
          description: biz.name,
          roles: ['GMB', 'ADMIN'],
          score: biz.score
        };
        return newTask;
      });
      await this._api.post(environment.adminApiUrl + 'generic?resource=task', newAppealTasks);
    }

    return locations;
  }


  async crawlOneGoogleListing(gmbBiz: GmbBiz) {
    // we need to fillup gmbBiz's phone, matching place_id, and websites info
    let crawledResult;
    try {
      crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", { q: [gmbBiz.name, gmbBiz.address].join(" ") }).toPromise();
    }
    catch (error) {
      // use only city state and zip code!
      // "#4, 6201 Whittier Boulevard, Los Angeles, CA 90022" -->  Los Angeles, CA 90022
      const addressTokens = gmbBiz.address.split(", ");
      const q = gmbBiz.name + ' ' + addressTokens[addressTokens.length - 2] + ', ' + addressTokens[addressTokens.length - 1];
      crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", { q: q }).toPromise();
    }


    const name1 = crawledResult['name'].toLowerCase();
    const name2 = gmbBiz.name.toLowerCase();
    const nameEqual = (name1 === name2) || (name1.indexOf(name2) >= 0 || name2.indexOf(name1) >= 0);
    const zipcodeEqual = crawledResult['address'].split(' ').pop() === gmbBiz.address.split(' ').pop();
    const place_idEqual = crawledResult['place_id'] === gmbBiz.place_id;


    if (!place_idEqual && !nameEqual && !zipcodeEqual) {
      throw 'Crawl error: nothing matches, ' + gmbBiz.name;
    }
    // handle bizManagedWebsite --> qmenu-gray
    if (crawledResult.gmbWebsite && gmbBiz.bizManagedWebsite) {
      if (Helper.areDomainsSame(crawledResult.gmbWebsite, gmbBiz.bizManagedWebsite)) {
        crawledResult.gmbOwner = 'qmenu';
      }
    }
    const kvps = ['phone', 'place_id', 'cid', 'gmbOwner', 'gmbOpen', 'gmbWebsite', 'menuUrls'].map(key => ({ key: key, value: crawledResult[key] }));

    // if gmbWebsite belongs to qmenu, we assign it to qmenuWebsite, only if there is no existing qmenuWebsite!
    if (crawledResult['gmbOwner'] === 'qmenu' && !gmbBiz.qmenuWebsite) {
      kvps.push({ key: 'qmenuWebsite', value: crawledResult['gmbWebsite'] });
    }

    // let's just override!
    const oldBiz = { _id: gmbBiz._id };
    const newBiz = { _id: gmbBiz._id };

    kvps.map(kvp => newBiz[kvp.key] = kvp.value);

    // also update crawledAt
    newBiz['crawledAt'] = { $date: new Date() };
    await this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz", [{ old: oldBiz, new: newBiz }]).toPromise();
    // update original
    kvps.map(kvp => gmbBiz[kvp.key] = kvp.value);
    gmbBiz.crawledAt = new Date();

    return crawledResult;

  }

  async scanAccountEmails(gmbAccount: GmbAccount, stayAfterScan?) {
    let password = gmbAccount.password;
    if (password.length > 20) {
      password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: gmbAccount.email, phrase: password }).toPromise();
    }

    const abc = await zip(
      this._api.post(environment.autoGmbUrl + 'retrieveGmbRequests', { email: gmbAccount.email, password: password, stayAfterScan: !!stayAfterScan }),
      // get those gmbBiz with email as owner
      this._api.get(environment.adminApiUrl + "generic", {
        query: {
          "gmbAccountId": gmbAccount._id
        },
        resource: "gmbRequest",
        limit: 5000
      }),
      // get those gmbBiz with email as owner
      this._api.get(environment.adminApiUrl + "generic", {
        query: {
          "gmbOwnerships.email": gmbAccount.email
        },
        projection: {
          name: 1,
          gmbOwnerships: 1,
          ignoreGmbOwnershipRequest: 1,
          score: 1
        },
        resource: "gmbBiz",
        limit: 5000
      })
    ).toPromise();


    // convert to OwnershipRequest type and remove isReminder!
    // ingore: isReminder, or over 15 days (if it's still not handled, likely the requester didn't care)
    const now = new Date();

    // already sort normally (original is DESC)
    const requests: GmbRequest[] = abc[0].map(r => new GmbRequest(r)).reverse();
    // to compare and delete useless (duplicated ones), we need to work backward
    const before = requests.map(r => r);
    console.log('before', before);
    for (let i = requests.length - 1; i >= 0; i--) {
      const requesterEmail = requests[i].email;
      const requesterBiz = requests[i].business;
      for (let j = i - 1; j >= 0; j--) {
        if (requests[j].email === requesterEmail && requests[j].business === requesterBiz) {
          requests.splice(i, 1);
          break;
        }
      }
    }
    console.log('after', requests);
    // keep ONLY reminders that have no previous same reminder or request (some have direct reminder without any request!)

    // const requests: GmbRequest[] = abc[0].filter(r => !r.isReminder).map(r => new GmbRequest(r)).filter(r => now.valueOf() - r.date.valueOf() < 15 * 24 * 3600 * 1000);


    // existing requests in DB: 
    const gmbRequests: GmbRequest[] = abc[1].map(r => new GmbRequest(r));
    const gmbBizList: GmbBiz[] = abc[2].map(b => new GmbBiz(b)).filter(biz => biz.getAccountEmail() === gmbAccount.email);

    // make the bizMap
    const bizMap = {};
    gmbBizList.map(b => bizMap[b._id] = b);

    // new requests compared to DB (previously scanned and stored, same is defined as "same gmbAccount and same date")
    const newRequests = requests.filter(r => !gmbRequests.some(r2 => r2.business.toLowerCase() === r.business.toLowerCase() && r2.gmbAccountId === gmbAccount._id && r2.date.valueOf() === r.date.valueOf()));

    console.log('new requests compared to DB: ');
    console.log(newRequests);

    const matchedNewRequests = newRequests.filter(r => {
      r.gmbAccountId = gmbAccount._id;
      const bizMatch = gmbBizList.filter(b => b.name.toLowerCase() === r.business.toLowerCase())[0];
      if (bizMatch) {
        r.gmbBizId = bizMatch._id;
        return true;
      } else {
        console.log('not managed anymore: ', r.business);
        return false;
      }
    });

    console.log('requests against managed locations: ');
    console.log(matchedNewRequests);


    // lets convert date but not ids because mongo id doesn't seem to provide benifits for Ids
    (matchedNewRequests as any).map(r => {
      r.date = { $date: r.date };
    });

    await this._api.patch(environment.adminApiUrl + "generic?resource=gmbAccount", [
      {
        old: { _id: gmbAccount._id },
        new: { _id: gmbAccount._id, emailScannedAt: { $date: new Date() } }
      }]).toPromise();

    // also mutate the original
    gmbAccount.emailScannedAt = new Date();

    // we'd like to create task for some requests automatically. we need to see what's already been there first
    const idsAndTasksAndAccounts = await zip(
      this._api.post(environment.adminApiUrl + 'generic?resource=gmbRequest', matchedNewRequests),
      // also find those tasks with requestId
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "task",
        query: {
          "relatedMap.gmbAccountId": gmbAccount._id,
          result: null    // null is the same as either non-exists or actually null in mongodb
        },
        sort: {
          createdAt: -1
        },
        limit: 1000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        query: {
          email: 1
        },
        limit: 1000
      })
    ).toPromise();



    // let's insert the id for parsed requests;
    const ids = idsAndTasksAndAccounts[0];
    ids.map((id, index) => matchedNewRequests[index]._id = id);

    // conditions to create a account transfer  task:
    // 1. requester is not qmenu;
    // 2. and no outstanding similar task pending (not closed)
    // 3. and restaurant is not qmenu partner (ignoreGmbRequest = true)

    const myAccountEmails = idsAndTasksAndAccounts[2].map(a => a.email);
    const nonQmenuRequest = matchedNewRequests.filter(r => myAccountEmails.indexOf(r.email.toLowerCase()) < 0);
    const afterIgnore = nonQmenuRequest.filter(r => bizMap[r.gmbBizId] && !bizMap[r.gmbBizId].ignoreGmbOwnershipRequest);

    const afterIgnoreAsending = afterIgnore.sort((r1, r2) => (r1.date['$date'] || r1.date).valueOf() - (r2.date['$date'] || r2.date).valueOf());
    console.log('afterIgnoreAsending:', afterIgnoreAsending);

    // use gmbBizId && gmbAccount email as key to see if there is any outstanding task!
    const outstandingTaskMap = new Set();
    (idsAndTasksAndAccounts[1] as Task[]).filter(t => !t.result).map(t => {
      if (t.relatedMap && t.relatedMap['gmbBizId'] && t.relatedMap['gmbAccountId']) {
        outstandingTaskMap.add(t.relatedMap['gmbBizId'] + t.relatedMap['gmbAccountId']);
      }
    });

    // we have to consider same task in this batch too, so use a loop instead of map to handle this
    const finalLeftUnhandledRequests: GmbRequest[] = [];

    // asending, so older requests triumphs newer ones
    for (let i = 0; i < afterIgnoreAsending.length; i++) {
      let request = afterIgnoreAsending[i];
      if (!outstandingTaskMap.has(request.gmbBizId + request.gmbAccountId)) {
        finalLeftUnhandledRequests.push(request);
        outstandingTaskMap.add(request.gmbBizId + request.gmbAccountId)
      }
    }

    const tasks = finalLeftUnhandledRequests
      .map(r => ({
        name: 'Transfer GMB Ownership',
        scheduledAt: (date => {
          const d = new Date(date.getTime());
          d.setDate(d.getDate() + (r.isReminder ? 3 : 7));  // direct reminder: 3 days left, otherwise 7 days
          return {
            $date: d
          };
        })(r.date['$date']), // r.date is alreay in {$date: xxx} format 
        description: r.business,
        roles: ['GMB', 'ADMIN'],
        score: bizMap[r.gmbBizId].score,
        relatedMap: { 'gmbBizId': r.gmbBizId, 'gmbAccountId': r.gmbAccountId, 'gmbRequestId': r._id },
        transfer: {
          fromEmail: gmbAccount.email,
          againstEmail: r.email
        }
      }));

    // create new tasks!
    const taskIds = await this._api.post(environment.adminApiUrl + 'generic?resource=task', tasks);

    return gmbRequests;
  }

  async updateGmbWebsite(gmbBiz: GmbBiz, stayAfterScan) {

    let biz = new GmbBiz(gmbBiz);
    // making sure we are going to have appealId and email account for the updated!
    if (!biz.appealId || !biz.getAccountEmail()) {
      biz = new GmbBiz((await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          _id: { $oid: gmbBiz._id }
        },
        limit: 1
      }).toPromise())[0]);
    }

    if (!biz.getAccountEmail()) {
      throw 'No GMB account found';
    }

    if (!biz.qmenuWebsite) {
      throw 'No qMenu website found for ' + biz.name;
    }

    // let's get account
    const account = (await this._api.get(environment.adminApiUrl + 'generic', {
      resource: "gmbAccount",
      query: {
        email: biz.getAccountEmail(),
      },
      projection: {
        email: 1,
        password: 1
      },
      limit: 1
    }).toPromise())[0];
    const password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: account.email, phrase: account.password }).toPromise();
    return await this._api.post(
      environment.autoGmbUrl + 'updateWebsite', {
        email: account.email,
        password: password,
        website: biz.qmenuWebsite,
        bizManagedWebsite: biz.useBizWebsite ? biz.bizManagedWebsite : undefined,
        appealId: biz.appealId,
        stayAfterScan: stayAfterScan
      }
    ).toPromise();
  }



  async injectOneScore(biz: GmbBiz) {

    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
        restaurant: {
          $oid: biz.qmenuId
        }
      },
      projection: {
        createdAt: 1
      },
      sort: { createdAt: -1 },
      limit: 100
    }).toPromise();
    const score = this.getScore(orders);
    // update biz's score
    biz.score = score;
    await this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz", [
      {
        old: {
          _id: biz._id
        },
        new: {
          _id: biz._id,
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

  async suggestQmenu(gmbBiz: GmbBiz) {

    let biz = new GmbBiz(gmbBiz);
    // let's get account
    const account = (await this._api.get(environment.adminApiUrl + 'generic', {
      resource: "gmbAccount",
      query: {
        email: biz.getAccountEmail(),
      },
      projection: {
        email: 1,
        password: 1
      },
      limit: 1
    }).toPromise())[0];

    const password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: account.email, phrase: account.password }).toPromise();
    return await this._api.post(
      environment.autoGmbUrl + 'suggestEdit', {
        email: account.email,
        password: password,
        gmbBiz: gmbBiz
      }
    ).toPromise();
  }



  async appeal(gmbAccount, gmbBiz, task) {

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

    const randomName = names[new Date().valueOf() % names.length];

    try {
      let password = gmbAccount.password;
      if (password.length > 20) {
        password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: gmbAccount.email, phrase: password }).toPromise();
      }
      await this._api.post(
        environment.autoGmbUrl + 'appealSuspended', {
          email: gmbAccount.email,
          password: password,
          params: {
            name: randomName,
            email: gmbAccount.email,
            bizName: gmbBiz.name,
            address: gmbBiz.address,
            website: gmbBiz.useBizWebsite && gmbBiz.bizManagedWebsite ? gmbBiz.bizManagedWebsite : gmbBiz.qmenuWebsite,
            phone: gmbBiz.phone,
            appealId: gmbBiz.appealId
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

      return Promise.resolve();
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error appealing');
      return Promise.reject(error);
    }
  }


}
