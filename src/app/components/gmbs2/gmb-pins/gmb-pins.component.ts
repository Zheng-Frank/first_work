import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-gmb-pins',
  templateUrl: './gmb-pins.component.html',
  styleUrls: ['./gmb-pins.component.css']
})
export class GmbPinsComponent implements OnInit {
  currentAction;

  myColumnDescriptors = [
    {
      label: "#"
    },
    {
      label: "Received At",
      paths: ['receivedAt'],
      sort: (a, b) => new Date(a).valueOf() - new Date(b).valueOf()
    },
    {
      label: "Method",
      paths: ['method'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Email",
      paths: ['email'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "PIN",
      paths: ['pin']
    },
  ];

  rows = [];

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.load();
  }

  isButtonVisible(action) {
    return true;
  }

  setAction(action) {
    this.currentAction = (this.currentAction === action ? undefined : action);
  }

  async load() {
    this.rows = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "gmb-pin",
      limit: 7000
    }).toPromise();
  }

}
