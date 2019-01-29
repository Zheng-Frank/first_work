import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { GmbAccount } from '../classes/gmb/gmb-account';
import { GmbBiz } from '../classes/gmb/gmb-biz';
import { GmbRequest } from '../classes/gmb/gmb-request';
import { zip } from 'rxjs';
import { Task } from '../classes/tasks/task';
import { TaskService } from './task.service';
import { mergeMap } from "rxjs/operators";
import { GlobalService } from './global.service';
import { AlertType } from '../classes/alert-type';
import { Helper } from '../classes/helper';
import { Restaurant } from '@qmenu/ui';

@Injectable({
  providedIn: 'root'
})
export class GmbService {

  constructor(private _api: ApiService, private _task: TaskService, private _global: GlobalService) {
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
    // filter out things more than 15 days since it's constantly running
    let before = requests.filter(r => now.valueOf() - r.date.valueOf() < 15 * 24 * 3600 * 1000);
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
        projection: {
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
    // 3. restaurant not disabled!
    // 4. and restaurant is not qmenu partner (ignoreGmbRequest = true)
    const myAccountEmails = idsAndTasksAndAccounts[2].map(a => a.email);
    const nonQmenuRequest = matchedNewRequests.filter(r => myAccountEmails.indexOf(r.email.toLowerCase()) < 0);
    const disabledRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: true
      },
      projection: {
        name: 1
      },
      limit: 1000
    }).toPromise();
    const onlyRestaurantEnabled = nonQmenuRequest.filter(r => bizMap[r.gmbBizId] && (!bizMap[r.gmbBizId].qmenuId || !disabledRestaurants.some(restaurant => restaurant._id === bizMap[r.gmbBizId].qmenuId)));
    const afterIgnore = onlyRestaurantEnabled.filter(r => bizMap[r.gmbBizId] && !bizMap[r.gmbBizId].ignoreGmbOwnershipRequest);

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
        relatedMap: { cid: r['cid'], 'gmbBizId': r.gmbBizId, 'gmbAccountId': r.gmbAccountId, 'gmbRequestId': r._id },
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
        websiteUrl: (biz.useBizWebsite ? biz.bizManagedWebsite : undefined) || biz.qmenuWebsite,
        menuUrl: (biz.useBizWebsiteForAll ? biz.bizManagedWebsite : undefined) || biz.qmenuWebsite,
        orderAheadUrl: (biz.useBizWebsiteForAll ? biz.bizManagedWebsite : undefined) || biz.qmenuWebsite,
        reservationsUrl: (biz.useBizWebsiteForAll ? biz.bizManagedWebsite : undefined) || biz.qmenuWebsite,
        appealId: biz.appealId,
        stayAfterScan: stayAfterScan
      }
    ).toPromise();
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

}
