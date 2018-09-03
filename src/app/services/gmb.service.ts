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

@Injectable({
  providedIn: 'root'
})
export class GmbService {

  constructor(private _api: ApiService, private _task: TaskService) {
  }

  async scanOneGmbAccountLocations(gmbAccount: GmbAccount) {
    // scan locations
    const locations = await this._api.post('http://localhost:3000/retrieveGmbLocations', { email: gmbAccount.email, password: gmbAccount.password }).toPromise();

    // pre-process:
    // order: 'Published' > 'Suspended' > 'Pending verification' > 'Verification required' > 'Duplicate'
    const statusOrder = ['Duplicate', 'Verification required', 'Pending verification', 'Suspended', 'Published'];

    for (let status of statusOrder) {
      for (let i = locations.length - 1; i >= 0; i--) {
        for (let j = 0; j < i; j++) {
          // since we iterate from lower priority, we can sure that the current one can be safely removed if there is another one in the list
          if (locations[i].place_id === locations[j].place_id) {
            locations.splice(i, 1);
            break;
          }
        }
      }
    }

    // register locations as gmbBiz
    const place_ids = locations.map(loc => loc.place_id);

    const existingGmbBizList = await
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        query: {
          place_id: { $in: place_ids }
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

    // we have either inserted (no place_id found!) new or updated!
    const locationsToInsert: GmbLocation[] = locations.filter(loc => !existingGmbBizList.some(biz => biz.place_id === loc.place_id));
    const newBizList = locationsToInsert.map(loc => ({
      address: loc.address,
      appealId: loc.appealId,
      cid: loc.cid,
      gmbWebsite: loc.homepage,
      name: loc.name,
      place_id: loc.place_id,
      gmbOwnerships:
        loc.status === 'Published' ?
          [{
            appealId: loc.appealId,
            possessedAt: { $date: new Date() },
            email: gmbAccount.email
          }]
          :
          []
    }));

    if (locationsToInsert.length > 0) {
      const newBizListIds = await this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', newBizList).toPromise();
      // inject ids
      newBizListIds.map((id, index) => newBizList[index]['_id'] = id);
    }

    const locationsToUpdate = locations.filter(loc => existingGmbBizList.some(biz => biz.place_id === loc.place_id));

    const pairs = locationsToUpdate.map(loc => ({
      updated: false,
      location: loc,
      oldGmbBiz: existingGmbBizList.filter(biz => biz.place_id === loc.place_id)[0],
      newGmbBiz: JSON.parse(JSON.stringify(existingGmbBizList.filter(biz => biz.place_id === loc.place_id)[0]))
    }));

    // let's start compare
    pairs.map(pair => {
      ['address', 'appealId', 'cid', 'name', 'place_id'].map(field => {
        if (pair.location[field] !== pair.newGmbBiz[field]) {
          pair.newGmbBiz[field] = pair.location[field];
          pair.updated = true;
        }
      });
      // homepage -> gmbWebsite
      if (pair.location['homepage'] !== pair.newGmbBiz['gmbWebsite']) {
        pair.newGmbBiz['gmbWebsite'] = pair.location['homepage'];
        pair.updated = true;

      }

      const lastOwnerEmail = new GmbBiz(pair.newGmbBiz).getAccountEmail();
      // we used to have this account but now don't know
      // this doesn't mean we lost it because it might be transferred to other account
      if (lastOwnerEmail === gmbAccount.email && pair.location.status !== 'Published') {
        // push an unknown ownership in. No need to check existence of gmbOwnerships
        pair.newGmbBiz.gmbOwnerships.push({
          possessedAt: { $date: new Date() }
        });
        pair.updated = true;
      }
      // if lastOwnerEmail is not this account or unknown, we don't need to do anything
      // but if this is the new owner, let's put it in!
      if (lastOwnerEmail !== gmbAccount.email && pair.location.status === 'Published') {
        // push an unknown ownership in
        pair.newGmbBiz.gmbOwnerships = pair.newGmbBiz.gmbOwnerships || [];
        pair.newGmbBiz.gmbOwnerships.push({
          email: gmbAccount.email,
          possessedAt: { $date: new Date() }
        });
        pair.updated = true;
      }
    });

    // handle ONLY those updated gmbBiz
    const updatedPairs = pairs.filter(p => p.updated);
    // await updating!
    await this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz", updatedPairs.map(p => ({
      old: p.oldGmbBiz,
      new: p.newGmbBiz
    }))).toPromise();

    // also update gmbScannedAt
    await this._api.patch(environment.adminApiUrl + "generic?resource=gmbAccount", [{
      old: { _id: gmbAccount._id },
      new: { _id: gmbAccount._id, gmbScannedAt: { $date: new Date() } }
    }]).toPromise();

    // update original:
    gmbAccount.gmbScannedAt = new Date();

    // generate Appeal Suspended GMB task for those suspended
    const suspendedLocations = locations.filter(loc => loc.status === 'Suspended');
    console.log('Suspended', suspendedLocations);
    for (let suspendedLoc of suspendedLocations) {
      try {
        const gmbBiz = existingGmbBizList.concat(newBizList).filter(biz => biz.place_id === suspendedLoc.place_id)[0];
        await this._task.upsertSuspendedTask(gmbBiz, gmbAccount);
      }
      catch (error) {
        console.log('Error creating suspended task ' + suspendedLoc);
      }
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


    console.log(gmbBiz);
    console.log(crawledResult);

    const name1 = crawledResult['name'].toLowerCase();
    const name2 = gmbBiz.name.toLowerCase();
    const nameEqual = (name1 === name2) || (name1.indexOf(name2) >= 0 || name2.indexOf(name1) >= 0);
    const zipcodeEqual = crawledResult['address'].split(' ').pop() === gmbBiz.address.split(' ').pop();
    const place_idEqual = crawledResult['place_id'] === gmbBiz.place_id;

    console.log(nameEqual);
    console.log(zipcodeEqual);
    console.log(place_idEqual)
    if (!place_idEqual && !nameEqual && !zipcodeEqual) {
      throw 'Crawl error: nothing matches, ' + gmbBiz.name;
    }

    const kvps = ['phone', 'place_id', 'cid', 'gmbOwner', 'gmbOpen', 'gmbWebsite', 'menuUrls'].map(key => ({ key: key, value: crawledResult[key] }));

    // if gmbWebsite belongs to qmenu, we assign it to qmenuWebsite
    if (crawledResult['gmbOwner'] === 'qmenu') {
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

  async scanAccountEmails(gmbAccount: GmbAccount) {
    const abc = await zip(
      this._api.post('http://localhost:3000/retrieveGmbRequests', { email: gmbAccount.email, password: gmbAccount.password, stayAfterScan: true }),
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

    const requests: GmbRequest[] = abc[0].filter(r => !r.isReminder).map(r => new GmbRequest(r)).filter(r => now.valueOf() - r.date.valueOf() < 15 * 24 * 3600 * 1000);
    // remove isReminder
    requests.map(r => delete r["isReminder"]);

    const gmbRequests: GmbRequest[] = abc[1].map(r => new GmbRequest(r));
    const gmbBizList: GmbBiz[] = abc[2].map(b => new GmbBiz(b)).filter(biz => biz.hasOwnership([gmbAccount.email]));

    // make the bizMap
    const bizMap = {};
    gmbBizList.map(b => bizMap[b._id] = b);

    // new requests: same gmbAccount and same date and 
    const newRequests = requests.filter(r => !gmbRequests.some(r2 => r2.business.toLowerCase() === r.business.toLowerCase() && r2.gmbAccountId === gmbAccount._id && r2.date.valueOf() === r.date.valueOf()));

    console.log('new requests: ');
    console.log(newRequests);

    const matchedNewRequests = newRequests.filter(r => {
      r.gmbAccountId = gmbAccount._id;
      const bizMatch = gmbBizList.filter(b => b.name.toLowerCase() === r.business.toLowerCase())[0];
      if (bizMatch) {
        r.gmbBizId = bizMatch._id;
        return true;
      } else {
        console.log('non matched: ', r.business);
        return false;
      }
    });

    console.log('matched: ');
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

    const afterIgnoreDesc = afterIgnore.sort((r1, r2) => (r1.date['$date'] || r1.date).valueOf() - (r2.date['$date'] || r2.date).valueOf());

    // use gmbBizId && gmbAccount email as key to see if there is any outstanding task!
    const outstandingTaskMap = new Set();
    (idsAndTasksAndAccounts[1] as Task[]).filter(t => !t.result).map(t => {
      if (t.relatedMap && t.relatedMap['gmbBizId'] && t.relatedMap['gmbAccountId']) {
        outstandingTaskMap.add(t.relatedMap['gmbBizId'] + t.relatedMap['gmbAccountId']);
      }
    });

    // we have to consider same task in this batch too, so use a loop instead of map to handle this
    const finalLeftUnhandledRequests: GmbRequest[] = [];

    for (let i = 0; i < afterIgnoreDesc.length; i++) {
      let request = afterIgnoreDesc[i];
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
          d.setDate(d.getDate() + 7);
          return {
            $date: d
          };
        })(r.date['$date']), // r.date is alreay in {$date: xxx} format 
        description: r.business,
        roles: ['GMB', 'ADMIN'],
        score: bizMap[r.gmbBizId].score,
        relatedMap: { 'gmbBizId': r.gmbBizId, 'gmbAccountId': r.gmbAccountId, 'gmbRequestId': r._id },
        transfer: {
          fromEmail: gmbAccount.email
        }
      }));

    // create new tasks!
    const taskIds = await this._api.post(environment.adminApiUrl + 'generic?resource=task', tasks);

    return gmbRequests;
  }

  async updateGmbWebsite(gmbBiz: GmbBiz) {

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

    return await this._api.post(
      'http://localhost:3000/updateWebsite', {
        email: account.email,
        password: account.password,
        website: biz.qmenuWebsite,
        appealId: biz.appealId
      }
    ).toPromise();
  }

}
