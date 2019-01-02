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

  rows = []; // {restaurant, orders}
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.refreshOrders();
    // setInterval(() => { this.refreshOrders(); }, 180000);

    setInterval(() => { this.now = new Date(); }, 60000);
  }

  async refreshOrders() {
    const minutesAgo = new Date();
    minutesAgo.setMinutes(minutesAgo.getMinutes() - 30);
    const orderStatuses = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'orderstatus',

      projection: {
        createdAt: 1,
        order: 1,
        status: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 3000
    }).toPromise();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);


    const orderIdMap = {};
    const orderStatusesWithin24hours = orderStatuses.filter(os => new Date(os.createdAt).valueOf() > yesterday.valueOf());
    orderStatusesWithin24hours.map(os => {
      if (!orderIdMap[os.order]) {
        orderIdMap[os.order] = [];
      }
      os.createdAt = new Date(os.createdAt);
      orderIdMap[os.order].push(os);
    });

    // ONLY one status and it must be SUBMITTED, and happened xx minutesAgo
    const unconfirmedOrderStatuses = Object.keys(orderIdMap).filter(orderId => orderIdMap[orderId].length === 1 && orderIdMap[orderId][0].status === 'SUBMITTED' && orderIdMap[orderId][0].createdAt.valueOf() < minutesAgo).map(orderId => orderIdMap[orderId][0]);


    unconfirmedOrderStatuses.length = unconfirmedOrderStatuses.length < 100 ? unconfirmedOrderStatuses.length : 100;
    // lets get only get 100 (due to query limitation)
    const unconfirmedOrders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        _id: { $in: unconfirmedOrderStatuses.map(os => ({ $oid: os.order })) }
      },
      projection: {
        orderNumber: 1,
        restaurant: 1,
        createdAt: 1
      },
      limit: 100
    }).toPromise();

    unconfirmedOrders.map(order => order.createdAt = new Date(order.createdAt));

    // get restaurants!
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $in: [...new Set(unconfirmedOrders.map(order => order.restaurant))].map(id => ({ $oid: id })) }
      },
      projection: {
        name: 1,
        googleAddress: 1,
        skipOrderConfirmation: 1
      },
      limit: 100
    }).toPromise();

    this.rows = restaurants.filter(r => !r.skipOrderConfirmation).map(restaurant => ({
      restaurant: restaurant,
      orders: unconfirmedOrders.filter(o => o.restaurant === restaurant._id)
    }));

    // sort by order createdAt desc
    this.rows.sort((r1, r2) => r2.orders[0].createdAt.valueOf() - r1.orders[0].createdAt.valueOf());

    // sort by order createdAt desc
    this.rows.map(row => row.orders.sort((o1, o2) => o2.createdAt.valueOf() - o1.createdAt.valueOf()));

  }

}
