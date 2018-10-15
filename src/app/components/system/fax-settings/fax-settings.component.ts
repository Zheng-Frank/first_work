import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-fax-settings',
  templateUrl: './fax-settings.component.html',
  styleUrls: ['./fax-settings.component.css']
})
export class FaxSettingsComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    try {
      const systems = this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'system'
      }).toPromise();
      console.log(systems);
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error querying system');
    }

  }

  async sendTestFax() {
    try {
      await this._api.post(environment.qmenuApiUrl + 'messaging/fax', {
        providerName: "twilio",
        from: "6789091808",
        to: "6785509237",
        mediaUrl: "https://quez.herokuapp.com/utilities/order/5bafbfbf05a4681400059f63?format=pdf",
        callbackUrl: "https://67dqylz39g.execute-api.us-east-2.amazonaws.com/dev/utils/phaxio-callback?orderId=5bafbfbf05a4681400059f63"
      }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Successfully sent');
    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed! ' + JSON.stringify(error));
    }
  }

}


