import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { mergeMap } from 'rxjs/operators';

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

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.retrieveGmbAccounts();
  }

  ngOnInit() {
  }

  retrieveGmbAccounts() {
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbAccount",
      projection: {
        email: 1,
        password: 1
      },
      limit: 5000
    })
      .subscribe(
        gmbAccounts => {
          this.gmbAccounts = gmbAccounts.map(g => new GmbAccount(g)).sort((g1, g2) => g1.email > g2.email ? 1 : -1);
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
    this.gmbInEditing = gmb;
    this.gmbEditingModal.show();
  }

  cancel() {
    this.gmbEditingModal.hide();
  }

  done(gmb) {
    console.log(gmb)
    this.apiError = undefined;
    this._api.post(environment.autoGmbUrl + 'encrypt', gmb).pipe(mergeMap(result => {
      const oldGmb = JSON.parse(JSON.stringify(gmb));
      const updatedGmb = JSON.parse(JSON.stringify(gmb));
      updatedGmb.password = result;

      if (gmb.id) {
        return this._api.patch(environment.adminApiUrl + "generic?resource=gmbAccount", [{ old: oldGmb, new: updatedGmb }]);
      } else {
        return this._api.post(environment.adminApiUrl + 'generic?resource=gmbAccount', [updatedGmb]);
      }

    })).subscribe(
      result => {
        // hard refresh
        this.retrieveGmbAccounts();
        this.gmbEditingModal.hide();
      },
      error => {
        this.apiError = 'API Error. Status code: ' + error.status;
        console.log(error);
      }
    );
  }

  remove(gmb) {
    this._api.delete(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      ids: [gmb._id]
    }).subscribe(
      result => {
        // hard refresh
        this.retrieveGmbAccounts();
        this.gmbEditingModal.hide();
      },
      error => {
        this.apiError = 'API Error. Status code: ' + error.status;
        console.log(error);
      }
    );
  }

}
