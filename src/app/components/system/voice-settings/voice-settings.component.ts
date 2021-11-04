import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-voice-settings',
  templateUrl: './voice-settings.component.html',
  styleUrls: ['./voice-settings.component.css']
})
export class VoiceSettingsComponent implements OnInit {

  @Input() system: any;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {

  }

  isAdmin() {
    let roles = this._global.user.roles || [];
    return roles.includes('ADMIN');
  }

  async setDefault(voiceProvider) {
    try {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=system", [
        {
          old: { _id: this.system._id, voiceSettings: {} },
          new: { _id: this.system._id, voiceSettings: { defaultProviderName: voiceProvider.name } }
        }
      ]).toPromise();
      this.system.voiceSettings.defaultProviderName = voiceProvider.name;
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
          old: { _id: this.system._id, voiceSettings: { customized: {} } },
          new: { _id: this.system._id, voiceSettings: { customized: this.system.voiceSettings.customized } }
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
