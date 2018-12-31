import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-monitoring-unconfirmed-orders',
  templateUrl: './monitoring-unconfirmed-orders.component.html',
  styleUrls: ['./monitoring-unconfirmed-orders.component.css']
})
export class MonitoringUnconfirmedOrdersComponent implements OnInit {

  unconfirmedOrderStatuses = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.refreshOrders();
    // setInterval(() => { this.refreshOrders(); }, 180000);

    setInterval(() => { this.now = new Date(); }, 60000);
  }

  async refreshOrders() {

    const orderStatuses = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'orderstatus',
      query: {},
      projection: {
      },
      sort: {
        createdAt: -1
      },
      limit: 200
    }).toPromise();

    const orderIdMap = {};
    orderStatuses.map(os => {
      if (!orderIdMap[os.order]) {
        orderIdMap[os.order] = [];
      }
      os.createdAt = new Date(os.createdAt);
      orderIdMap[os.order].push(os);
    });

    this.unconfirmedOrderStatuses = Object.keys(orderIdMap).filter(orderId => orderIdMap[orderId].length === 1).map(orderId => orderIdMap[orderId][0]);
    console.log(orderStatuses);
  }

}
