import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { mergeMap } from 'rxjs/operators';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-gmb-account-hotlink',
  templateUrl: './gmb-account-hotlink.component.html',
  styleUrls: ['./gmb-account-hotlink.component.css']
})
export class GmbAccountHotlinkComponent implements OnInit {

  @Input() email;
  @Input() targetPage = 'GMB'; // or 'EMAIL'

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  login() {
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbAccount",
      query: {
        email: this.email
      },
      limit: 1
    })
      .pipe(mergeMap(gmbAccounts => {
        if (this.targetPage === 'GMB') {
          return this._api.post('http://localhost:3000/retrieveGmbLocations', { email: gmbAccounts[0].email, password: gmbAccounts[0].password, stayAfterScan: true });
        } else {
          return this._api.post('http://localhost:3000/retrieveGmbRequests', { email: gmbAccounts[0].email, password: gmbAccounts[0].password, stayAfterScan: true });
        }
      }

      ))
      .subscribe(
        ok => this._global.publishAlert(AlertType.Success, 'Logged in.'),
        error => this._global.publishAlert(AlertType.Danger, 'Failed to login')
      );
  }

}
