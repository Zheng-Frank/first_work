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


  removeDuplicates() {
    // 1. query ALL with restaurantIds
    // 2. calculate duplicated
    // 3. remove duplicated

    this._api
      .get(environment.adminApiUrl + "generic", {
        resource: "lead",
        query: {
          restaurantId: { $exists: true }
        },
        projection: {
          restaurantId: 1
        },
        limit: 6000
      })
      .subscribe(
        result => {
          console.log(result);
          const duplicatedIds = [];
          const existingRestaurantIdSet = new Set();
          result.map(lead => {
            if (existingRestaurantIdSet.has(lead.restaurantId)) {
              duplicatedIds.push(lead._id);
            } else {
              existingRestaurantIdSet.add(lead.restaurantId);
            }
          });
          this.removeLeads(duplicatedIds);
          console.log(duplicatedIds);
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling gmb from API"
          );
        }
      );
  }

  removeLeads(leadIds) {
    leadIds.length = 200;
    console.log("remove", leadIds);
    this._api
      .delete(environment.adminApiUrl + "generic", {
        resource: "lead",
        ids: leadIds
      })
      .subscribe(
        result => {
          this._global.publishAlert(
            AlertType.Success,
            result.length + " was removed"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
  }

}
