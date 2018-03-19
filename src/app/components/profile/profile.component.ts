import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { Lead } from "../../classes/lead";
import { AlertType } from "../../classes/alert-type";
import { User } from "../../classes/user";

@Component({
  selector: "app-profile",
  templateUrl: "./profile.component.html",
  styleUrls: ["./profile.component.scss"]
})
export class ProfileComponent implements OnInit {
  teamRequested = false;
  relevantLeads = [];

  myTeamUsers = [];

  constructor(private _api: ApiService, private _global: GlobalService) {}

  ngOnInit() {
    if (this._global.isUserInRoles(["ADMIN", "MARKETING_DIRECTOR"])) {
      // grab all users and make an assignee list!
      // get all users
      this._api
        .get(environment.adminApiUrl + "generic", {
          resource: "user",
          limit: 1000
        })
        .subscribe(
          result => {
            const myTeamUsers = result
              .map(u => new User(u))
              .filter(u => u.manager === this._global.user.username);
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

  shouldShowMyMarketers() {
    return this._global.isUserInRoles(["ADMIN", "MARKETING_DIRECTOR"]);
  }

  getMyTeamData() {
    if (this.teamRequested === false) {
      this.teamRequested = true;
      // do api request here!
      // 1. request all users
      // 2. find all users under me and then request all leads assigned to those users, including me
    }
    return this.myTeamUsers;
  }
}
