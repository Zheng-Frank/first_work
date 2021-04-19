import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { GlobalService } from "../../../services/global.service";

@Component({
  selector: 'app-invoice-dashboard',
  templateUrl: './invoice-dashboard.component.html',
  styleUrls: ['./invoice-dashboard.component.scss']
})
export class InvoiceDashboardComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

}
