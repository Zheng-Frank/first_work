import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";
import { Observable } from "rxjs/Rx";
import { DeepDiff } from "../../classes/deep-diff";

@Component({
  selector: 'app-gmbs',
  templateUrl: './gmbs.component.html',
  styleUrls: ['./gmbs.component.scss']
})
export class GmbsComponent implements OnInit {
  constructor(private _api: ApiService, private _global: GlobalService) {}

  ngOnInit() {}

}
