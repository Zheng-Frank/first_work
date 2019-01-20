import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { GmbService } from 'src/app/services/gmb.service';
import { Task } from 'src/app/classes/tasks/task';
import { GmbRequest } from 'src/app/classes/gmb/gmb-request';
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

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb: GmbService) { }

  ngOnInit() {
  }

  async ngOnChanges(changes: SimpleChanges) {
    this.populate();
  }

  async populate() {
    if (this.restaurant) {
      // temp: also get gmbBiz to digg more info
      const gmbBizList = (await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          qmenuId: this.restaurant.id || this.restaurant['_id']
        },
        // projection: { since we don't expect lots of data, no projection is OK
        // },
        limit: 10
      }).toPromise());

      // query outstanding tasks for the restaurant

      const outstandingTasks = (await this._api.get(environment.adminApiUrl + 'generic', {
        resource: "task",
        query: {
          "relatedMap.gmbBizId": { $in: gmbBizList.map(biz => biz._id) },
          result: null
        },
        limit: 20
      }).toPromise()).map(t => new Task(t));

      console.log(gmbBizList)
      // const relevantEmails = gmbBizList.reduce((emails, biz) => { emails.push(...(biz.accounts || []).map(acct => acct.email)); return emails; }, []);

      const accounts = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbAccount',
        // query ALL because we need to tell if it is self!
        // query: {
        //   //email: { $in: [...new Set(relevantEmails)] }
        // },
        projection: {
          email: 1,
          gmbScannedAt: 1,
          emailScannedAt: 1
        },
        limit: 1000
      }).toPromise();

      accounts.map(acct => this.emailAccountDict[acct.email] = acct);

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
        outstandingTasks: outstandingTasks.filter(t => t.relatedMap.gmbBizId === gmbBiz._id)
      }));
    } else {
      this.gmbRows = [];
    }
  }

  getGmbAccount(email) {
    return this.emailAccountDict[email];
  }

  // private getRequests(gmbBiz, relevantGmbRequests) {
  //   // get last ownership time
  //   const lastTime = (gmbBiz.gmbOwnerships || []).filter(ownership => ownership.email).map(o => o.possessedAt).slice(-1)[0];
  //   if (lastTime) {
  //     const requests = relevantGmbRequests.filter(r => r.gmbBizId === gmbBiz._id && new Date(lastTime) < new Date(r.date));
  //     requests.sort((r1, r2) => new Date(r2.date).valueOf() - new Date(r1.date).valueOf());
  //     return requests;
  //   } else {
  //     return [];
  //   }
  // }

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
    this.apiRequesting = true;

    // match from existing list!
    try {
      const existingGmbs = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          cid: this.restaurant.googleListing.cid,
        },
        projection: {
          accounts: 1
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

  isPublished(gmbBiz: GmbBiz) {
    return (gmbBiz.accounts || []).some(acct => ((acct.history || []).slice(-1)[0] || {}).status === 'Published');
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
      await this._gmb.crawlOneGoogleListing(gmbBiz, true);
      this._global.publishAlert(AlertType.Success, 'Success!');
    } catch (error) {
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
      return this.sameDomain(gmbBiz.gmbWebsite, gmbBiz.bizManagedWebsite);
    } else {
      return this.sameDomain(gmbBiz.gmbWebsite, gmbBiz.qmenuWebsite);
    }
  }

  /** item is in {menuUrls, reservations, and serviceProviders} */
  isOthersOk(gmbBiz: GmbBiz, item) {
    if (gmbBiz.useBizWebsiteForAll) {
      return (gmbBiz[item] || []).some(url => this.sameDomain(url, gmbBiz.bizManagedWebsite));
    } else {
      return (gmbBiz[item] || []).some(url => this.sameDomain(url, gmbBiz.qmenuWebsite));
    }
  }

  private sameDomain(d1: string, d2: string) {
    if (!d1 || !d2) {
      return false;
    }
    // stripe remove things before / and after /
    if (!d1.startsWith('http:') && !d1.startsWith('https:')) {
      d1 = 'http://' + d1;
    }

    if (!d2.startsWith('http:') && !d2.startsWith('https:')) {
      d2 = 'http://' + d2;
    }

    let host1 = new URL(d1).host;
    let host2 = new URL(d2).host;
    // treating www as nothing
    if (!host1.startsWith('www.')) {
      host1 = 'www.' + host1;
    }
    if (!host2.startsWith('www.')) {
      host2 = 'www.' + host2;
    }
    return host1 === host2;
  }
}
