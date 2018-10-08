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

}
