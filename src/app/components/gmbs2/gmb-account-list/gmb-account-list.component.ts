import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { FormEvent } from '@qmenu/ui';
import { Gmb3Service } from 'src/app/services/gmb3.service';

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

  publishedTotal;
  suspendedTotal;

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) {

  }

  ngOnInit() {
    this.populate();
  }

  async populate() {

    const accountList = await this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbAccount",
      limit: 5000
    }).toPromise();

    this.publishedTotal = accountList.reduce((sum, a) => sum + (a.published || 0), 0);
    this.suspendedTotal = accountList.reduce((sum, a) => sum + (a.suspended || 0), 0);

    this.gmbAccounts = accountList.sort((a, b) => a.email.toLowerCase() > b.email.toLowerCase() ? 1 : -1).map(a => new GmbAccount(a));

    const emailAccountMap = {};
    this.gmbAccounts.map(a => emailAccountMap[a.email] = a);
    // make 
    this.filterGmbAccounts();
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
      const result = await this._gmb3.scanOneAccountForLocations(gmb.email, true);
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
      let results: any = await this._gmb3.scanOneEmailForGmbRequests(event.object.email, true);
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

}
