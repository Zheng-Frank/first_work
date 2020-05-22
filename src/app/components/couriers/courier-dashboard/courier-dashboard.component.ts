import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Courier } from 'src/app/classes/courier';

@Component({
  selector: 'app-courier-dashboard',
  templateUrl: './courier-dashboard.component.html',
  styleUrls: ['./courier-dashboard.component.css']
})
export class CourierDashboardComponent implements OnInit {

  couriers: Courier[] = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.populate().then(console.log);
  }

  ngOnInit() {
  }

  async populate() {
    const couriers = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "courier",
      sort: {
        name: 1
      },
      limit: 3000
    }).toPromise();
    const restaurantsWithCouriers = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        courier: { $exists: true }
      },
      limit: 3000000
    }).toPromise();
    this.couriers = couriers.map(c => new Courier(c));
  }

  async toggleEnabled(courier, event) {
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=courier', [
      {
        old: { _id: courier._id },
        new: { _id: courier._id, enabled: courier.enabled }, // we bind courier.enabled to toggle, so we'd use that directly
      }
    ]).toPromise();
    this._global.publishAlert(AlertType.Success, "Status updated");
  }

}
