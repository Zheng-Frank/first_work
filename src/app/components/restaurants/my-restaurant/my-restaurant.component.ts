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
  disabledTotal = 0;
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
      paths: ['gmbOrigin', 'origin'],
      sort: (a, b) => (+a) - (+b)
    },
    {
      label: 'GMB Origin',
      paths: ['gmbOrigin', 'origin'],
    },
    {
      label: 'Current GMB'
    },
    {
      label: 'Websites'
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
    this.isSuperUser = ['gary', 'chris', 'mo', 'alan'].indexOf(this._global.user.username) >= 0;
    this.username = this._global.user.username;
    this.usernames = [this.username];
    if (this.isSuperUser) {
      const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: {
          "rateSchedules.agent": 1
        }
      }, 6000);
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

  async computeGmbOrigin() {
    const gmbBizList = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        cid: 1,
        qmenuId: 1
      }
    }, 8000);
    console.log(gmbBizList);
    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        "locations.cid": 1,
        "locations.place_id": 1,
        "locations.statusHistory": 1
      }
    }, 80);
    console.log(gmbAccounts);

    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        "name": 1,
        "googleListing.cid": 1,
        "salesBase": 1,
        "salesBonus": 1,
        "salesThreeMonthAverage": 1,
        gmbOrigin: 1
      }
    }, 2000);
    restaurants.sort((r1, r2) => r1.name > r2.name ? 1 : -1);

    const selectedRestaurants = restaurants.filter(rt => !rt.gmbOrigin);
    // selectedRestaurants.length = 600;
    // const selectedRestaurants = restaurants.filter(rt => rt._id === "5cea0f0e2c667c6b2eb45175");

    const gmbOrigins = [];
    selectedRestaurants.map(rt => {

      const createdAt = new Date(parseInt(rt._id.substring(0, 8), 16) * 1000);

      // case 1: restaurant created before 2018-9-6 (we didn't track)
      if (createdAt.valueOf() < new Date('2018-09-6').valueOf()) {
        const gmbOrigin = {
          time: new Date('2018-09-6').toISOString(),
          status: "Published",
          origin: "sales",
          _id: rt._id
        };
        gmbOrigins.push(gmbOrigin);
        return;
      }

      const matchedCids = gmbBizList.filter(biz => biz.qmenuId === rt._id).map(biz => biz.cid);
      const cids = [(rt.googleListing || {}).cid, ...matchedCids].filter(cid => cid);

      // case 1, had Published: if it's also the very first status of ALL, then it's from sales
      let firstPublishedEmail;
      let firstPublishedLocation;

      gmbAccounts.map(account => (account.locations || []).filter(loc => cids.indexOf(loc.cid) >= 0).map(loc => {
        if (loc.statusHistory.some(sh => sh.status === "Published")) {
          const firstPublishedTime = loc.statusHistory.filter(sh => sh.status === "Published").slice(-1)[0].time;
          if (!firstPublishedLocation || new Date(firstPublishedLocation.statusHistory.filter(sh => sh.status === "Published").slice(-1)[0].time).valueOf() > new Date(firstPublishedTime).valueOf()) {
            firstPublishedLocation = loc;
            firstPublishedEmail = account.email;
          }
        }
      }));

      if (firstPublishedLocation) {
        console.log(firstPublishedLocation)
        const gmbOrigin = {
          time: new Date(firstPublishedLocation.statusHistory.filter(sh => sh.status === "Published").slice(-1)[0].time).toISOString(),
          status: "Published",
          firstStatus: firstPublishedLocation.statusHistory.slice(-1)[0].status,
          origin: ["Published", "Suspended"].indexOf(firstPublishedLocation.statusHistory.slice(-1)[0].status) >= 0 ? "sales" : "qMenu",
          cid: firstPublishedLocation.cid,
          place_id: firstPublishedLocation.place_id,
          email: firstPublishedEmail,
          _id: rt._id
        };
        gmbOrigins.push(gmbOrigin);
      }

    });

    console.log(gmbOrigins)
    for (let i = 0; i < gmbOrigins.length; i += 100) {
      const slice = gmbOrigins.slice(i, i + 100);
      const patches = slice.map(gmbOrigin => ({
        old: {
          _id: gmbOrigin._id
        },
        new: {
          _id: gmbOrigin._id,
          gmbOrigin: gmbOrigin
        }
      }));
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', patches).toPromise();
    }

  }


  async computeBonus() {
    // see google doc: https://docs.google.com/spreadsheets/d/1qEVa0rMYZsVZZs0Fpu1ItnaNsYfwt6i51EdQuDt753A/edit#gid=0
    const policiesMap = {
      sam: [
        {
          to: new Date('12/16/2018'),
          base: 150
        },
        {
          from: new Date('1/1/2019'),
          base: 75,
          bonusThresholds: {
            4: 150,
            2: 75,
            1: 50
          }
        },
        {
          from: new Date('9/27/2019'),
          base: 0
        },
      ],

      kevin: [
        {
          to: new Date('7/16/2018'),
          base: 150
        },
        {
          from: new Date('7/17/2018'),
          base: 60,
          bonusThresholds: {
            2: 150,
            1: 50
          }
        },
      ],


      james: [
        {
          to: new Date('6/1/2018'),
          base: 150
        },
        {
          from: new Date('7/1/2018'),
          base: 50,
          bonusThresholds: {
            2: 150,
            1: 50
          }
        },
        {
          from: new Date('4/1/2020'),
          base: 0
        },
      ],

      jason: [
        {
          base: 50,
          bonusThresholds: {
            2: 150,
            1: 50
          }
        },
      ],
      andy: [
        {
          from: new Date('7/1/2018'),
          base: 50,
          bonusThresholds: {
            2: 150,
            1: 50
          }
        },
        {
          to: new Date('6/1/2018'),
          base: 150
        },
      ],

      billy: [
        {
          base: 0
        },
      ],
      mike: [
        {
          base: 150
        }
      ],
      charity: [
        {
          from: new Date('7/1/2018'),
          base: 40,
          bonusThresholds: {
            3: 40
          }
        },
        {
          to: new Date('6/1/2018'),
          base: 80
        },
      ],
    };

    let uncomputedRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        salesBonus: null
      },
      projection: {
        name: 1,
        salesBase: 1,
        rateSchedules: 1,
        createdAt: 1,
        previousRestaurantId: 1
      }      
    }, 6000)

    // uncomputedRestaurants = uncomputedRestaurants.filter(r => r._id === '5b5bfd764f600614008fcff5');

    console.log(uncomputedRestaurants);
    // uncomputedRestaurants.length = 80;
    // update salesBase
    const updatedRestaurantPairs = [];
    for (let r of uncomputedRestaurants) {
      const createdAt = new Date(r.createdAt);
      let updated = false;
      let appliedPolicy;
      if (r.rateSchedules && r.rateSchedules.length > 0) {
        const agent = r.rateSchedules[r.rateSchedules.length - 1].agent;

        const policies = policiesMap[agent] || [];
        for (let i = 0; i < policies.length; i++) {
          const policy = policies[i];
          const from = policy.from || new Date(0);
          const to = policy.to || new Date();
          if (createdAt > from && createdAt < to) {
            appliedPolicy = policy;
            if (r.salesBase !== policy.base) {
              r.salesBase = policy.base;
              updated = true;
              break;
            }
          }
        }
      }
      // compute three month thing!
      if (appliedPolicy && appliedPolicy.bonusThresholds && new Date().valueOf() - createdAt.valueOf() > 3 * 30 * 24 * 3600000) {
        // query orders and apply calculations
        const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'order',
          query: {
            restaurant: { $oid: r._id },
          },
          projection: {
            createdAt: 1
          },
          limit: 500, // 4 * 120 = max 480
          sort: {
            createdAt: 1
          }
        }).toPromise();
        r.salesBonus = 0;
        r.salesThreeMonthAverage = 0;

        if (orders.length > 0) {
          const firstCreatedAt = new Date(orders[0].createdAt);
          let counter = 1;
          const months3 = 90 * 24 * 3600000;
          orders.map(order => {
            if (new Date(order.createdAt).valueOf() - months3 < firstCreatedAt.valueOf()) {
              counter++;
            }
          });
          r.salesThreeMonthAverage = counter / 90.0;

          const thresholds = Object.keys(appliedPolicy.bonusThresholds).map(key => +key);
          thresholds.sort().reverse();
          for (let threshold of thresholds) {
            if (r.salesThreeMonthAverage > threshold) {
              r.salesBonus = appliedPolicy.bonusThresholds[threshold + ''];
              console.log('Found bonus!');
              console.log(r);
              break;
            }
          }
        }
        updated = true;
      }

      if (updated) {

        const newR: any = {
          _id: r._id,
          salesBase: r.salesBase
        };

        if (r.salesBonus !== undefined) {
          newR.salesBonus = r.salesBonus;
        }

        if (r.salesThreeMonthAverage !== undefined) {
          newR.salesThreeMonthAverage = r.salesThreeMonthAverage;
        }

        // 10/11/2019 if there is a previousRestaurantId, and previousRestaurant has the same agent, we clear both salesBase and sales bonus!
        if (r.previousRestaurantId) {
          // const previousRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
          //   resource: 'restaurant',
          //   query: {
          //     _id: { $oid: r.previousRestaurantId }
          //   },
          //   projection: {
          //     name: 1,
          //     rateSchedules: 1,
          //   },
          //   limit: 1
          // }).toPromise();

          // const newRtAgent = (r.rateSchedules[r.rateSchedules.length - 1].agent || '').toLowerCase();
          // const previousRtHasSameAgent = previousRestaurants.some(rt => (rt.rateSchedules || []).some(rs => (rs.agent || '').toLowerCase() === newRtAgent));
          // if (previousRtHasSameAgent) {
          //   newR.salesBase = 0;
          //   newR.salesBonus = 0;
          // }
          newR.salesBase = 0;
          newR.salesBonus = 0;
        }

        updatedRestaurantPairs.push({
          old: {
            _id: r._id
          },
          new: newR
        });
      }
    }; // end for each restaurant

    console.log(updatedRestaurantPairs);

    if (updatedRestaurantPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedRestaurantPairs).toPromise();
    }

  }


  changeUser() {
    this.populate();
  }

  async populate() {
    this.result = [];
    const myUsername = this.username;
    this.disabledTotal = 0;
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
        disabled: 1,
        createdAt: 1,
        rateSchedules: 1,
        salesBase: 1,
        salesBonus: 1,
        salesThreeMonthAverage: 1,
        "googleListing.gmbWebsite": 1,
        web: 1,
        gmbOrigin: 1
      },
      limit: 60000
    }).toPromise();

    const restaurantRowMap = {};

    this.rows = myRestaurants.map(r => {
      const row = {
        restaurant: new Restaurant(r),
        invoices: [],
        showDetails: false
      };
      restaurantRowMap[r._id] = row;
      if (r.disabled) {
        this.disabledTotal++;
      }
      return row;
    });


    const gmbBizList = await await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        cid: 1,
        qmenuId: 1,
        gmbWebsite: 1,
        gmbOpen: 1
      }
    }, 6000);


    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        "locations.cid": 1,
        "locations.status": 1
      }
    }, 200);

    const cidLocationMap = {};
    gmbAccounts.map(acct => acct.locations.map(loc => {
      cidLocationMap[loc.cid] = cidLocationMap[loc.cid] || {};

      const statusOrder = ['Suspended', 'Published'];
      const status = statusOrder.indexOf(cidLocationMap[loc.cid].status) > statusOrder.indexOf(loc.status) ? cidLocationMap[loc.cid].status : loc.status;

      cidLocationMap[loc.cid].status = status;

    }));

    gmbBizList.map(gmbBiz => {
      if (gmbBiz.qmenuId && restaurantRowMap[gmbBiz.qmenuId]) {
        const row = restaurantRowMap[gmbBiz.qmenuId];
        const location = cidLocationMap[gmbBiz.cid];

        row.gmbBiz = gmbBiz;
        row.published = location && location.status === 'Published';
        row.suspended = location && location.status === 'Suspended';

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
          adjustment: 1,
          transactionAdjustment: 1,
          createdAt: 1,
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

    this.rows.map(row => row.collected = row.invoices.reduce((sum, invoice) => {
      const commisionAdjustment = invoice.adjustment - invoice.transactionAdjustment;
      return sum + (invoice.paid ? (invoice.commission - commisionAdjustment) : 0);
    }, 0));

    this.rows.map(row => row.notCollected = row.invoices.reduce((sum, invoice) => {
      const commisionAdjustment = invoice.adjustment - invoice.transactionAdjustment;
      return sum + (invoice.paid ? 0 : (invoice.commission - commisionAdjustment));
    }, 0));

    this.rows.map(row => {
      row.commission = row.restaurant.rateSchedules[row.restaurant.rateSchedules.length - 1].commission || 0;
      // row.adjustment = row.restaurant.rateSchedules[row.restaurant.rateSchedules.length - 1].commission || 0;
      row.rate = row.restaurant.rateSchedules[row.restaurant.rateSchedules.length - 1].rate || 0;

      row.fixed = row.restaurant.rateSchedules[row.restaurant.rateSchedules.length - 1].fixed || 0;

      row.earned = row.commission * row.collected;
      row.notEarned = row.commission * row.notCollected;

      const invoiceRequiredCutoffDate = new Date('2019-09-11');
      const invoiceMustPayCutoffDate = new Date('2020-02-19');
      //const invoiceCheckOk = new Date(row.restaurant.createdAt).valueOf() < invoiceRequiredCutoffDate.valueOf() || row.invoices.length > 0;
      const veryOldRestaurant = new Date(row.restaurant.createdAt).valueOf() < invoiceRequiredCutoffDate.valueOf();
      const havingPaid = row.invoices.some(i => i.isPaymentCompleted);
      const beforeMustPayOk = row.invoices.some(i => new Date(i.createdAt).valueOf() < invoiceMustPayCutoffDate.valueOf());

      const invoiceCheckOk = veryOldRestaurant || havingPaid || beforeMustPayOk;

      row.invoiceCheckOk = invoiceCheckOk;

      row.qualifiedSalesBase = row.restaurant.gmbOrigin && (new Date(row.restaurant.gmbOrigin.time) < new Date('2020-01-15') || row.restaurant.gmbOrigin.origin === "sales") && row.invoiceCheckOk ? row.restaurant.salesBase : 0;
      // for bonus, we don't care if gmb's origin
      row.qualifiedSalesBonus = row.restaurant.gmbOrigin && row.invoiceCheckOk ? row.restaurant.salesBonus : 0;
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



    /*group the sales by month as below
      01/2019 restaurants 29, GMB Gained 10, Current GMB 2
      02/2019 restaurants 30, GMB Gained 11, Current GMB 9
    */


    this.rows.map(row => {
      let month = (new Date(row.restaurant.createdAt)).getMonth() + 1;
      let year = (new Date(row.restaurant.createdAt)).getFullYear();
      let eachListingDate = { month: month.toString() + '/' + year }

      if (this.result.some(each => each.month === eachListingDate.month)) {
        this.result.map(each => {
          if (each.month === eachListingDate.month) {
            each.rts = each.rts + 1;
            if (row.restaurant.gmbOrigin && row.restaurant.gmbOrigin.origin === "sales") {
              each.gmbGainedBySales = each.gmbGainedBySales + 1;
            }
            if (row.restaurant.gmbOrigin && row.restaurant.gmbOrigin.origin === "qMenu") {
              each.gmbGainedByQmenu = each.gmbGainedByQmenu + 1;
            }
            if (row.published) {
              each.published = each.published + 1;
            }
          }
        })
      } else {
        let newItem = { month: eachListingDate.month, rts: 1 };
        newItem["gmbGainedBySales"] = row.restaurant.gmbOrigin && row.restaurant.gmbOrigin.origin === "sales" ? 1 : 0
        newItem["gmbGainedByQmenu"] = row.restaurant.gmbOrigin && row.restaurant.gmbOrigin.origin === "qMenu" ? 1 : 0
        newItem["published"] = row.published ? 1 : 0;
        this.result.push(newItem);
      }
    });
    this.hadGainedBySalesTotal = this.rows.reduce((sum, a) => sum + ((a.restaurant.gmbOrigin || {}).origin === "sales" ? 1 : 0), 0);
    this.hadGainedByQmenuTotal = this.rows.reduce((sum, a) => sum + ((a.restaurant.gmbOrigin || {}).origin === "qMenu" ? 1 : 0), 0);
    this.currentPublishedTotal = this.rows.reduce((sum, a) => sum + (a.published || 0), 0);


  }

  getTotal(field) {
    return this.rows.reduce((sum, row) => sum + (row[field] || 0), 0);
  }

  isRolledOrPaid(invoice) {
    return invoice.isPaymentCompleted || this.rolledInvoiceIdsSet.has(invoice._id);
  }

}
