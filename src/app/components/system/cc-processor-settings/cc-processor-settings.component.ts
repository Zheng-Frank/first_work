import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-cc-processor-settings',
  templateUrl: './cc-processor-settings.component.html',
  styleUrls: ['./cc-processor-settings.component.css']
})
export class CcProessorSettingsComponent implements OnInit {

  @Input() system: any;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {

  }

  async setDefault(ccProcessorProvider) {
    try {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=system", [
        {
          old: { _id: this.system._id, ccProcessorSettings: {} },
          new: { _id: this.system._id, ccProcessorSettings: { defaultProviderName: ccProcessorProvider.name } }
        }
      ]).toPromise();
      this.system.ccProcessorSettings.defaultProviderName = ccProcessorProvider.name;
      this._global.publishAlert(AlertType.Success, "Success!");
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Serious Error Happended. Please check errors.');
    }
  }

  async customizedUpdated(event) {

    try {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=system", [
        {
          old: { _id: this.system._id, ccProcessorSettings: { } },
          new: { _id: this.system._id, ccProcessorSettings: { customized: this.system.ccProcessorSettings.customized } }
        }
      ]).toPromise();
      this._global.publishAlert(AlertType.Success, "Success!");
    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed updating phone numbers. Please reload.');
    }

    if (event.some(p => p.length !== 24)) {
      const illFormattedIds = event.filter(p => p.length !== 24);
      this._global.publishAlert(AlertType.Danger, 'Wrong format: ' + illFormattedIds.join(', '));
    }

  }

}
