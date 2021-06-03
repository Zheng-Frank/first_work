import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { FormEvent } from '@qmenu/ui';
import { Gmb3Service } from 'src/app/services/gmb3.service';
declare var $: any;
@Component({
  selector: 'app-gmb-account-list',
  templateUrl: './gmb-account-list.component.html',
  styleUrls: ['./gmb-account-list.component.css']
})
export class GmbAccountListComponent implements OnInit {
  @ViewChild('gmbEditingModal') gmbEditingModal;
  gmbAccounts: GmbAccount[] = [];

  searchFilter;
  filteredGmbAccounts = [];

  gmbInEditing: GmbAccount = new GmbAccount();
  apiError = undefined;
  type;
  locationScanOlder;
  emailScanOlder;
  overSizeLocations;
  disabledAccount;
  accountsSorted = false;
  timeConstant = 7;

  scanningAll = false;

  processingGmbAccountSet = new Set<any>();

  publishedTotal;
  suspendedTotal;

  problematicLocations = [];

  now = new Date();

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {

  }

  ngOnInit() {
    this.populate();
    setTimeout(() => {
      $('#fake-Iinput').css('display', 'none');
    }, 400);
  }


  async populate() {
    const accountList = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "gmbAccount",
      projection: {
        email: 1,
        password: 1,
        type: 1,
        comments: 1,
        published: 1,
        suspended: 1,
        allLocations: 1,
        pagerSize: 1,
        postcardId: 1,
        gmbScannedAt: 1,
        emailScannedAt: 1,
        "locations.statusHisotory": { $slice: 1 },
        "locations.status": 1,
        "locations.statusHistory.time": 1,
        "locations.cid": 1,
        "locations.place_id": 1,
        "locations.locationName": 1,
        "locations.name": 1,
        "locations.address": 1,
        "locations.role": 1,
        disabled: 1,
        isAgencyAcct: 1,
        isYelpEmail: 1
      }
    }, 40);
    // add 24 hours suspended and duplicate!
    accountList.map(a => {
      let suspendedInPastDay = 0;
      (a.locations || []).map(loc => {
        if (loc.status === 'Suspended' && new Date().valueOf() - new Date(loc.statusHistory[0].time).valueOf() < 48 * 3600000) {
          suspendedInPastDay++;
        }
      });
      a.suspendedInPastDay = suspendedInPastDay;
    });

    this.publishedTotal = accountList.reduce((sum, a) => sum + (a.published || 0), 0);
    this.suspendedTotal = accountList.reduce((sum, a) => sum + (a.suspended || 0), 0);

    this.gmbAccounts = accountList.sort((a, b) => a.email.toLowerCase() > b.email.toLowerCase() ? 1 : -1).map(a => new GmbAccount(a));

    const emailAccountMap = {};
    this.gmbAccounts.map(a => emailAccountMap[a.email] = a);
    // make 
    this.filterGmbAccounts();
    // calculate problematic locations
    // 1. same cid, many suspended or published!

    this.problematicLocations = [];
    const cidLocationsMap = accountList.reduce((map, account) => ((account.locations || []).map(loc => { map[loc.cid] = [{ account: account, location: loc }, ...(map[loc.cid] || [])] }), map), {});

    Object.keys(cidLocationsMap).map(cid => {
      const eitherSuspendedOrPublished = cidLocationsMap[cid].filter(item => item.location.status === 'Published' || item.location.status === 'Suspended');
      if (eitherSuspendedOrPublished.length > 1 || !cid) {
        this.problematicLocations.push(eitherSuspendedOrPublished);
      }
    });
  }

  debounce(value) {
    this.filterGmbAccounts();
  }

  filterGmbAccounts() {
    this.filteredGmbAccounts = this.gmbAccounts;
    if (this.searchFilter) {
      this.filteredGmbAccounts = this.filteredGmbAccounts.filter(a =>
        a.locations.some(loc => loc.status !== 'Removed' && loc.name.toLowerCase().startsWith(this.searchFilter.toLowerCase())) ||
        (a.email || '').toLowerCase().indexOf(this.searchFilter.toLowerCase()) >= 0);
    }
    if (this.type && this.type != 'All') {
      this.filteredGmbAccounts = this.filteredGmbAccounts.filter(each => each.type === this.type)
    }
    if (this.locationScanOlder && this.locationScanOlder != 'All') {
      let hoursAgo = 60 * 60 * 1000 * this.locationScanOlder;
      this.filteredGmbAccounts = this.filteredGmbAccounts.filter(each => (new Date().valueOf() - new Date(each.gmbScannedAt).valueOf()) > hoursAgo)
    }

    if (this.emailScanOlder && this.emailScanOlder != 'All') {
      let hoursAgo = 60 * 60 * 1000 * this.emailScanOlder;
      this.filteredGmbAccounts = this.filteredGmbAccounts.filter(each => (new Date().valueOf() - new Date(each.emailScannedAt).valueOf()) > hoursAgo)
    }
    if (this.overSizeLocations) {
      console.log(this.filteredGmbAccounts);
      this.filteredGmbAccounts = this.filteredGmbAccounts.filter(each => each.allLocations > 95);
    }
    if (this.disabledAccount) {
      console.log(this.filteredGmbAccounts);
      this.filteredGmbAccounts = this.filteredGmbAccounts.filter(each => each.disabled);
    }
  }

  addNew() {
    this.apiError = undefined;
    this.gmbInEditing = {} as GmbAccount;
    this.gmbEditingModal.show();
  }

  edit(gmb) {
    this.apiError = undefined;
    this.gmbInEditing = new GmbAccount(gmb);
    this.gmbInEditing.password = '';
    this.gmbEditingModal.show();
  }

  cancel() {
    this.gmbEditingModal.hide();
  }

  sortAccounts() {
    if (this.accountsSorted === true) {
      this.filteredGmbAccounts.sort((a, b) => {
        return b.getAccountScore(this.timeConstant) - a.getAccountScore(this.timeConstant) || a.published - b.published;
        // If two or more accounts have the same score, we use secondary sort criteria (# of published locations)
        // By these two criteria, accounts will be sorted from worst (highest score) at the top to best at the bottom
      });
    } else {
      this.filteredGmbAccounts.sort((a, b) => a.email.toLowerCase() > b.email.toLowerCase() ? 1 : -1)
    }
 
  }

  async done(event: FormEvent) {

    const gmb = event.object as GmbAccount;
    console.log('gmb', gmb);
    this.apiError = undefined;

    const oldGmb = {
      _id: gmb._id,
      email: gmb.email
    };
    const updatedGmb = {
      _id: gmb._id,
      email: gmb.email.toLowerCase().trim(),
      type: gmb.type,
      comments: gmb.comments,
      disabled: gmb.disabled,
      isAgencyAcct: gmb.isAgencyAcct,
      isYelpEmail: gmb.isYelpEmail
    } as any;

    if (gmb.recoveryEmail) {
      updatedGmb.recoveryEmail = gmb.recoveryEmail;
    }

    if (gmb.password && gmb.password.length < 30) {
      try {
        updatedGmb.password = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', {
          salt: gmb.email,
          phrase: gmb.password
        }).toPromise();
      } catch (error) {
        event.acknowledge(error.message || 'API Error.');
        console.log(error);
      };
    }
    console.log(updatedGmb);
    try {
      if (gmb._id) {
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=gmbAccount", [{ old: oldGmb, new: updatedGmb }]).toPromise();
      } else {
        //ax 11/08/19 - add postcardId as well
        const maxId = Math.max(...(await this._global.getCachedGmbAccountsNoLocations()).map(acct => parseInt(acct.postcardId)));
        updatedGmb.postcardId = `${maxId + 1}`;
        await this._api.post(environment.qmenuApiUrl + 'generic?resource=gmbAccount', [updatedGmb]).toPromise();
      }
      event.acknowledge(null);
      // hard refresh
      this.populate();
      this.gmbEditingModal.hide();

    }
    catch (error) {
      this.apiError = 'Possible: no Auto-GMB server running';
      event.acknowledge(error.message || 'API Error.');
      console.log(error);
    }

  }

  remove(event: FormEvent) {
    const gmb = event.object;
    this._api.delete(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      ids: [gmb._id]
    }).subscribe(
      result => {
        event.acknowledge(null);
        this.gmbAccounts = this.gmbAccounts.filter(g => g.email !== gmb.email);
        this.filterGmbAccounts();
        this.gmbEditingModal.hide();
      },
      error => {
        event.acknowledge(error.message || 'API Error.');
        this.apiError = 'API Error. Status code: ' + error.statusText;
        console.log(error);
      }
    );
  }

  async scanBizList(event: FormEvent) {

    const gmb = event.object;
    try {
      await this._api.post(environment.appApiUrl + "gmb/generic", {
        name: "refresh-locations",
        payload: {
          "email": gmb.email
        }
      }).toPromise();

      this._global.publishAlert(AlertType.Success, "Success");
      this.populate();
      event.acknowledge(null);
    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
      event.acknowledge(error);
    }
  }

  async scanRequests(event: FormEvent) {
    try {
      const results = await this._api.post(environment.appApiUrl + "gmb/generic", {
        name: "scan-ownership-requests",
        payload: {
          "email": event.object.email
        }
      }).toPromise();
      event.acknowledge(null);
      this._global.publishAlert(AlertType.Success, `Scanned ${event.object.email}, found ${results.length}`);
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error scanning ' + event.object.email);
      event.acknowledge(error);
    }
  }

  async login(event: FormEvent) {
    try {
      const [account] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: "gmbAccount",
        query: {
          email: event.object.email
        },
        projection: {
          cookies: 1
        },
        limit: 1
      }).toPromise();

      if (!account || !account.cookies) {
        throw `Unable to find cookies for ${event.object.email}`;
      }

      await this._api.post(environment.autoGmbUrl + "login", { email: event.object.email, stayAfterScan: true, cookies: account.cookies }).toPromise();
      event.acknowledge(null);
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error scanning ' + event.object.email);
      event.acknowledge(error);
    }
  }


  isProcessing(gmbAccount) {
    return this.processingGmbAccountSet.has(gmbAccount);
  }

}
