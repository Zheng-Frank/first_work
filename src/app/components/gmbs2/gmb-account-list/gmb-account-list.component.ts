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
  accounts: any[] = []; // account with bizCount

  gmbInEditing: GmbAccount = new GmbAccount();
  apiError = undefined;

  scanningAll = false;

  processingGmbAccountSet = new Set<any>();

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb: GmbService) {
    

    // let's retrieve gmb accounts and gmb biz (to count how many biz for each account):
    zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        projection: {
          "gmbOwnerships.email": 1,
          "phone": 1
        },
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
        },
        limit: 5000
      })
    )
      .subscribe(
        results => {
          const accountMap = {};
          results[1].map(a => {
            accountMap[a.email] = a;
          });
          results[0].map(biz => {
            if (biz.gmbOwnerships && biz.gmbOwnerships.length > 0) {
              const email = biz.gmbOwnerships[biz.gmbOwnerships.length - 1].email;
              if (accountMap[email]) {
                accountMap[email].bizCount = (accountMap[email].bizCount || 0) + 1;
              }
            }
          });

          this.accounts = results[1].sort((a, b) => a.email.toLowerCase() > b.email.toLowerCase() ? 1 : -1);
          this.retrieveGmbAccounts();
          console.log(this.accounts);
        },
        error => {
          this._global.publishAlert(AlertType.Danger, error);
        }
      );


    
  }

  ngOnInit() {
  }


  retrieveGmbAccounts() {
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbAccount",
      // projection: {
      //   email: 1,
      //   password: 1
      // },
      limit: 5000
    })
      .subscribe(
        gmbAccounts => {
          this.gmbAccounts = gmbAccounts.map(g => {
            let gmb=new GmbAccount(g);
            gmb.bizCount=this.accounts.find(each=>each.email=== gmb.email).bizCount;
            return gmb;
          }
          ).sort((g1, g2) => g1.email > g2.email ? 1 : -1);
          this.filterGmbAccounts();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
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
      this.retrieveGmbAccounts();
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
