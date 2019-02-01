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
