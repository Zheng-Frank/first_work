import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { mergeMap } from 'rxjs/operators';
import { FormEvent } from '@qmenu/ui';
import { zip, of } from 'rxjs';
import { GmbRequest } from '../../../classes/gmb/gmb-request';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { Task } from '../../../classes/tasks/task';
import { GmbService } from '../../../services/gmb.service';
import { ModalType } from "../../../classes/modal-type";

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

  scanningAll = false;

  processingGmbAccountSet = new Set<any>();

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb: GmbService) {

  }

  ngOnInit() {
    this.populate();
  }

  async populate() {
    const bizList = await this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbBiz",
      projection: {
        "gmbOwnerships.email": 1,
        "gmbOwnerships.status": 1,
        "phone": 1,
        "address": 1,
        "name": 1
      },
      limit: 5000
    }).toPromise();

    const accountList = await this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbAccount",
      limit: 5000
    }).toPromise();

    this.gmbAccounts = accountList.sort((a, b) => a.email.toLowerCase() > b.email.toLowerCase() ? 1 : -1).map(a => new GmbAccount(a));

    const sortedBizList = bizList.sort((b1, b2) => b1.name > b2.name ? 1 : -1).map(b => new GmbBiz(b));

    const emailAccountMap = {};
    this.gmbAccounts.map(a => emailAccountMap[a.email] = a);

    sortedBizList.map(biz => {
      const email = biz.getAccountEmail();
      if (email && emailAccountMap[email]) {
        emailAccountMap[email].bizList = emailAccountMap[email].bizList || [];
        emailAccountMap[email].bizList.push(biz);
      }
    });
    // make 
    this.filterGmbAccounts();
  }

  debounce(value) {
    this.filterGmbAccounts();
  }

  filterGmbAccounts() {
    this.filteredGmbAccounts = this.gmbAccounts;
    if (this.searchFilter) {
      this.filteredGmbAccounts = this.filteredGmbAccounts.filter(a => (a.email || '').toLowerCase().indexOf(this.searchFilter.toLowerCase()) >= 0);
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

  async done(event: FormEvent) {
    const gmb = event.object as GmbAccount;
    this.apiError = undefined;

    const oldGmb = {
      _id: gmb._id,
      email: gmb.email
    };
    const updatedGmb = {
      _id: gmb._id,
      email: gmb.email.toLowerCase().trim(),
      comments: gmb.comments
    } as any;

    if (gmb.password && gmb.password.length < 20) {
      try {
        updatedGmb.password = await this._api.post(environment.adminApiUrl + 'utils/crypto', {
          salt: gmb.email,
          phrase: gmb.password
        }).toPromise();
      } catch (error) {
        event.acknowledge(error.message || 'API Error.');
        console.log(error);
      };
    }

    try {
      if (gmb._id) {
        await this._api.patch(environment.adminApiUrl + "generic?resource=gmbAccount", [{ old: oldGmb, new: updatedGmb }]).toPromise();
      } else {
        await this._api.post(environment.adminApiUrl + 'generic?resource=gmbAccount', [updatedGmb]).toPromise();
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
    this._api.delete(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      ids: [gmb._id]
    }).subscribe(
      result => {
        event.acknowledge(null);
        this.gmbAccounts = this.gmbAccounts.filter(g => g.email !== gmb.email);
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
      const result = await this._gmb.scanOneGmbAccountLocations(gmb);
      this._global.publishAlert(AlertType.Success, "Success");
      event.acknowledge(null);
    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
      event.acknowledge(error);
    }
  }

  async scanAllPublishedLocations() {
    this.scanningAll = true;
    for (let gmbAccount of this.gmbAccounts) {
      try {
        this._global.publishAlert(AlertType.Info, 'Scanning ' + gmbAccount.email + '...');
        await this._gmb.scanOneGmbAccountLocations(gmbAccount);
      }
      catch (error) { }
    }
    this.scanningAll = false;
  }


  async scanRequests(event: FormEvent) {
    try {
      let results: any = await this._gmb.scanAccountEmails(event.object, true);
      event.acknowledge(null);
      this._global.publishAlert(AlertType.Success, 'Scanned ' + event.object.email + ', found: ' + results.length);
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

  async scanAllEmails() {
    this.scanningAll = true;
    for (let gmbAccount of this.gmbAccounts) {
      try {
        this._global.publishAlert(AlertType.Info, 'Scanning ' + gmbAccount.email + '...');
        await this._gmb.scanAccountEmails(gmbAccount, false);
      }
      catch (error) { }
    }
    this.scanningAll = false;
  }

  test() {
    this._global.publishModal(ModalType.gmbAccount, '123123');
  }
}
