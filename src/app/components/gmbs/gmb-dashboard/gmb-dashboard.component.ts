import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-gmbs',
  templateUrl: './gmb-dashboard.component.html',
  styleUrls: ['./gmb-dashboard.component.scss']
})
export class GmbDashboardComponent implements OnInit {
  constructor(private _api: ApiService, private _global: GlobalService) {}

  ngOnInit() {}

}
