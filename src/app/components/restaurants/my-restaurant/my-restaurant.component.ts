import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";;
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
      label: 'Number'
    },
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
      label: 'Invoices',
      paths: ['invoices'],
      sort: (a, b) => a.length - b.length
    },
    {
      label: 'Restaurant Rate'
    },
    {
      label: 'Not Collected',
      paths: ['notCollected'],
      sort: (a, b) => a - b
    },
    {
      label: 'Collected',
      paths: ['collected'],
      sort: (a, b) => a - b
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
      label: 'Onetime Commission',
      paths: ['qualifiedSalesBase'],
      sort: (a, b) => (a || 0) - (b || 0)
    },
    {
      label: '3 Months Bonus',
      paths: ['qualifiedSalesBonus'],
      sort: (a, b) => (a || 0) - (b || 0)
    },
    {
      label: 'Subtotal',
      paths: ['subtotal'],
      sort: (a, b) => a - b
    },
    {
      label: 'Had GMB',
      paths: ['gmbOnceOwned'],
      sort: (a, b) => (+a) - (+b)
    },
    {
      label: 'Current GMB'
    },
    {
      label: 'Websites'
    },
    {
      label: 'Ongoing Tasks'
    }

  ];

  constructor(private _api: ApiService, private _global: GlobalService) {

  }

  async ngOnInit() {
    this.isSuperUser = ['gary', 'chris', 'dixon'].indexOf(this._global.user.username) >= 0;
    this.username = this._global.user.username;
    this.usernames = [this.username];
    if (this.isSuperUser) {
      const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: {
          "rateSchedules.agent": 1
        },
        limit: 6000
      }).toPromise();
      const userSet = new Set();
      restaurants.map(r => {
        (r.rateSchedules || []).map(rs => {
          if (rs.agent) {
            userSet.add(rs.agent);
          }
        });
      });

      this.usernames = [...userSet];
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
        salesBase: 1,
        salesBonus: 1,
        salesThreeMonthAverage: 1
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
        showDetails: false,
        gmbOnceOwned: (new Date(r.createdAt) < new Date('2018-09-6')) // we only track GMB after 2018-9-6
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
          // project everything. get at least 2 ownerships to make sure we had qMenu
          gmbOwnerships: { $slice: -2 }
        },
        limit: batchSize
      }).toPromise();
      gmbBizList.map(gmbBiz => {
        if (gmbBiz.qmenuId && restaurantRowMap[gmbBiz.qmenuId]) {
          gmbBizIdMap[gmbBiz._id] = gmbBiz;
          const row = restaurantRowMap[gmbBiz.qmenuId];
          row.gmbOnceOwned = row.gmbOnceOwned || (gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && (gmbBiz.gmbOwnerships.length > 1 || gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status === 'Published'));
          row.gmbBiz = gmbBiz;
          row.published = gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status === 'Published';
          row.suspended = gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status === 'Suspended';
          if (row.restaurant.name === 'Zen Fusion Cuisine') {
            console.log(row);
          }
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
        row.qualifiedSalesBase = row.gmbOnceOwned ? row.restaurant.salesBase : 0;
        row.qualifiedSalesBonus = row.gmbOnceOwned ? row.restaurant.salesBonus : 0;
        row.unqualifiedSalesBase = (row.restaurant.salesBase || 0) - (row.qualifiedSalesBase || 0);
        row.unqualifiedSalesBonus = (row.restaurant.salesBonus || 0) - (row.qualifiedSalesBonus || 0);

      });


      // compute subtotal
      this.rows.map(row => {
        row.subtotal = (row.earned || 0) + (row.qualifiedSalesBase || 0) + (row.qualifiedSalesBonus || 0);
        row.unqualifiedSubtotal = (row.notEarned || 0) + (row.unqualifiedSalesBase || 0) + (row.unqualifiedSalesBonus || 0);
      });

      this.rows.sort((r1, r2) => r2.subtotal - r1.subtotal);
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
    return this.rows.reduce((sum, row) => sum + (row[field] || 0), 0);
  }

}
