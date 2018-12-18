import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { Invoice } from 'src/app/classes/invoice';

@Component({
  selector: 'app-my-restaurant',
  templateUrl: './my-restaurant.component.html',
  styleUrls: ['./my-restaurant.component.css']
})
export class MyRestaurantComponent implements OnInit {

  rows = [];
  now = new Date();

  isSuperUser = false;
  username;
  usernames = [];


  myColumnDescriptors = [
    {
      label: 'Name',
      paths: ['restaurant', 'name'],
      sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: 'Created At',
      paths: ['restaurant', 'createdAt'],
      sort: (a, b) => new Date(a).valueOf() - new Date(b).valueOf()
    },
    {
      label: 'GMB Owner'
    },
    {
      label: 'Websites'
    },
    {
      label: 'Ongoing Tasks'
    },
    {
      label: 'Invoices'
    },
    {
      label: 'Not Collected'
    },
    {
      label: 'Collected'
    },
    {
      label: 'Restaurant Rate'
    },
    {
      label: 'Your Cut'
    },
    {
      label: 'Earned',
      paths: ['earned'],
      sort: (a, b) => a - b
    },
    {
      label: 'Not Earned',
      paths: ['notEarned'],
      sort: (a, b) => a - b
    },
    {
      label: 'Onetime Sale'
    },
    {
      label: 'Bonus'
    },
    {
      label: 'Subtotal'
    }

  ];

  constructor(private _api: ApiService, private _global: GlobalService) {

  }

  async ngOnInit() {
    this.isSuperUser = ['gary', 'chris', 'dixon'].indexOf(this._global.user.username) >= 0;
    this.username = this._global.user.username;
    this.usernames = [this.username];
    if (this.isSuperUser) {
      const users = await this._api.get(environment.adminApiUrl + 'generic', { resource: 'user', limit: 1000 }).toPromise();
      this.usernames = users.map(user => user.username);
      this.usernames.sort();
    }
    this.populate();

  }

  changeUser() {
    this.populate();
  }

  async populate() {
    const myUsername = this.username;
    const myRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "$or": [
          { "rateSchedules.agent": myUsername.toLowerCase() },
          { "rateSchedules.agent": myUsername[0].toUpperCase() + myUsername.toLowerCase().slice(1) }
        ]
      },
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        "phones.phoneNumber": 1,
        "phones.type": 1,
        disabled: 1,
        createdAt: 1,
        rateSchedules: 1,
        agent: 1,
        onetimeCommision: 1,
        bonusCommission: 1
      },
      limit: 6000
    }).toPromise();

    const restaurantRowMap = {};

    this.rows = myRestaurants.map(r => {
      const row = {
        restaurant: new Restaurant(r),
        phone: (r.phones || []).filter(p => p.type === 'Business').map(p => p.phoneNumber)[0],
        tasks: [],
        invoices: [],
        showDetails: false
      };
      restaurantRowMap[r._id] = row;
      return row;
    });

    const batchSize = 200;
    const batchedRestaurants = Array(Math.ceil(myRestaurants.length / batchSize)).fill(0).map((i, index) => myRestaurants.slice(index * batchSize, (index + 1) * batchSize));

    const gmbBizIdMap = {};

    for (let batch of batchedRestaurants) {
      const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          qmenuId: { $in: batch.map(r => r._id) },
          isCanceled: { $ne: true }
        },
        projection: {
          gmbOwnerships: { $slice: -1 },
        },
        limit: batchSize
      }).toPromise();
      gmbBizList.map(gmbBiz => {
        if (gmbBiz.qmenuId && restaurantRowMap[gmbBiz.qmenuId]) {
          gmbBizIdMap[gmbBiz._id] = gmbBiz;

          const row = restaurantRowMap[gmbBiz.qmenuId];
          row.gmbBiz = gmbBiz;
          row.published = gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status === 'Published';
          row.suspended = gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status === 'Suspended';
        }
      });

      let invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'invoice',
        query: {
          "restaurant.id": { $in: batch.map(r => r._id) }
        },
        projection: {
          isCanceled: 1,
          commission: 1,
          fromDate: 1,
          toDate: 1,
          isPaymentCompleted: 1,
          "restaurant.id": 1
        },
        limit: 200000
      }).toPromise();
      invoices = invoices.filter(i => !i.isCanceled);
      invoices.map(i => restaurantRowMap[i.restaurant.id].invoices.push(new Invoice(i)));

      this.rows.map(row => row.collected = row.invoices.filter(i => i.isPaymentCompleted).reduce((sum, invoice) => sum + invoice.commission, 0));
      this.rows.map(row => row.notCollected = row.invoices.filter(i => !i.isPaymentCompleted).reduce((sum, invoice) => sum + invoice.commission, 0));
      this.rows.map(row => {
        row.commission = row.restaurant.rateSchedules[row.restaurant.rateSchedules.length - 1].commission || 0;
        row.rate = row.restaurant.rateSchedules[row.restaurant.rateSchedules.length - 1].rate || 0;
        row.fixed = row.restaurant.rateSchedules[row.restaurant.rateSchedules.length - 1].fixed || 0;

        row.earned = row.commission * row.collected;
        row.notEarned = row.commission * row.notCollected;
      });

      this.rows.sort((r1, r2) => r2.earned - r1.earned);
    }

    // query open Tasks
    const openTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        result: null,
        "relatedMap.gmbBizId": { $exists: 1 }
      },
      projection: {
        name: 1,
        "relatedMap.gmbBizId": 1,
        resultAt: 1,
      },
      limit: 2000
    }).toPromise();

    openTasks.map(task => {
      if (gmbBizIdMap[task.relatedMap.gmbBizId] && restaurantRowMap[gmbBizIdMap[task.relatedMap.gmbBizId].qmenuId]) {
        restaurantRowMap[gmbBizIdMap[task.relatedMap.gmbBizId].qmenuId].tasks.push(task);
      }
    });
  }

  getTotal(field) {
    return this.rows.reduce((sum, row) => sum + row[field], 0);
  }

}
