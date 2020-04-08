import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { Agent } from 'src/app/classes/ivr/agent';

@Component({
  selector: 'app-ivr-dashboard',
  templateUrl: './ivr-dashboard.component.html',
  styleUrls: ['./ivr-dashboard.component.css']
})
export class IvrDashboardComponent implements OnInit {

  now = new Date();
  agents: Agent[] = [
    {
      name: "Zhang San",
      offlineAt: new Date("3/26/2020"),
    },
    {
      name: "Li Si",
      onlineAt: new Date("3/27/2020"),
    },
    {
      name: "Wang Wu",
      onlineAt: new Date("3/27/2020"),
      connectedPhone: "4075807504"
    },
  ];

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.refresh();
  }

  ngOnInit() {

  }

  refresh() {
  }
}
