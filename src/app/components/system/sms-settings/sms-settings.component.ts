import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-sms-settings',
  templateUrl: './sms-settings.component.html',
  styleUrls: ['./sms-settings.component.css']
})
export class SmsSettingsComponent implements OnInit {

  @Input() system: any;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {

  }

  isAdmin() {
    let roles = this._global.user.roles || [];
    return roles.includes('ADMIN');
  }

  async setDefault(smsProvider) {
    try {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=system", [
        {
          old: { _id: this.system._id, smsSettings: {} },
          new: { _id: this.system._id, smsSettings: { defaultProviderName: smsProvider.name } }
        }
      ]).toPromise();
      this.system.smsSettings.defaultProviderName = smsProvider.name;
      await this._api.post(environment.legacyApiUrl + "utilities/resetSystemSettings", {}).toPromise();
      this._global.publishAlert(AlertType.Success, "Success!");
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Serious Error Happended. Please check errors.');
    }
  }

  async deploy() {
    try {
      await this._api.post(environment.legacyApiUrl + "utilities/resetSystemSettings", {}).toPromise();
      this._global.publishAlert(AlertType.Success, "Success!");
    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed deployment.');
    }
  }

  async customizedUpdated(event) {

    try {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=system", [
        {
          old: { _id: this.system._id, smsSettings: { customized: {} } },
          new: { _id: this.system._id, smsSettings: { customized: this.system.smsSettings.customized } }
        }
      ]).toPromise();
      await this._api.post(environment.legacyApiUrl + "utilities/resetSystemSettings", {}).toPromise();
      this._global.publishAlert(AlertType.Success, "Success!");
    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed updating phone numbers. Please reload.');
    }

    if (event.some(p => p.length !== 10)) {
      const illFormattedPhones = event.filter(p => p.length !== 10);
      this._global.publishAlert(AlertType.Danger, 'Wrong format: ' + illFormattedPhones.join(', '));
    }

  }


}
