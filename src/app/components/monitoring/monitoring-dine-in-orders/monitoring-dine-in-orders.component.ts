import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Order } from '@qmenu/ui'
import { } from '@qmenu/ui'

@Component({
  selector: 'app-monitoring-dine-in-orders',
  templateUrl: './monitoring-dine-in-orders.component.html',
  styleUrls: ['./monitoring-dine-in-orders.component.css']
})
export class MonitoringDineInOrdersComponent implements OnInit {
  rows = []; // {restaurant, orders}

  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();

  log(item) {
    console.log(item)
  }
  async ngOnInit() {
    this.refreshOrders();

  }

  async refreshOrders() {
    const rightNow = new Date();
    const oneDayAgo = rightNow.setHours(rightNow.getHours() - 24).valueOf();

    // query all orders of type DINE-IN from the 24 hours
    const dineInOrders = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        createdAt: { $gt: { $date: oneDayAgo } },
        type: 'DINE-IN'
      },
      projection: {
        _id: 1,
        orderNumber: 1,
        "restaurantObj.name": 1,
        "restaurantObj._id": 1,
        type: 1,
        createdAt: 1,
      },
      sort: {
        createdAt: -1
      },
    }, 500);

    this.rows = dineInOrders;

    console.log(dineInOrders);
  }
}
