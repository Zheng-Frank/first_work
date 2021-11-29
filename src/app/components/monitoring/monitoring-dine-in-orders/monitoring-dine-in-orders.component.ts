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
  rtDict = {};

  myColumnDescriptors = [
    {
      label: "Restaurant",
      paths: ["restaurantObj", "name"],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
    },
    {
      label: "Order Time",
      paths: ["createdAt"],
      sort: (a, b) => a.valueOf() > b.valueOf() ? 1 : (a.valueOf() < b.valueOf() ? -1 : 0),
    },
    {
      label: "RT Phone"
    },
    {
      label: "Customer Name",
      paths: ['customerName'],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
    },
    {
      label: "Customer Phone"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

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
        customerObj: 1
      },
      sort: {
        createdAt: -1
      },
    }, 500);

    dineInOrders.forEach(o => {
      if (this.rtDict[o.restaurantObj._id]) {
        this.rtDict[o.restaurantObj._id].orders.push(o);
      } else {
        this.rtDict[o.restaurantObj._id] = {
          rt: o.restaurantObj,
          orders: [o]
        };
      }
    });

    const rtIds = Object.keys(this.rtDict);
    this.rows = dineInOrders.map(row => ({
      ...row,
      customerName: this.getCustomerName(row),
      customerPhone: this.getCustomerPhone(row)
    }));

    await this.populateRtData(rtIds);
  }

  async populateRtData(rtIds) {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $in: rtIds.map(id => ({ $oid: id })) }
      },
      projection: {
        _id: 1,
        channels: 1,
        phones: 1
      },
      sort: {
        createdAt: -1
      },
    }, 500);

    restaurants.forEach(rt => {
      Object.assign(this.rtDict[rt._id.toString()].rt, rt)
    });
  }

  getCustomerPhone(row) {
    return row.customerObj.phone || 'n/a';
  }

  getCustomerName(row) {
    let name = '';
    name += (row.customerObj.firstName + ' ') || '';
    name += row.customerObj.lastName || '';
    return name.trim() || 'n/a';
  }

  getRtPhone(id) {
    if (!this.rtDict[id]) {
      return;
    }
    const numberFromPhonesArray = this.rtDict[id].rt.phones && this.rtDict[id].rt.phones[0].phoneNumber;
    const numberFromChannelsArray = (((this.rtDict[id].rt.channels || []).filter(ch => ch.type === 'Phone'))[0] || {}).value;

    return numberFromPhonesArray || numberFromChannelsArray || 'n/a';
  }
}
