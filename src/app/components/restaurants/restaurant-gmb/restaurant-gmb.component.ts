import { Component, OnInit, Input, SimpleChanges, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { Helper } from 'src/app/classes/helper';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { parseAddress } from "parse-address";

@Component({
  selector: 'app-restaurant-gmb',
  templateUrl: './restaurant-gmb.component.html',
  styleUrls: ['./restaurant-gmb.component.css']
})
export class RestaurantGmbComponent implements OnInit {
  @ViewChild('addGMBInviteModal') addGMBInviteModal: ModalComponent;
  @Input() restaurant: Restaurant;

  relevantGmbRequests: any[] = [];
  emailAccountDict = {} as any;

  gmbRows;
  apiRequesting = false;
  now = new Date();

  inviteEmail = '';
  inviteRole = 'MANAGER';
  gmbOwner;
  hasGmbOwnership = false;

  isAdmin = false;

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
    console.log(parseAddress)
  }

  async ngOnInit() {
    this.hasGmbOwnership = await this.checkGmbOwnership();
  }

  async checkGmbOwnership() {
    try {
      return await this._api.post(environment.appApiUrl + "gmb/generic", {
        name: "check-gmb-api-ownership",
        payload: {
          "restaurantId": this.restaurant._id
        }
      }).toPromise();
    }
    catch (error) {
      console.error(`Error. Couldn't retrieve GMB ownership`, error);
      return false;
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    this.populate();
  }

  async populate() {

    this.gmbRows = [];
    if (!this.restaurant) {
      return;
    }

    const gmbBizList = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {
        $or: [
          { qmenuId: this.restaurant.id || this.restaurant['_id'] },
          { place_id: (this.restaurant.googleListing || {}).place_id || "junk place id" },
        ]

      },
      projection: {
        gmbOwnerships: 0,
        accounts: 0
      },
      limit: 10
    }).toPromise());

    // query outstanding tasks for the restaurant
    if (gmbBizList.length > 0) {

      const accounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
      const relevantGmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        aggregate: [
          { $match: { "locations.cid": { $in: [...new Set(gmbBizList.map(biz => biz.cid))] } } },
          {
            $project: {
              email: 1,
              role: 1,
              gmbScannedAt: 1,
              emailScannedAt: 1,
              password: 1,
              locations: {
                $filter: {
                  input: "$locations",
                  as: "location",
                  cond: { $in: ["$$location.cid", [...new Set(gmbBizList.map(biz => biz.cid))]] }
                },
                // statusHistory: 0
              }
            }
          },
        ]
      }).toPromise();

      relevantGmbAccounts.map(acct => this.emailAccountDict[acct.email] = acct);

      // get ALL requests against this gmb listing
      this.relevantGmbRequests = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbRequest',
        query: {
          cid: { $in: gmbBizList.map(biz => biz.cid) }
        },
        limit: 1000
      }).toPromise();

      // inject isSelf to request
      this.relevantGmbRequests.map(request => request.isSelf = accounts.some(account => account.email === request.email));

      this.relevantGmbRequests.sort((r1, r2) => new Date(r2.date).valueOf() - new Date(r1.date).valueOf());

      console.log(this.relevantGmbRequests);
      this.gmbRows = gmbBizList.map(gmbBiz => ({
        gmbBiz: gmbBiz,
        accountLocationPairs: relevantGmbAccounts.reduce((list, acct) => (list.push(...(acct.locations||[]).filter(loc => gmbBiz.cid && loc.cid === gmbBiz.cid).map(loc => ({
          account: acct,
          location: loc,
          statusHistory: loc.statusHistory.slice(0).reverse()
        }))), list), [])
      }));

      if (this.gmbRows) {
        this.gmbOwner = this.gmbRows[0].accountLocationPairs.filter(al => {
          const result = al.account.locations.filter(loc => loc.status === 'Published' && (loc.role=== 'PRIMARY_OWNER' || loc.role === 'OWNER' || loc.role === 'CO_OWNER'));
          return result.length > 0;
        });
      }
    }
  }

  getGmbAccount(email) {
    return this.emailAccountDict[email];
  }

  getGmbRequests(email) {
    // console.log(gmbBiz, email)
    return this.relevantGmbRequests.filter(request => request.gmbAccountEmail === email);

    // return this.relevantGmbRequests.filter(request => request.place_id === gmbBiz.place_id && request.gmbAccountId === (this.getGmbAccount(email) || {})._id);
  }

  async refreshMainListing() {
    if (!this.restaurant.googleAddress || !this.restaurant.googleAddress.formatted_address) {
      this._global.publishAlert(AlertType.Danger, 'No address found for the restaurant!');
      return;
    }

    this.apiRequesting = true;
    const name = this.restaurant.name;
    const address = this.restaurant.googleAddress.formatted_address.replace(", USA", "");
    const parsedRtAddress = parseAddress(address);
    console.log("parsed RT ", parsedRtAddress);
    let crawledResult;
    try {

      console.log("trying 1")
      // using name + address
      const query = { q: [name, address].join(", ") };
      crawledResult = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", query).toPromise();
      const parsed = parseAddress(crawledResult.address.replace(", USA", ""));
      console.log("parsed", parsed);
      if (parsedRtAddress.zip !== parsed.zip || parsedRtAddress.number !== parsed.number) {
        crawledResult = undefined;
      }
    }
    catch (error) {
      console.log(error);
      crawledResult = undefined;
    }

    if (!crawledResult) {
      console.log("trying 2")

      // use only city state and zip code!
      // "#4, 6201 Whittier Boulevard, Los Angeles, CA 90022" -->  Los Angeles, CA 90022
      const addressTokens = address.split(", ");
      try {
        const query = { q: name + ', ' + addressTokens[addressTokens.length - 2] + ', ' + addressTokens[addressTokens.length - 1] };
        crawledResult = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", query).toPromise();
        const parsed = parseAddress(crawledResult.address.replace(", USA", ""));
        console.log("parsed", parsed);
        if (parsedRtAddress.zip !== parsed.zip || parsedRtAddress.number !== parsed.number) {
          crawledResult = undefined;
        }
      }
      catch (error) {
        console.log(error);
        crawledResult = undefined;
      }
    }

    if (!crawledResult) {
      this._global.publishAlert(AlertType.Danger, 'GMB crawling failed: No matching result found!');
    } else {
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


      // query gmbBiz, and update!

      const gmbBizList = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          "cid": crawledResult.cid
        },
        projection: {
          email: 1
        },
        limit: 10
      }).toPromise();

      console.log(gmbBizList);

      const fields = ['phone', 'place_id', 'gmbOwner', 'gmbOpen', 'gmbWebsite', 'menuUrls', 'closed', 'reservations', 'serviceProviders'];

      const pairs = gmbBizList.map(gmbBiz => {
        const old = { _id: gmbBiz._id };
        fields.map(field => old[field] = "random");

        const newItem: any = {
          _id: gmbBiz._id,
          crawledAt: { $date: new Date() },
          ...crawledResult
        };

        return {
          old: old,
          new: newItem
        };
      });

      console.log(pairs);

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbBiz', pairs).toPromise();

    }

    this.apiRequesting = false;
    await this.populate();
  }

  async createOrMatchMainGmb() {
    if (this.restaurant.disabled) {
      alert('Disabled restaurant. Failed');
      return;
    }
    this.apiRequesting = true;

    // match from existing list!
    try {
      const existingGmbs = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          cid: this.restaurant.googleListing.cid,
        },
        projection: {
          name: 1,
          address: 1
        }
      }).toPromise();

      if (existingGmbs[0] && existingGmbs[0].address.indexOf(this.restaurant.googleAddress.postal_code) >= 0) {
        const gmbBiz = existingGmbs[0];
        // update this gmb's qmenuId to be the id
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbBiz', [
          {
            old: { _id: gmbBiz._id },
            new: { _id: gmbBiz._id, qmenuId: this.restaurant.id || this.restaurant['_id'] }
          }
        ]).toPromise();
        this._global.publishAlert(AlertType.Success, 'Matched existing GMB');

      } else if (this.restaurant.googleListing &&
        this.restaurant.googleListing.address &&
        this.restaurant.googleListing.address.indexOf(this.restaurant.googleAddress.postal_code) >= 0 &&
        this.restaurant.googleAddress.postal_code) {
        await this._api.post(environment.qmenuApiUrl + 'generic?resource=gmbBiz', [
          { ...this.restaurant.googleListing, qmenuId: this.restaurant.id || this.restaurant['_id'] }
        ]).toPromise();
        this._global.publishAlert(AlertType.Success, 'Not Matched existing GMB. Created new');
      } else {
        this._global.publishAlert(AlertType.Danger, 'Failed! Google listing zipcode mismatch!');
      }
      this.populate();
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }

    this.apiRequesting = false;
    await this.populate();
  }

  isPublished(row) {
    return row.accountLocationPairs.some(al => al.location.status === 'Published' && ['PRIMARY_OWNER', 'OWNER', 'CO_OWNER', 'MANAGER'].find(r => r === al.location.role));
  }

  hasMainGmb() {
    return this.gmbRows.some(r => r.gmbBiz.cid === this.restaurant.googleListing.cid);
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

  isWebsiteOk(gmbBiz) {
    const desiredWebsites = Helper.getDesiredUrls(this.restaurant);
    return Helper.areDomainsSame(gmbBiz.gmbWebsite, desiredWebsites.website);
  }

  /** item is in {menuUrls, reservations, and serviceProviders} */
  isOthersOk(gmbBiz: GmbBiz, item, target) {
    const desiredWebsites = Helper.getDesiredUrls(this.restaurant);
    const desiredWebsite = desiredWebsites[target];
    if (this.restaurant.web && this.restaurant.web.useBizWebsiteForAll) {
      return (gmbBiz[item] || []).some(url => Helper.areDomainsSame(url, desiredWebsite));
    } else {
      return (gmbBiz[item] || []).some(url => Helper.areDomainsSame(url, desiredWebsite));
    }
  }

  private isQmenuAlias(url) {
    return (url || '').indexOf('qmenu.us') >= 0 && url.indexOf(this.restaurant.alias) >= 0;
  }

  async inject(row) {
    if (!this.restaurant.web || !this.restaurant.web.qmenuWebsite || !this.restaurant.menus || this.restaurant.menus.length === 0) {
      this._global.publishAlert(AlertType.Danger, "restaurant NOT READY to inject anythiong yet");
      return;
    }
    const target = Helper.getDesiredUrls(this.restaurant);
    if (!target.website) {
      return this._global.publishAlert(AlertType.Info, 'No qMenu website found to inject');
    }
    for (let al of row.accountLocationPairs) {
      console.log(al);
      if (al.location.status === 'Published') {

        try {
          const result = await this._api.post(environment.appApiUrl + 'utils/inject-gmb-urls', {
            email: al.account.email,
            locationName: al.location.locationName,
            websiteUrl: target.website,
            menuUrl: target.menuUrl,
            orderAheadUrl: target.orderAheadUrl,
            reservationsUrl: target.reservation
          }).toPromise();
          this._global.publishAlert(AlertType.Success, "API Called");
          console.log(result);
        } catch (error) {
          console.log(error);
          this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
        }
      }
    }

  }

  async unlink(row) {
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbBiz', [{
      old: { _id: row.gmbBiz._id, qmenuId: row.gmbBiz.qmenuId },
      new: { _id: row.gmbBiz._id },
    }]).toPromise();
    this.gmbRows = this.gmbRows.filter(r => r != row);
  }

  showInviteGmbUserModal() {
    this.addGMBInviteModal.show();
  }

  isValidEmail() {
    return (/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/).test(this.inviteEmail)
  }

  async addGmbUser() {
    try {
      const ownerEmail = this.gmbOwner[0].account.email;

      if (!ownerEmail) {
        this._global.publishAlert(AlertType.Warning, `Could not find a gmb account for ${ownerEmail}`);
        return;
      }

      const payload = {
        restaurantId: this.restaurant._id,
        ownerEmail,
        inviteEmail: this.inviteEmail,
        inviteRole: this.inviteRole
      };

      await this._api.post(environment.appApiUrl + "gmb/generic", {
        name: "invite-gmb",
        payload
      }).toPromise();

      this.inviteEmail = '';

      this._global.publishAlert(AlertType.Success, 'Success!');
    } catch (error) {
      this._global.publishAlert(AlertType.Warning, `Error while trying to Invite Gmb User: ${this.inviteEmail}`);
      console.error(error);
    }

  }

  hideInviteGmbUserModal() {
    this.addGMBInviteModal.hide();
    this.inviteEmail = '';
  }

  async toggleSync(event, category, subCategory) {
    try {
      if (!this.restaurant.gmbSettings) this.restaurant.gmbSettings = {};
      if (!this.restaurant.gmbSettings.syncCategories) this.restaurant.gmbSettings.syncCategories = {};
      if (!this.restaurant.gmbSettings.syncCategories[category]) this.restaurant.gmbSettings.syncCategories[category] = {};

      let oldObj = { _id: this.restaurant._id };
      let newObj = Object.assign({}, oldObj);
      if (!subCategory) {
        const old = this.restaurant.gmbSettings.syncCategories[category].on;
        this.restaurant.gmbSettings.syncCategories[category].on = !old;

        oldObj[`gmbSettings.syncCategories.${category}.on`] = old;
        newObj[`gmbSettings.syncCategories.${category}.on`] = !old; //FIXME

      } else {
        if (!this.restaurant.gmbSettings.syncCategories[category][subCategory])
          this.restaurant.gmbSettings.syncCategories[category][subCategory] = {};
        const old = this.restaurant.gmbSettings.syncCategories[category][subCategory].on;
        this.restaurant.gmbSettings.syncCategories[category][subCategory].on = !old;

        oldObj[`gmbSettings.syncCategories.${category}.${subCategory}.on`] = old;
        newObj[`gmbSettings.syncCategories.${category}.${subCategory}.on`] = !old;
      }

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: oldObj,
        new: newObj
      }]).toPromise();

      this._global.publishAlert(AlertType.Success, 'Updated');

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }

  isSyncCategory(category) {
    return this.restaurant.gmbSettings
      && this.restaurant.gmbSettings.syncCategories
      && this.restaurant.gmbSettings.syncCategories[category]
      && this.restaurant.gmbSettings.syncCategories[category].on;
  }
  isSyncSubCategory(main, sub) {
    return this.isSyncCategory(main)
      && this.restaurant.gmbSettings.syncCategories[main][sub]
      && this.restaurant.gmbSettings.syncCategories[main][sub].on;
  }
}
