import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { GmbService } from 'src/app/services/gmb.service';
import { Task } from 'src/app/classes/tasks/task';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { Helper } from 'src/app/classes/helper';
@Component({
  selector: 'app-restaurant-gmb',
  templateUrl: './restaurant-gmb.component.html',
  styleUrls: ['./restaurant-gmb.component.css']
})
export class RestaurantGmbComponent implements OnInit {

  @Input() restaurant: Restaurant;

  relevantGmbRequests: any[] = [];
  emailAccountDict = {} as any;

  gmbRows;
  apiRequesting = false;
  now = new Date();

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb: GmbService, private _gmb3: Gmb3Service) { }

  ngOnInit() {
  }

  async ngOnChanges(changes: SimpleChanges) {
    this.populate();
  }

  async populate() {

    this.gmbRows = [];
    if (!this.restaurant) {
      return;
    }


    const gmbBizList = (await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {
        qmenuId: this.restaurant.id || this.restaurant['_id']
      },
      projection: {
        gmbOwnerships: 0,
        accounts: 0
      },
      limit: 10
    }).toPromise());

    // query outstanding tasks for the restaurant

    if (gmbBizList.length > 0) {
      const outstandingTasks = (await this._api.get(environment.adminApiUrl + 'generic', {
        resource: "task",
        query: {
          "relatedMap.gmbBizId": { $in: gmbBizList.map(biz => biz._id) },
          result: null
        },
        limit: 20
      }).toPromise()).map(t => new Task(t));

      const accounts = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbAccount',
        // query ALL because we need to tell if it is self!
        // query: {
        //   //email: { $in: [...new Set(relevantEmails)] }
        // },
        projection: {
          email: 1
        },
        limit: 1000
      }).toPromise();

      accounts.map(acct => this.emailAccountDict[acct.email] = acct);
      const relevantGmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbAccount',
        query: {
          "locations.cid": { $in: [...new Set(gmbBizList.map(biz => biz.cid))] }
        },
        projection: {
          email: 1,
          locations: 1,
          gmbScannedAt: 1,
          emailScannedAt: 1
        },
        limit: 1000
      }).toPromise();

      relevantGmbAccounts.map(acct => this.emailAccountDict[acct.email] = acct);
      // get ALL requests against this gmb listing
      this.relevantGmbRequests = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbRequest',
        query: {
          gmbBizId: { $in: gmbBizList.map(biz => biz._id) }
        },
        limit: 1000
      }).toPromise();

      // inject isSelf to request
      this.relevantGmbRequests.map(request => request.isSelf = accounts.some(account => account.email === request.email));

      this.relevantGmbRequests.sort((r1, r2) => new Date(r2.date).valueOf() - new Date(r1.date).valueOf());

      this.gmbRows = gmbBizList.map(gmbBiz => ({
        gmbBiz: gmbBiz,
        outstandingTasks: outstandingTasks.filter(t => t.relatedMap.gmbBizId === gmbBiz._id),
        accountLocationPairs: relevantGmbAccounts.reduce((list, acct) => (list.push(...acct.locations.filter(loc => gmbBiz.cid && loc.cid === gmbBiz.cid).map(loc => ({
          account: acct,
          location: loc,
          statusHistory: loc.statusHistory.slice(0).reverse()
        }))), list), [])
      }));
    }
  }

  getGmbAccount(email) {
    return this.emailAccountDict[email];
  }

  getGmbRequests(gmbBiz: GmbBiz, email) {
    return this.relevantGmbRequests.filter(request => request.gmbBizId === gmbBiz._id && request.gmbAccountId === (this.getGmbAccount(email) || {})._id);
  }

  async refreshMainListing() {
    if (!this.restaurant.googleAddress || !this.restaurant.googleAddress.formatted_address) {
      this._global.publishAlert(AlertType.Danger, 'No address found for the restaurant!');
      return;
    }

    this.apiRequesting = true;
    const name = this.restaurant.name;
    const address = this.restaurant.googleAddress.formatted_address;

    let crawledResult;
    try {
      const query = { q: [name, address].join(" ") };
      crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", query).toPromise();
    }
    catch (error) {
    }

    if (!crawledResult) {
      // use only city state and zip code!
      // "#4, 6201 Whittier Boulevard, Los Angeles, CA 90022" -->  Los Angeles, CA 90022
      const addressTokens = address.split(", ");
      try {
        const query = { q: name + ' ' + addressTokens[addressTokens.length - 2] + ', ' + addressTokens[addressTokens.length - 1] };
        crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", query).toPromise();
      }
      catch (error) {
      }
    }

    if (!crawledResult) {
      this._global.publishAlert(AlertType.Danger, 'GMB crawling failed: No result found!');
    }

    else {
      // inject this listing result to restaurant!
      crawledResult.crawledAt = new Date();
      this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant.id || this.restaurant['_id'] },
        new: {
          _id: this.restaurant.id || this.restaurant['_id'],
          googleListing: crawledResult
        }
      }]).toPromise();
      this.restaurant.googleListing = crawledResult;
      this._global.publishAlert(AlertType.Success, 'GMB crawled: ' + this.restaurant.name);
    }

    this.apiRequesting = false;
  }

  async createOrMatchMainGmb() {
    if(this.restaurant.disabled) {

    }
    this.apiRequesting = true;

    // match from existing list!
    try {
      const existingGmbs = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          cid: this.restaurant.googleListing.cid,
        },
        projection: {
          name: 1
        }
      }).toPromise();

      if (existingGmbs[0]) {
        const gmbBiz = existingGmbs[0];
        // update this gmb's qmenuId to be the id
        await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', [
          {
            old: { _id: gmbBiz._id },
            new: { _id: gmbBiz._id, qmenuId: this.restaurant.id || this.restaurant['_id'] }
          }
        ]).toPromise();
        this._global.publishAlert(AlertType.Success, 'Matched existing GMB');

      } else {
        await this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', [
          { ...this.restaurant.googleListing, qmenuId: this.restaurant.id || this.restaurant['_id'], qmenuWebsite: this.restaurant.domain ? ('http://' + this.restaurant.domain) : (environment.customerUrl + '/#' + this.restaurant.alias) }
        ]).toPromise();
        this._global.publishAlert(AlertType.Success, 'Not Matched existing GMB. Created new');
      }
      this.populate();
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }

    this.apiRequesting = false;

  }

  isPublished(row) {
    return row.accountLocationPairs.some(al => al.location.status === 'Published');
  }

  hasMainGmb() {
    return this.gmbRows.some(r => r.gmbBiz.cid === this.restaurant.googleListing.cid);
  }

  async onEdit(event, gmbBiz: GmbBiz, field: string) {

    const newValue = (event.newValue || '').trim();

    if (field === 'qmenuPop3Password' && !gmbBiz.qmenuPop3Email) {
      this._global.publishAlert(AlertType.Danger, 'Error: please ALWAYS enter password AFTER entering email');
      return;
    }
    try {
      const old = { _id: gmbBiz._id };
      const updated = { _id: gmbBiz._id };
      updated[field] = newValue;
      if (field === 'qmenuPop3Password' && event.newValue && event.newValue.length < 20) {
        updated[field] = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: gmbBiz.qmenuPop3Email, phrase: event.newValue }).toPromise();
      }
      await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', [{
        old: old,
        new: updated
      }]).toPromise();

      gmbBiz[field] = newValue;

      this._global.publishAlert(AlertType.Success, 'Updated');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }

  async toggle(event, gmbBiz, field) {
    try {
      const newValue = event.target.checked;
      const old = { _id: gmbBiz._id };
      const updated = { _id: gmbBiz._id };
      old[field] = gmbBiz[field];
      updated[field] = newValue;

      await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', [{
        old: old,
        new: updated
      }]).toPromise();

      gmbBiz[field] = newValue;

      this._global.publishAlert(AlertType.Success, 'Updated');

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }

  async retrieveCode(row) {
    row.retrievedCodeObject = undefined;

    const host = row.gmbBiz.qmenuPop3Host;
    const email = row.gmbBiz.qmenuPop3Email;
    let password = row.gmbBiz.qmenuPop3Password;

    try {
      if (password.length > 20) {
        password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: email, phrase: password }).toPromise();
      }
      row.retrievedCodeObject = await this._api.post(environment.autoGmbUrl + 'retrieveGodaddyEmailVerificationCode', { host: host, email: email, password: password }).toPromise();
    } catch (error) {
      alert('Error retrieving email: ' + JSON.stringify(error));
    }

  }

  async refreshListing(gmbBiz: GmbBiz) {
    try {
      await this._gmb3.crawlBatchedGmbBizList([gmbBiz]);
      this._global.publishAlert(AlertType.Success, 'Success!');
    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, 'Error crawling info');
    }
  }

  async injectInfo(gmbBiz: GmbBiz) {
    try {
      await this._gmb.updateGmbWebsite(gmbBiz, true);
      this._global.publishAlert(AlertType.Success, 'Injected!');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error injecting info');
    }
  }

  isWebsiteOk(gmbBiz: GmbBiz) {
    if (gmbBiz.useBizWebsite || gmbBiz.useBizWebsiteForAll) {
      return Helper.areDomainsSame(gmbBiz.gmbWebsite, gmbBiz.bizManagedWebsite);
    } else {
      return Helper.areDomainsSame(gmbBiz.gmbWebsite, gmbBiz.qmenuWebsite) || this.isQmenuAlias(gmbBiz.gmbWebsite);
    }
  }



  /** item is in {menuUrls, reservations, and serviceProviders} */
  isOthersOk(gmbBiz: GmbBiz, item) {
    if (gmbBiz.useBizWebsiteForAll) {
      return (gmbBiz[item] || []).some(url => Helper.areDomainsSame(url, gmbBiz.bizManagedWebsite));
    } else {
      return (gmbBiz[item] || []).some(url => Helper.areDomainsSame(url, gmbBiz.qmenuWebsite) || this.isQmenuAlias(url));
    }
  }

  private isQmenuAlias(url) {
    return (url || '').indexOf('qmenu.us') >= 0 && url.indexOf(this.restaurant.alias) >= 0;
  }
}
