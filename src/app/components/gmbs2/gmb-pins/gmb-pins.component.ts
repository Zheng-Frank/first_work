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
    const gmbPins = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "gmb-pin",
      projection: {
        email: 1,
        published: 1,
        suspended: 1
      },
      limit: 7000
    }).toPromise();

    console.log(gmbPins)
  }

}
