import { Component, OnInit } from '@angular/core';
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

  selectedProvider;

  providers = ['plivo', 'twilio'];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    try {
      const systems = this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'system'
      }).toPromise();
      if (systems[0]) {
        this.selectedProvider = systems[0].smsProvider;
      }
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error querying system');
    }
  }
  updateProvider(smsProvider) {
    console.log(smsProvider);
  }

}
