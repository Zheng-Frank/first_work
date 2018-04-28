import { Component, OnInit, ViewChild } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Lead } from "../../../classes/lead";
import { AlertType } from "../../../classes/alert-type";
import { GmbInfo } from "../../../classes/gmb-info";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { CallLog } from "../../../classes/call-log";
import { User } from "../../../classes/user";
import { Helper } from "../../../classes/helper";


@Component({
  selector: 'app-invoice-dashboard',
  templateUrl: './invoice-dashboard.component.html',
  styleUrls: ['./invoice-dashboard.component.scss']
})
export class InvoiceDashboardComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  getOne() {
    this._api
      .get(environment.qmenuApiUrl + "generic2", {
        resource: "invoice",
        limit: 100
      })
      .subscribe(
        result => {
          console.log(result)
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling invoice from API"
          );
        }
      );
  }

}
