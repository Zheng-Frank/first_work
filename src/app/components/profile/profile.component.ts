import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { AlertType } from "../../classes/alert-type";
import { User } from "../../classes/user";

@Component({
  selector: "app-profile",
  templateUrl: "./profile.component.html",
  styleUrls: ["./profile.component.scss"]
})
export class ProfileComponent implements OnInit {

  teamUsers = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    if (this._global.isUserInRoles(["ADMIN", "MARKETER_MANAGER"])) {
      this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "user",
          limit: 1000
        }).subscribe(
          result => {
            this.teamUsers = result.map(u => new User(u)).filter(u => u.manager === this._global.user.username).map(x => x.username);
          },
          error => {
            this._global.publishAlert(
              AlertType.Danger,
              "Error pulling users from API"
            );
          }
        );
    }
  }

  getUser() {
    return this._global.user;
  }


}
