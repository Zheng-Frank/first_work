import {Component, OnInit} from '@angular/core';
import {Restaurant, TimezoneHelper} from '@qmenu/ui';
import {ApiService} from '../../../services/api.service';
import {environment} from '../../../../environments/environment';
import {GlobalService} from '../../../services/global.service';
import {Invoice} from 'src/app/classes/invoice';
import {Helper} from '../../../classes/helper';

@Component({
  selector: 'app-my-restaurant',
  templateUrl: './my-restaurant.component.html',
  styleUrls: ['./my-restaurant.component.css']
})
export class MyRestaurantComponent implements OnInit {

  teamUsers = [];
  rows = [];
  now = new Date();
  disabledTotal = 0;
  result;
  hadGainedBySalesTotal;
  hadGainedByQmenuTotal;

  currentPublishedTotal;

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
        // return new Date(a[1], a[0]) > new Date(b[1], b[0])
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

  gmbBizList = [];
  cidLocationMap = {};
  invoices = [];

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  /**
   * 1. Gary, Chris, Mo, Dixon,: Can see ALL info on Me page for ALL people,.
     2. Each person can see ALL info about THEMSELVES
     3. ADMIN, CSR_MANAGER can see ALL NON-DOLLAR info about ALL people
    4. MARKETER_MANAGER can see ALL info about people who they supervised.
   *
  */
  canSeeMoneySection() {
    if (this.username === this._global.user.username || this.isSuperUser() || (this.isMarketerManagerWithTeam() && this.teamUsers.includes(this.username))) {
      return true;
    }
    return false;
  }

  isSuperUser() {
    return ['gary', 'chris', 'mo', 'dixon.adair'].includes(this._global.user.username);
  }

  isMarketerManagerWithTeam() {
    return this._global.user.roles.includes('MARKETER_MANAGER') && this.teamUsers.length > 0;
  }

  isAdminCSRManagerWithTeam() {
    return ['ADMIN', 'CSR_MANAGER'].some(role => this._global.user.roles.includes(role));
  }

