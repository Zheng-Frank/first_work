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

  action;
  apiRequesting = false;
  toDate;

  rows = [];
  overlappedOrGappedOnly = false;

  overdueRows = [];
  rolledButLaterCompletedRows = [];
  paymentSentButNotCompletedRows = [];

  beingRolledInvoiceSet = new Set();

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

  getOverlappedOrgappedRows() {
    if (this.overlappedOrGappedOnly) {
      return this.rows.filter(r => r.gappedInvoices.length > 0 || r.overlappedInvoices.length > 0);
    } else {
      return this.rows;
    }
  }

  async toggleAction(action) {
    if (this.action === action) {
      return this.action = undefined;
    } else {
      this.action = action;
    }

    if (this.action === 'overdue') {
      this.populateOverdue();
    }

    if (this.action === 'rolledButLaterPaid') {
      this.populateRolledButLaterPaid();
    }

    if (this.action === 'paymentSentButNotCompleted') {
      this.populatePaymentSentButNotCompleted();
    }

  }

  async populatePaymentSentButNotCompleted() {

    const invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        isCanceled: { $ne: true },
        isPaymentSent: true,
        isPaymentCompleted: { $ne: true },
      },
      projection: {
        createdAt: 1,
        fromDate: 1,
        toDate: 1,
        balance: 1,
        "restaurant.name": 1,
        "restaurant.id": 1
      },
      limit: 200000
    }).toPromise();

    const beingRolledInvoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        previousInvoiceId: { $exists: true },
        isCanceled: { $ne: true },
      },
      projection: {
        previousInvoiceId: 1
      },
      limit: 200000
    }).toPromise();

    this.beingRolledInvoiceSet = new Set(beingRolledInvoices.map(invoice => invoice.previousInvoiceId));
    this.paymentSentButNotCompletedRows = invoices;
    // sort by balance
    this.paymentSentButNotCompletedRows.sort((i1, i2) => i1.balance - i2.balance);
    console.log(this.beingRolledInvoiceSet);
  }

  beingRolled(invoice) {
    return this.beingRolledInvoiceSet.has(invoice._id);
  }

  async populateRolledButLaterPaid() {
    this.rolledButLaterCompletedRows = [];
    const invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        isCanceled: { $ne: true }
      },
      projection: {
        createdAt: 1,
        fromDate: 1,
        toDate: 1,
        previousInvoiceId: 1,
        balance: 1,
        "logs.time": 1,
        "logs.value": 1,
        isPaymentCompleted: 1,
        isPaymentSent: 1,
        "restaurant.name": 1,
        "restaurant.id": 1
      },
      limit: 200000
    }).toPromise();

    const dict = {};
    invoices.map(invoice => dict[invoice._id] = invoice);

    invoices.map(invoice => {
      const previousInvoice = dict[invoice.previousInvoiceId];
      if (previousInvoice && previousInvoice.balance !== 0) {
        // test if the action was done AFTER current invoice is created
        if (previousInvoice.isPaymentCompleted && previousInvoice.logs.some(log => typeof log.value === 'string' && log.value.startsWith('isPaymentCompleted') && new Date(log.time) > new Date(invoice.createdAt))) {
          this.rolledButLaterCompletedRows.push(invoice);
        } else if (previousInvoice.isPaymentSent && !previousInvoice.isPaymentCompleted) { // send is same as paid
          this.rolledButLaterCompletedRows.push(invoice);
        }
      }
    });

    console.log(this.rolledButLaterCompletedRows);
  }

  async populateOverdue() {

    // non-canceled,
    // not payment completed
    const invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        isPaymentCompleted: { $ne: true },
        isCanceled: { $ne: true },
        isSent: true,
        // balance: { $lt: 0 } // only when they owe us money!
      },
      projection: {
        "logs.time": 1,
        "logs.action": 1,
        "logs.user": 1,
        balance: 1,
        "restaurant.id": 1,
        "restaurant.name": 1,
        fromDate: 1,
        toDate: 1,
        previousInvoiceId: 1,
        "payments.amount": 1
      },
      limit: 80000
    }).toPromise();

    // organize by restaurant id
    const idRowMap = {};
    invoices.map(invoice => {
      if (idRowMap[invoice.restaurant.id]) {
        idRowMap[invoice.restaurant.id].invoices.push(new Invoice(invoice));
      } else {
        idRowMap[invoice.restaurant.id] = {
          restaurant: invoice.restaurant,
          invoices: [new Invoice(invoice)]
        };
      }
    });


    const havingReferenceInvoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        previousInvoiceId: { $exists: true }
      },
      projection: {
        previousInvoiceId: 1
      },
      limit: 80000
    }).toPromise();


    const beingReferencedIds = new Set(havingReferenceInvoices.map(i => i.previousInvoiceId));


    const collectionLogs = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "logs.type": "collection"
      },
      projection: {
        "logs.time": 1,
        "logs.response": 1,
        "logs.username": 1,
        "logs.type": 1
      },
      limit: 20000
    }).toPromise();

    collectionLogs.map(restaurant => {
      if (idRowMap[restaurant._id]) {
        idRowMap[restaurant._id].logs = (restaurant.logs || []).filter(log => log.type === 'collection');
      }
    });

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {
        "gmbOwnerships.status": 'Published',
        qmenuId: { $exists: 1 }
      },
      projection: {
        qmenuId: 1,
        "gmbOwnerships.status": 1
      },
      limit: 20000
    }).toPromise();

    const ownedGmbBizList = gmbBizList.filter(gmbBiz => gmbBiz.gmbOwnerships[gmbBiz.gmbOwnerships.length - 1].status === 'Published');

    ownedGmbBizList.map(biz => {
      if (idRowMap[biz.qmenuId]) {
        idRowMap[biz.qmenuId].ownedGmb = true;
      }
    });

    collectionLogs.map(restaurant => {
      if (idRowMap[restaurant._id]) {
        idRowMap[restaurant._id].logs = (restaurant.logs || []).filter(log => log.type === 'collection');
      }
    });

    // now lets filter:

    this.overdueRows = Object.keys(idRowMap).map(id => idRowMap[id]);
    // remove being referenced invoices because they are handled!

    console.log('before', this.overdueRows.length);

    // treating rolled as paid
    this.overdueRows.map(row => row.invoices = row.invoices.filter(i => !beingReferencedIds.has(i._id)));
    this.overdueRows = this.overdueRows.filter(row => row.invoices.length > 0);
    console.log('after', this.overdueRows.length);

    const overdueSpan = 48 * 24 * 3600000;
    this.overdueRows = this.overdueRows.filter(row =>
      // over timespan
      row.invoices[row.invoices.length - 1].toDate.valueOf() - row.invoices[0].fromDate.valueOf() > overdueSpan
      // previous is not paid (rolled over)
      || (row.invoices[0].previousInvoiceId && (row.invoices[0].payments || []).length === 0)
    );

    console.log('after 2', this.overdueRows.length);
    // for each row, let's remove being rolled ones!

    // sort by total unpaid desc
    this.overdueRows.map(row => row.unpaidBalance = row.invoices.reduce((sum, invoice) => sum + invoice.balance, 0));
    this.overdueRows.sort((row1, row2) => row2.unpaidBalance - row1.unpaidBalance);
  }

  getTotalUnpaid() {
    return this.overdueRows.reduce((sum, row) => sum + (row.unpaidBalance > 0 ? row.unpaidBalance : 0), 0);
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

    console.log(uptoDate);

    // if(uptoDate) {
    //   throw 'test'
    // }

    // find all invoices that are not canceled
    let allRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
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
        gaps: [],
        hasLast: false,
        orders: []
      };

      // get payments
      const paymentMethods = [];
      (r.serviceSettings || []).map(ss => paymentMethods.push(...ss.paymentMethods || []));
      // remove cash!
      restaurantInvoicesDict[r._id].paymentMethods = [...new Set(paymentMethods)].filter(p => p !== 'CASH');
    });

    // allRestaurants = allRestaurants.filter(r => r.serviceSettings && r.serviceSettings.some(ss => ss.paymentMethods.indexOf('QMENU') >= 0))

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
        "total": 1,
        isPaymentCompleted: 1,
        balance: 1
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
          const fromDate = new Date(item.invoices[i].toDate);
          const toDate = new Date(item.invoices[i + 1].fromDate);
          fromDate.setDate(fromDate.getDate() + 1);
          toDate.setDate(toDate.getDate() - 1);
          item.gaps.push({
            fromDate: fromDate,
            toDate: toDate,
            orders: []
          })
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
      const toDateE = new Date(uptoDate);
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
        const createdAt = new Date(order.createdAt);
        // if (row && (row.invoices.length === 0 || createdAt > row.invoices[row.invoices.length - 1].toDate)) {
        if (row && createdAt < uptoDate && !(row.invoices || []).some(invoice => invoice.fromDate < createdAt && invoice.toDate.valueOf() + 24 * 3600000 > createdAt.valueOf())) {
          row.orders.push(order);

          console.log(uptoDate);
          console.log(createdAt);
          console.log(createdAt < uptoDate)
        }
        if (row) {
          row.gaps.map(gap => {
            if (gap.fromDate < createdAt && createdAt < gap.toDate) {
              console.log(order);
            }
          });
        }
      });
      // sort by order numbers!
      this.rows.sort((r1, r2) => r2.orders.length - r1.orders.length);
    }

    this.apiRequesting = false;
  }

  async refreshOverdueRowLogs(row) {
    const restaurant = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: row.restaurant.id }
      },
      projection: {
        logs: 1,
        name: 1
      }
    }).toPromise())[0];
    row.logs = (restaurant.logs || []).filter(log => log.type === 'collection');
  }
}
