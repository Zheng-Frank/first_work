import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";;
import { Invoice } from 'src/app/classes/invoice';
import { RouterLinkWithHref } from '@angular/router';

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

  rolledInvoiceIdsSet = new Set();
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
        channels: 1,
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
        phone: (r.channels || []).filter(c => c.type === 'Phone' && (c.notifications || []).some(n => n === 'Business')).map(c => c.value)[0],
        tasks: [],
        invoices: [],
        showDetails: false,
        gmbOnceOwned: (new Date(r.createdAt) < new Date('2018-09-6')) // we only track GMB after 2018-9-6
      };
      restaurantRowMap[r._id] = row;
      return row;
    });

    const gmbBizIdMap = {};

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        // project everything. get at least 2 ownerships to make sure we had qMenu
        gmbOwnerships: { $slice: -2 },
        name: 1,
        qmenuId: 1,
        gmbWebsite: 1,
        qmenuWebsite: 1,
        gmbOpen: 1,
        "gmbOwnerships.status": 1,
        "gmbOwnerships.email": 1
      },
      limit: 6000
    }).toPromise();
    gmbBizList.map(gmbBiz => {
      if (gmbBiz.qmenuId && restaurantRowMap[gmbBiz.qmenuId]) {
        gmbBizIdMap[gmbBiz._id] = gmbBiz;
        const row = restaurantRowMap[gmbBiz.qmenuId];
        row.gmbOnceOwned = row.gmbOnceOwned || (gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && (gmbBiz.gmbOwnerships.length > 1 || gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status === 'Published'));
        row.gmbBiz = gmbBiz;
        row.published = gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status === 'Published';
        row.suspended = gmbBiz.gmbOwnerships && gmbBiz.gmbOwnerships.length > 0 && gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status === 'Suspended';
      }
    });


    let invoices = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        isCanceled: { $ne: true }
      },
      projection: {
        isCanceled: 1,
        commission: 1,
        fromDate: 1,
        toDate: 1,
        isPaymentCompleted: 1,
        "restaurant.id": 1,
        previousInvoiceId: 1,
        previousBalance: 1
      },
      limit: 200000
    }).toPromise()).map(i => new Invoice(i));
    invoices = invoices.filter(i => !i.isCanceled).filter(i => restaurantRowMap[i.restaurant.id]);
    invoices.map(i => restaurantRowMap[i.restaurant.id].invoices.push(i));

    this.rolledInvoiceIdsSet = new Set(invoices.filter(invoice => invoice.previousInvoiceId).map(invoice => invoice.previousInvoiceId));

    // make invoice as finally collected (if an invoice's paid, its rolled ancestors are also paid):
    const markAncestorsAsCollected = function (invoice, invoices) {
      if (invoice.previousInvoiceId) {
        const previousInvoice = invoices.filter(i => i._id === invoice.previousInvoiceId)[0];
        if (previousInvoice) {
          previousInvoice.paid = true;
          markAncestorsAsCollected(previousInvoice, invoices);
        } else {
          console.log('Not found previous invoice!', invoice);
        }
      }
    }

    invoices.map(invoice => {
      if (invoice.isPaymentCompleted) {
        invoice.paid = true;
        markAncestorsAsCollected(invoice, invoices);
      }
    });

    this.rows.map(row => row.collected = row.invoices.reduce((sum, invoice) => sum + (invoice.paid ? invoice.commission : 0), 0));
    this.rows.map(row => row.notCollected = row.invoices.reduce((sum, invoice) => sum + (invoice.paid ? 0 : invoice.commission), 0));

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

      row.invoices.reverse();
    });

    // compute subtotal
    this.rows.map(row => {
      row.subtotal = (row.earned || 0) + (row.qualifiedSalesBase || 0) + (row.qualifiedSalesBonus || 0);
      row.unqualifiedSubtotal = (row.notEarned || 0) + (row.unqualifiedSalesBase || 0) + (row.unqualifiedSalesBonus || 0);
    });

    this.rows.sort((r1, r2) => r2.subtotal - r1.subtotal);

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

  isRolledOrPaid(invoice) {
    return invoice.isPaymentCompleted || this.rolledInvoiceIdsSet.has(invoice._id);
  }

}
