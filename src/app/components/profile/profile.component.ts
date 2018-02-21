import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../services/api.service";
import { environment } from "../../../environments/environment";
import { GlobalService } from "../../services/global.service";
import { Lead } from "../../classes/lead";
import { AlertType } from "../../classes/alert-type";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  teamRequested = false;
  relevantLeads = [];
  myTeamUsernames = [];
  
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  shouldShowMyMarketers() {
    return this._global.isUserInRoles(['ADMIN', 'MARKETING_DIRECTOR'])
  }

  getMyTeamData() {
    if(this.teamRequested === false) {
      this.teamRequested = true;
      // do api request here!
      // 1. request all users
      // 2. find all users under me and then request all leads assigned to those users, including me
      
    }
    return this.myTeamUsernames;
  }


}
