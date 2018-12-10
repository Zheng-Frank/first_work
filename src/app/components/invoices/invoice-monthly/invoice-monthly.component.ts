import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { Invoice } from 'src/app/classes/invoice';
@Component({
  selector: 'app-invoice-monthly',
  templateUrl: './invoice-monthly.component.html',
  styleUrls: ['./invoice-monthly.component.css']
})
export class InvoiceMonthlyComponent implements OnInit {
  startDatesOfEachMonth: Date[] = [];

  showFind = false;
  apiRequesting = false;
  toDate;

  rows = [];

  constructor(private _api: ApiService, private _global: GlobalService) {
    // we start from now and back unti 10/1/2016
    let d = new Date(2016, 9, 1);
    while (d < new Date()) {
      this.startDatesOfEachMonth.unshift(new Date(d.valueOf()));
      d.setMonth(d.getMonth() + 1);
    }
  }

  ngOnInit() {
    this.toDate = this.guessInvoiceDates(new Date());
    console.log(this.toDate)
  }

  guessInvoiceDates(someDate) {
    // 1 - 15 --> previous month: 16 - month end
    // otherwise 1 - 15 of same month
    if (someDate.getDate() > 15) {
      return this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth(), 15))
    } else {
      return this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth(), 0))
    }
  }

  // return 2017-2-12
  private formatDate(d) {
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) { month = '0' + month; }
    if (day.length < 2) { day = '0' + day; }
    return [year, month, day].join('-');
  }

  async findMissingInvoices() {
    this.apiRequesting = true;
    if (!this.toDate) {
      return alert('To Date is required!');
    }

    const uptoDate = new Date(this.toDate);

    // find all invoices that are not canceled
    const allRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        disabled: 1,
        "serviceSettings.paymentMethods": 1
      },
      limit: 20000
    }).toPromise();

    // calculate the list!
    const restaurantInvoicesDict = {};
    allRestaurants.map(r => {
      restaurantInvoicesDict[r._id] = {
        restaurant: r,
        invoices: [],
        overlappedInvoices: [],
        gappedInvoices: [],
        hasLast: false,
        orders: []
      };

      // get payments
      const paymentMethods = [];
      (r.serviceSettings || []).map(ss => paymentMethods.push(...ss.paymentMethods || []));
      // remove cash!
      restaurantInvoicesDict[r._id].paymentMethods = [...new Set(paymentMethods)].filter(p => p !== 'CASH');
    });


    // find all invoices that are not canceled, upto the toDate
    const nonCanceledInvoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        isCanceled: { $ne: true }
      },
      projection: {
        fromDate: 1,
        toDate: 1,
        "restaurant.id": 1,
        "restaurant.name": 1,
        "rateSchedules.commission": 1,
        "total": 1
      },
      limit: 20000
    }).toPromise();

    nonCanceledInvoices.map(i => {
      const item = restaurantInvoicesDict[i.restaurant.id];
      if (!item) {
        console.log('No restaurant found: ', i.restaurant.name);
      } else {
        item.invoices.push(new Invoice(i));
      }
    });

    // let's compute end result
    allRestaurants.map(r => {
      const item = restaurantInvoicesDict[r._id];
      // sort invoices by startDate
      item.invoices.sort((i1, i2) => i1.fromDate.valueOf() - i2.fromDate.valueOf());

      for (let i = 0; i < item.invoices.length - 1; i++) {
        if (item.invoices[i + 1].fromDate.valueOf() < item.invoices[i].toDate.valueOf()) {
          item.overlappedInvoices.push(item.invoices[i + 1]);
        }
        if (item.invoices[i + 1].fromDate.valueOf() > item.invoices[i].toDate.valueOf() + 48 * 3600000) {
          item.gappedInvoices.push(item.invoices[i + 1]);
        }
      }

      const conservativeToDate = new Date(this.toDate);

      item.hasLast = item.invoices.some(i => i.fromDate.valueOf() < conservativeToDate.valueOf() && i.toDate.valueOf() > conservativeToDate.valueOf());
      // never had invoices: query last 30 days
      this.rows.push(item);


    });

    // query orders for those missing last invoice!

    let rowsWithMissingLastWithoutInvoices = this.rows.filter(r => !r.hasLast && r.invoices.length === 0);
    let rowsWithMissingLastWithInvoices = this.rows.filter(r => !r.hasLast && r.invoices.length > 0);

    console.log(rowsWithMissingLastWithInvoices.length);
    console.log(rowsWithMissingLastWithoutInvoices.length);

    // already having invoices: query since last invoice date
    // remove Peking Restaurant (free)
    rowsWithMissingLastWithInvoices = rowsWithMissingLastWithInvoices.filter(r => r.restaurant._id !== '57e9574c1d1ef2110045e665');


    const batchSize = 150;

    // const batchedRows = Array(Math.ceil(rowsWithMissingLastWithInvoices.length / batchSize)).fill(0).map((i, index) => rowsWithMissingLastWithInvoices.slice(index * batchSize, (index + 1) * batchSize));
    const batchedRows = Array(Math.ceil(this.rows.length / batchSize)).fill(0).map((i, index) => this.rows.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedRows) {
      const toDateE = new Date(this.toDate);
      toDateE.setDate(toDateE.getDate() + 1);
      const fromDateE = new Date(this.toDate);
      fromDateE.setDate(fromDateE.getDate() - 180);

      const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: {
          restaurant: { $in: batch.map(row => ({ $oid: row.restaurant._id })) },
          $and: [
            {
              createdAt: { $lte: { $date: toDateE } }
            },
            {
              createdAt: { $gte: { $date: fromDateE } }
            }]
        },
        projection: {
          createdAt: 1,
          restaurant: 1
        },
        sort: {
          createdAt: -1
        },
        limit: 4000
      }).toPromise();

      console.log(orders.length);
      // match orders back to rows!
      orders.map(order => {
        const row = restaurantInvoicesDict[order.restaurant];
        if (row && (row.invoices.length === 0 || new Date(order.createdAt) > row.invoices[row.invoices.length - 1].toDate)) {
          row.orders.push(order);
        }
      });
      // sort by order numbers!
      this.rows.sort((r1, r2) => r2.orders.length - r1.orders.length);
    }

    this.apiRequesting = false;
  }
}