  async getTeamUsers() {
    const users = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "user",
      aggregate: [
        {
          $graphLookup: {
            from: "user",
            startWith: "$manager",
            connectFromField: "manager",
            connectToField: "username",
            as: "leaders"
          }
        },
        { $match: { "leaders.username": { $eq: this._global.user.username } } },
        { $project: { username: 1 } }
      ]
    }).toPromise();
    this.teamUsers = users.map(x => x.username);
  }

  async ngOnInit() {
    this.username = this._global.user.username;
    this.usernames = [this.username];
    if (this._global.user.roles.includes('MARKETER_MANAGER')) {
      await this.getTeamUsers();
    }
    if (this.isSuperUser() || this.isMarketerManagerWithTeam() || this.isAdminCSRManagerWithTeam()) {
      const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: { "rateSchedules.agent": 1 }
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
      if (this.isMarketerManagerWithTeam() && !this.isAdminCSRManagerWithTeam() && !this.isSuperUser()) {
        this.usernames = this.usernames.filter(x => this.teamUsers.includes(x));
        // add current user himself
        this.usernames.unshift(this._global.user.username);
      }
      this.usernames.sort((a, b) => (a || '').localeCompare((b || '')));
    }
    await this.gmbQuery();
    await this.invoiceQuery();
    await this.populate();
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
        const nonAgents = ['none', 'auto', 'AUTO', 'random_name', 'qmenu', 'invalid', 'no-gmb'];
        let sorted = r.rateSchedules.filter(x => x.agent && !nonAgents.includes(x.agent)).sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());
        let agent = (sorted[0] || {}).agent;
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

  async gmbQuery() {
    this.gmbBizList = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        cid: 1,
        qmenuId: 1,
        gmbWebsite: 1,
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
    this.cidLocationMap = cidLocationMap;
  }

  async invoiceQuery() {
    let invoices = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        isCanceled: { $ne: true }
      },
      projection: {
        isCanceled: 1,
        commission: 1,
        feesForQmenu: 1,
        fromDate: 1,
        toDate: 1,
        isPaymentCompleted: 1,
        "restaurant.id": 1,
        previousInvoiceId: 1,
        adjustment: 1,
        transactionAdjustment: 1,
        createdAt: 1,
        // previousBalance: 1,
        adjustments: 1
      }
    }, 10000);
    this.invoices = invoices.map(i => new Invoice(i));
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
        "googleAddress.timezone": 1,
        disabled: 1,
        createdAt: 1,
        rateSchedules: 1,
        feeSchedules: 1,
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

    this.gmbBizList.map(gmbBiz => {
      if (gmbBiz.qmenuId && restaurantRowMap[gmbBiz.qmenuId]) {
        const row = restaurantRowMap[gmbBiz.qmenuId];
        const location = this.cidLocationMap[gmbBiz.cid];

        row.gmbBiz = gmbBiz;
        row.published = location && location.status === 'Published';
        row.suspended = location && location.status === 'Suspended';

      }
    });

    let invoices = this.invoices.filter(i => !i.isCanceled).filter(i => restaurantRowMap[i.restaurant.id]);
    const invoiceMap = {};
    invoices.forEach(i => {
      restaurantRowMap[i.restaurant.id].invoices.push(i);
      invoiceMap[i._id] = i;
    });

    this.rolledInvoiceIdsSet = new Set(invoices.filter(invoice => invoice.previousInvoiceId).map(invoice => invoice.previousInvoiceId));

    // make invoice as finally collected (if an invoice's paid, its rolled ancestors are also paid):
    const markAncestorsAsCollected = function (invoice) {
      if (invoice.previousInvoiceId) {
        const previousInvoice = invoiceMap[invoice.previousInvoiceId];
        if (previousInvoice) {
          previousInvoice.paid = true;
          markAncestorsAsCollected(previousInvoice);
        } else {
          console.log('Not found previous invoice!', invoice);
        }
      }
    }

    invoices.forEach(invoice => {
      if (invoice.isPaymentCompleted) {
        invoice.paid = true;
        markAncestorsAsCollected(invoice);
      }
    });

    this.rows.forEach(row => {
      this.calculateRowCommission(row);
      row.rate = row.restaurant.rateSchedules[row.restaurant.rateSchedules.length - 1].rate || 0;
      row.fixed = row.restaurant.rateSchedules[row.restaurant.rateSchedules.length - 1].fixed || 0;

      const invoiceRequiredCutoffDate = new Date('2019-09-11');
      const invoiceMustPayCutoffDate = new Date('2020-02-19');
      // const invoiceCheckOk = new Date(row.restaurant.createdAt).valueOf() < invoiceRequiredCutoffDate.valueOf() || row.invoices.length > 0;
      const veryOldRestaurant = new Date(row.restaurant.createdAt).valueOf() < invoiceRequiredCutoffDate.valueOf();
      const havingPaid = row.invoices.some(i => i.isPaymentCompleted);
      const beforeMustPayOk = row.invoices.some(i => new Date(i.createdAt).valueOf() < invoiceMustPayCutoffDate.valueOf());

      row.invoiceCheckOk = veryOldRestaurant || havingPaid || beforeMustPayOk;

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

  getCommissionPeriods(feeSchedules, rateSchedules, timezone) {
    // periods: [{rate: 0.1, start: '2020-01-01', end: '2020-03-04'}, ...]
    let periods = this.commissionByRateSchedules(rateSchedules, timezone);
    if (feeSchedules && feeSchedules.length) {
      periods = this.commissionByFeeSchedules(feeSchedules, timezone);
    }
    let limit;
    periods.sort((a, b) => b.start.valueOf() - a.start.valueOf()).forEach(x => {
      if (limit && !x.end) {
        limit.setDate(limit.getDate() - 1);
        x.end = limit
      }
      limit = new Date(x.start)
    })
    return periods;
  }

  commissionByFeeSchedules(schedules, timezone) {
    return schedules.filter(x => x.chargeBasis.toLowerCase() === 'commission')
      .map(({fromTime, toTime, rate, payee}) => {
        return {
          start: TimezoneHelper.getTimezoneDateFromBrowserDate(fromTime, timezone),
          rate: (this.username === payee ? rate : 0) || 0,
          end: toTime ? TimezoneHelper.getTimezoneDateFromBrowserDate(toTime, timezone) : undefined
        }
      })
  }

  commissionByRateSchedules(schedules, timezone) {
    // should exclude non-agent's schedule
    let nonAgents = ['none', 'auto', 'AUTO', 'random_name', 'qmenu', 'invalid', 'no-gmb'];
    return schedules.filter(x => x.agent && !nonAgents.includes(x.agent))
      .map(({date, agent, commission}) => ({
        start: TimezoneHelper.parse(date, timezone), rate: (agent === this.username ? commission : 0) || 0
      }));
  }

  calculateRowCommission(row) {
    row.collected = 0;
    row.notCollected = 0;
    row.earned = 0;
    row.notEarned = 0;
    let { rateSchedules, feeSchedules, googleAddress: { timezone } } = row.restaurant;
    let periods = this.getCommissionPeriods(feeSchedules, rateSchedules, timezone);
    let latest = periods[0] || { commission: 0 };
    row.commission = latest.commission || 0;
    row.invoices.forEach(invoice => {
      // calculate commission
      let { orders,  adjustments} = invoice;
      (orders || []).forEach(order => {
        // based on feesForQmenu and commission
        let temp = this.getFeesForQmenu(order) + this.getOrderCommission(order, feeSchedules);

        let orderDate = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(order.createdAt), timezone).valueOf();
        let period = periods.find(p => {
          return orderDate >= p.start.valueOf() && (!p.end || orderDate <= p.end.valueOf())
        });
        if (period) {
          let { rate } = period;
          if (invoice.paid) {
            row.collected += temp
            row.earned += temp * rate;
          } else {
            row.notCollected += temp;
            row.notEarned += temp * rate;
          }
        }
      });
      // calculate adjustments
      (adjustments || []).forEach(({type, time, amount}) => {
        if (!time) {
          return;
        }
        let adjustTime = TimezoneHelper.getTimezoneDateFromBrowserDate(time, timezone).valueOf()
        let period = periods.find(p => {
          return adjustTime >= p.start.valueOf() && (!p.end || adjustTime <= p.end.valueOf())
        });
        let temp = +(+amount).toFixed(2) || 0;
        if (type === 'TRANSACTION') {
          temp *= -1;
        }
        if (period) {
          let { rate } = period;
          if (invoice.paid) {
            row.collected -= temp
            row.earned -= temp * rate;
          } else {
            row.notCollected -= temp;
            row.notEarned -= temp * rate;
          }
        }
      })
    });
  }

  getFeesForQmenu(order) {
    if (order.canceled) {
      return 0;
    }
    return Helper.roundDecimal((order.fees || []).reduce((a, c) => a + (c.payee === 'QMENU' ? c.total : 0), 0))
  }

  getOrderCommission(order, feeSchedules) {
    if (order.canceled) {
      return 0;
    }
    let commission = (+order.rate || 0) * +order.subtotal + (order.fixed || 0);        // default
    // under which condition, we think we should ignore the rate and fixed and use feeSchedules??
    if (feeSchedules /*&& feeSchedules.some(fs => fs.payee === 'QMENU' && fs.payer === 'RESTAURANT')*/) {
      commission = 0;
      const orderDate = new Date(order.createdAt);
      feeSchedules.forEach(fs => {
        const inFuture = new Date(fs.fromTime) > orderDate;
        const inPast = new Date(fs.toTime) < orderDate;
        const typesOk = !fs.orderTypes || fs.orderTypes.length === 0 || fs.orderTypes.indexOf(order.type) >= 0;
        const paymentMethodsOk = !fs.orderPaymentMethods || fs.orderPaymentMethods.length === 0 || fs.orderPaymentMethods.indexOf(order.paymentType) >= 0;
        const chargeBasisOk = fs.chargeBasis !== 'MONTHLY';
        const payerPayeeOk = fs.payer === 'RESTAURANT' && fs.payee === 'QMENU';
        if (!inFuture && !inPast && typesOk && paymentMethodsOk && payerPayeeOk && chargeBasisOk) {
          // ASSUMING SUBTOTAL calculation
          commission += (fs.chargeBasis === 'ORDER_TOTAL' ? order.total : order.subtotal) * (fs.rate || 0) + (fs.amount || 0);
        }
      });
    }
    return Helper.roundDecimal(commission);
  }


  getTotal(field) {
    return this.rows.reduce((sum, row) => sum + (row[field] || 0), 0);
  }

  isRolledOrPaid(invoice) {
    return invoice.isPaymentCompleted || this.rolledInvoiceIdsSet.has(invoice._id);
  }

}
