import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";
import { Observable } from "rxjs/Rx";
import { DeepDiff } from "../../classes/deep-diff";

@Component({
  selector: "app-system",
  templateUrl: "./system.component.html",
  styleUrls: ["./system.component.scss"]
})
export class SystemComponent implements OnInit {
  constructor(private _api: ApiService, private _global: GlobalService) {}

  ngOnInit() {}

  migrateAddress() {
    alert("under construction");
    // this._api
    //   .post(environment.qmenuApiUrl + "scripts/migrate-address", {})
    //   .subscribe(
    //     result => {
    //       this._global.publishAlert(
    //         AlertType.Info,
    //         "Migrated: " + result.length
    //       );
    //     },
    //     error => {
    //       this._global.publishAlert(
    //         AlertType.Danger,
    //         "Error running script from API"
    //       );
    //     }
    //   );
  }

}
