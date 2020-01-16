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
    minutesAgo.setMinutes(minutesAgo.getMinutes() - 300);

    // we DON'T need an accurate cut of day. Let's just pull the latest 3000
    const ordersWithSatuses = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      projection: {
        orderNumber: 1,
        "restaurantObj.name": 1,
        "restaurantObj._id": 1,
        "statuses.status": 1,
        "statuses.createdAt": 1,
        statuses: {
          $slice: -1
        },
        createdAt: 1,
        timeToDeliver: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 4000
    }).toPromise();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const unconfirmedOrders = ordersWithSatuses.filter(o => new Date(o.createdAt).valueOf() > yesterday.valueOf() && new Date(o.createdAt).valueOf() < minutesAgo.valueOf() && o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED');

    // group by restaurants
    const rtIdDict = unconfirmedOrders.reduce((dict, order) => (
      dict[order.restaurantObj._id] = dict[order.restaurantObj._id] || { restaurant: order.restaurantObj, orders: [] },
      dict[order.restaurantObj._id].orders.push(order),
      dict
    ), {});

    // get if restaurant skipOrderConfirmation

    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $in: [...Object.keys(rtIdDict).map(id => ({ $oid: id }))] } },
      projection: {
        'googleAddress.formatted_address': 1,
        skipOrderConfirmation: 1
      },
      sort: {
        createdAt: -1
      }
    }, 6000)

    restaurants.map(rt => (rtIdDict[rt._id].restaurant.address = (rt.googleAddress || {}).formatted_address, rtIdDict[rt._id].restaurant.skipOrderConfirmation = rt.skipOrderConfirmation));

    this.rows = Object.values(rtIdDict).filter(item => !item['restaurant'].skipOrderConfirmation);

  }

  getDaysFromId(mongoId) {
    return Math.floor((this.now.valueOf() - parseInt(mongoId.substring(0, 8), 16) * 1000) / (24 * 3600000));
  }

}
