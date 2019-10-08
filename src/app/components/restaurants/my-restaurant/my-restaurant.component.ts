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
  result;
  hadGainedBySalesTotal;
  hadGainedByQmenuTotal;

  currentPublishedTotal;

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
      label: 'GMB Origin',
      paths: ['firstStatus'],
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

  gmbColumnDescriptors = [
    {
      label: 'Month',
      paths: ['month'],
      default: true,
      sort: (a, b) => {
        a = a.split("/");
        b = b.split("/");
        //return new Date(a[1], a[0]) > new Date(b[1], b[0])
        return new Date(a[1], a[0]).valueOf() - new Date(b[1], b[0]).valueOf()
      }

    },

    {
      label: 'Restaurants',
      paths: ['rts'],
      sort: (a, b) => a - b
    },
    {
      label: 'GMB Gained By Sales',
      paths: ['gmbGainedBySales'],
      sort: (a, b) => a - b
    },
    {
      label: 'GMB Gained By qMenu',
      paths: ['gmbGainedByQmenu'],
      sort: (a, b) => a - b
    },

    {
      label: 'Current GMB',
      paths: ['published'],
      sort: (a, b) => a - b
    }


  ];

  constructor(private _api: ApiService, private _global: GlobalService) {
  }


  async ngOnInit() {
    this.isSuperUser = ['gary', 'chris', 'mo', 'ivy', 'alan'].indexOf(this._global.user.username) >= 0;
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
    this.result = [];
    const myUsername = this.username;

    // get my restaurants, my invoices, and gmb (gmbBiz --> cids --> gmbAccount locations to get latest status)

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
        salesThreeMonthAverage: 1,
        "googleListing.gmbWebsite": 1,
        web: 1
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

    let gmbBizBatchSize = 3000;
    const gmbBizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          name: 1,
          cid: 1,
          qmenuId: 1,
          gmbWebsite: 1,
          gmbOpen: 1
        },
        skip: gmbBizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      gmbBizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }


    let gmbAccountBatchSize = 100;
    const gmbAccounts = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        query: {
          locations: { $exists: 1 }
        },
        projection: {
          "locations.cid": 1,
          "locations.status": 1,
          "locations.statusHistory": 1
        },
        skip: gmbAccounts.length,
        limit: gmbAccountBatchSize
      }).toPromise();
      gmbAccounts.push(...batch);
      if (batch.length === 0 || batch.length < gmbAccountBatchSize) {
        break;
      }
    }

    const cidLocationMap = {};
    gmbAccounts.map(acct => acct.locations.map(loc => {
      cidLocationMap[loc.cid] = cidLocationMap[loc.cid] || {};
      const gmbOnceOwned = loc.statusHistory.some(h => h.status === 'Published'); // || h.status === 'Suspended');

      const statusOrder = ['Suspended', 'Published'];
      const status = statusOrder.indexOf(cidLocationMap[loc.cid].status) > statusOrder.indexOf(loc.status) ? cidLocationMap[loc.cid].status : loc.status;

      cidLocationMap[loc.cid].status = status;
      cidLocationMap[loc.cid].gmbOnceOwned = cidLocationMap[loc.cid].gmbOnceOwned || gmbOnceOwned;

      // ONLY count location history with at least Published status
      if (loc.statusHistory.some(s => s.status === 'Published')) {
        const firstStatus = cidLocationMap[loc.cid].firstStatus || { time: new Date() };
        const thisLocFirstStatus = loc.statusHistory[loc.statusHistory.length - 1];
        if (thisLocFirstStatus && new Date(thisLocFirstStatus.time) < new Date(firstStatus.time)) {
          cidLocationMap[loc.cid].firstStatus = thisLocFirstStatus;
        }
      }

    }));

    gmbBizList.map(gmbBiz => {
      if (gmbBiz.qmenuId && restaurantRowMap[gmbBiz.qmenuId]) {
        gmbBizIdMap[gmbBiz._id] = gmbBiz;
        const row = restaurantRowMap[gmbBiz.qmenuId];
        const location = cidLocationMap[gmbBiz.cid];

        row.gmbOnceOwned = row.gmbOnceOwned || (location && location.gmbOnceOwned);
        row.firstStatus = location && location.firstStatus;

        row.gmbBiz = gmbBiz;
        row.published = location && location.status === 'Published';
        row.suspended = location && location.status === 'Suspended';

        if (!row.gmbOnceOwned && row.published) {
          console.log(row)
          throw 'ERRROR';
        }
      }
    });

    let invoices = [];
    let skip = 0;
    const limit = 10000;

    while (true) {
      const batchInvoices = (await this._api.get(environment.qmenuApiUrl + 'generic', {
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
          //previousBalance: 1
        },
        skip: skip,
        limit: limit
      }).toPromise()).map(i => new Invoice(i));
      skip += batchInvoices.length;

      invoices.push(...batchInvoices);

      if (batchInvoices.length < limit) {
        break;
      }
    }

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

      const invoiceRequiredCutoffDate = new Date('2019-09-11');
      const invoiceCheckOk = new Date(row.restaurant.createdAt).valueOf() < invoiceRequiredCutoffDate.valueOf() || row.invoices.length > 0;
      row.invoiceCheckOk = invoiceCheckOk;

      row.qualifiedSalesBase = row.gmbOnceOwned && row.invoiceCheckOk ? row.restaurant.salesBase : 0;
      row.qualifiedSalesBonus = row.gmbOnceOwned && row.invoiceCheckOk ? row.restaurant.salesBonus : 0;
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
    const openTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
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

    /*group the sales by month as below
      01/2019 restaurants 29, GMB Gained 10, Current GMB 2
      02/2019 restaurants 30, GMB Gained 11, Current GMB 9
    */


    this.rows.map(row => {
      let month = (new Date(row.restaurant.createdAt)).getMonth() + 1;
      let year = (new Date(row.restaurant.createdAt)).getFullYear();
      let eachListingDate = { month: month.toString() + '/' + year }

      const originIsSales = (row.firstStatus && (['Pending edits', 'Verified', 'Published', 'Suspended', 'Duplicate'].indexOf(row.firstStatus.status) >= 0) || new Date(row.restaurant.createdAt) < new Date('2018-09-6'));
      row.originIsSales = originIsSales;
      if (this.result.some(each => each.month === eachListingDate.month)) {
        this.result.map(each => {
          if (each.month === eachListingDate.month) {
            each.rts = each.rts + 1;
            if (row.gmbOnceOwned) {
              if (originIsSales) {
                each.gmbGainedBySales = each.gmbGainedBySales + 1;
              } else {
                each.gmbGainedByQmenu = each.gmbGainedByQmenu + 1;
              }
            }
            if (row.published) {
              each.published = each.published + 1;
            }
          }
        })
      } else {
        let newItem = { month: eachListingDate.month, rts: 1 };
        newItem["gmbGainedBySales"] = row.gmbOnceOwned && originIsSales ? 1 : 0
        newItem["gmbGainedByQmenu"] = row.gmbOnceOwned && !originIsSales ? 1 : 0
        newItem["published"] = row.published ? 1 : 0;
        this.result.push(newItem);
      }
    });


    this.hadGainedBySalesTotal = this.rows.reduce((sum, a) => sum + (a.gmbOnceOwned || 0) * (a.originIsSales ? 1 : 0), 0);
    this.hadGainedByQmenuTotal = this.rows.reduce((sum, a) => sum + (a.gmbOnceOwned || 0) * (a.originIsSales ? 0 : 1), 0);
    this.currentPublishedTotal = this.rows.reduce((sum, a) => sum + (a.published || 0), 0);


  }

  getTotal(field) {
    return this.rows.reduce((sum, row) => sum + (row[field] || 0), 0);
  }

  isRolledOrPaid(invoice) {
    return invoice.isPaymentCompleted || this.rolledInvoiceIdsSet.has(invoice._id);
  }

}
