import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-gmb-account-hotlink',
  templateUrl: './gmb-account-hotlink.component.html',
  styleUrls: ['./gmb-account-hotlink.component.css']
})
export class GmbAccountHotlinkComponent implements OnInit {

  @Input() email;
  @Input() muted;
  @Input() targetPage = 'GMB'; // or 'EMAIL'
  @Input() redirectUrl;
  @Input() appealId;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  async login() {

    if (this.appealId && !this.redirectUrl) this.redirectUrl = `https://business.google.com/edit/l/${this.appealId}`;

    try {
      const [account] = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmbAccount",
        query: {
          email: this.email
        },
        projection: {_id: 0, email: 1, cookies: 1 },
        limit: 1
      }).toPromise();

      if(!account) {
        throw `No account found for ${this.email}`;
      }

      const target = 'login';
      await this._api.post(environment.autoGmbUrl + target, { email: account.email, stayAfterScan: true, redirectUrl: this.redirectUrl, cookies: account.cookies }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Logged in.');

    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed to login');
    }
  }

}
