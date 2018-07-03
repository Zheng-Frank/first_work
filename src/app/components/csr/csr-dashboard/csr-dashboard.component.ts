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
  selector: 'app-csr-dashboard',
  templateUrl: './csr-dashboard.component.html',
  styleUrls: ['./csr-dashboard.component.scss']
})
export class CsrDashboardComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

}
