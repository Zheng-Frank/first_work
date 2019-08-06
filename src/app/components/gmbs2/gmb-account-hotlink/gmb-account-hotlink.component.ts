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
  @Input() muted;
  @Input() targetPage = 'GMB'; // or 'EMAIL'

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  async login() {
    try {
      const accounts = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmbAccount",
        query: {
          email: this.email
        },
        limit: 1
      }).toPromise();

      let password = accounts[0].password;
      if (password.length > 20) {
        password = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', { salt: this.email, phrase: password }).toPromise();
      }

      const target = 'login';

      await this._api.post(environment.autoGmbUrl + target, { email: accounts[0].email, password: password, stayAfterScan: true }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Logged in.');

    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed to login');
    }
  }

}
