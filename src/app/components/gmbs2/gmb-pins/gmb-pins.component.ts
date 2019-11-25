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

  apiLoading = false;

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
      label: "S3 Id",
      paths: ['messageId'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Method",
      paths: ['method'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },


    {
      label: "Source",
      paths: ['email'],
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
    this.apiLoading = true;
    this.rows = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "gmb-pin"
    }, 5000);
    this.rows.sort((r2, r1) => new Date(r1.receivedAt || 0).valueOf() - new Date(r2.receivedAt || 0).valueOf())
    this.apiLoading = false;
  }

  async purgeEmptyPins() {
    const emptyRows = this.rows.filter(row => !row.pin);
    if (emptyRows.length === 0) {
      return;
    }
    if (emptyRows.length > 160) {
      emptyRows.length = 160;
    }
    this.apiLoading = true;
    await this._api.delete(
      environment.qmenuApiUrl + "generic",
      {
        resource: 'gmb-pin',
        ids: emptyRows.map(row => row._id)
      }
    ).toPromise();
    this.load();
  }

}
