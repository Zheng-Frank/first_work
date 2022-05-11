import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Hour, Order, TimezoneHelper } from '@qmenu/ui'

@Component({
  selector: 'app-monitoring-unconfirmed-orders',
  templateUrl: './monitoring-unconfirmed-orders.component.html',
  styleUrls: ['./monitoring-unconfirmed-orders.component.css']
})
export class MonitoringUnconfirmedOrdersComponent implements OnInit {

  rtDict = {};
  rows = [];
  // Rows that only contain qMenu Collect payments
  qmenuRows = [];
  allRows = [];
  now = new Date();
  descending = true;
  showOnlyQmenuCollected = false;


  constructor(private _api: ApiService, private _global: GlobalService) { }

  handleArrow() {
    this.descending = !this.descending

    if (this.descending) {
      this.rows = this.rows.sort((a, b) => a.totalSum - b.totalSum)
    } else {
      this.rows = this.rows.sort((a, b) => b.totalSum - a.totalSum)
    }

  }

  async ngOnInit() {
    await this.getRTs();
    await this.query();
    setInterval(() => { this.now = new Date(); }, 60000);
  }

  convertTZ(date, tzString) {
    return new Date(date)
    // return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
  }


  parseMillisecondsIntoReadableTime(milliseconds) {
    //Get hours from milliseconds
    var hours = milliseconds / (1000 * 60 * 60);
    var absoluteHours = Math.floor(hours);
    var h = absoluteHours > 9 ? absoluteHours : '0' + absoluteHours;

    //Get remainder from hours and convert to minutes
    var minutes = (hours - absoluteHours) * 60;
    var absoluteMinutes = Math.floor(minutes);
    var m = absoluteMinutes > 9 ? absoluteMinutes : '0' + absoluteMinutes;

    //Get remainder from minutes and convert to seconds
    var seconds = (minutes - absoluteMinutes) * 60;
    var absoluteSeconds = Math.floor(seconds);
    var s = absoluteSeconds > 9 ? absoluteSeconds : '0' + absoluteSeconds;


    return h + ':' + m + ':' + s;
  }


  renderRestaurants(type) {
    // this.currentCriteria = type
    if (type === 'All') {
      this.rows = this.allRows

    } else if (type === 'QMENU COLLECT') {
      this.rows = this.qmenuRows
    } else {
      this.rows = this.allRows
      console.log("NO TYPE")
    }
    // this.rows = this.rows.sort((a, b) => a.totalAmount - b.totalAmount)
    // console.log("NEW ROWS ", this.rows)
  }

  async getRTs() {
    let rts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {},
      projection: {
        name: 1,
        channels: 1,
        preferredLanguage: 1,
        'menus.hours': 1,
        closedHours: 1,
        'googleAddress.timezone': 1,
        SkipOrderConfirmation: 1,
        pickupTimeEstimate: 1,
        deliveryTimeEstimate: 1,
      }
    }).toPromise();

    rts.forEach(rt => {
      rt.menus.forEach(m => {
        m.hours = m.hours.map(h => new Hour(h))
      })
      this.rtDict[rt._id] = rt;
    });
  }

  async query() {
    const start = new Date(), end = new Date();
    start.setHours(start.getHours() - 4);
    end.setMinutes(end.getMinutes() - 10);
    const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      aggregate: [
        {
          $match: {
            $or: [
              {createdAt: {$lt: {$date: end},$gt: {$date: start}}},
              {timeToDeliver: {$gt: {$date: start}}},
            ]
          }
        },
        {
          $project: {
            orderNumber: 1,
            restaurant: 1,
            orderItems: 1,
            type: 1,
            "paymentObj.method": 1,
            "paymentObj.paymentType": 1,
            timeToDeliver: 1,
            timeToDeliverEstimate: 1,
            status: {
              $last: {
                  $map: {
                      input: "$statuses",
                      as: "st",
                      in: "$$st.status"
                  }
              }
            },
            createdAt: 1,
          }
        },
        {
          $match: {status: "SUBMITTED"}
        },
        {
          $sort: {createdAt: -1}
        }
      ],
      limit: 100000
    }).toPromise()

    console.log('orders...', orders);

    this.rows = [];

    orders.forEach(order => {
      let rt = this.rtDict[order.restaurant];
      if (!rt) return;
      // skip orders with RT skip confirmation
      if (rt.SkipOrderConfirmation) {
        return;
      }
      // 1. non-scheduled
      if (!order.timeToDeliver) {
        this.rows.push(order);
        return;
      }
      let { googleAddress: {timezone}, menus, pickupTimeEstimate, deliveryTimeEstimate } = rt;

      // 2. scheduled
      order.timeToDeliver = new Date(order.timeToDeliver);
      let prepareMinutes = pickupTimeEstimate || 15;
      if (order.type === 'DELIVERY') {
        prepareMinutes == deliveryTimeEstimate || 45;
      }
      let shouldConfirmTime = new Date(order.timeToDeliver);
      shouldConfirmTime.setMinutes(shouldConfirmTime.getMinutes() - prepareMinutes);
      // check if time in RT's open hours
      let inOpenTime = menus.some(m => (m.hours || []).some(hour => hour.isOpenAtTime(shouldConfirmTime, timezone)))

      let closedHours = (rt.closedHours || []).filter(hour => !(hour.toTime && shouldConfirmTime.valueOf() > hour.toTime));

      inOpenTime = inOpenTime && !closedHours.some(hour => {
        let tzTime = TimezoneHelper.getTimezoneDateFromBrowserDate(shouldConfirmTime, timezone);
        return tzTime >= hour.fromTime && tzTime <= hour.toTime;
      });

      if (inOpenTime) {
        this.rows.push(order);
        return;
      }

      // check if RT is open and over time to confirm now.
      // eg. Pickup order scheduled for 12:10PM. RT open time is 12:00PM.
      // RT’s estimated time to prepare pickup orders is 15 minutes.
      // Instead of 11:55AM as the order confirmation deadline (which is before RT even opens),
      // we go with the second option of RT open time+5 mins = 12:05PM.

      let most_close_open_time, min_gap = Number.MAX_SAFE_INTEGER;
      let today = shouldConfirmTime.getDay();
      rt.menus.forEach(m => {
        (m.hours || []).forEach(h => {

          const timePart = h.fromTime.toLocaleString('en-US', {timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'});
          const weekday = h.fromTime.toLocaleString('en-US', {timeZone: timezone, weekday: 'long'}); // Sunday, ....
          let openTime;
          switch(h.ocurrence) {
            case "YEARLY":
              openTime = Hour.projectTimeToYearlyTarget(h.fromTime, shouldConfirmTime.getFullYear(), timezone);
              break;
            case "MONTHLY":
              openTime = Hour.projectTimeToMonthlyTarget(h.fromTime, shouldConfirmTime.getFullYear(), shouldConfirmTime.getMonth(), timezone);
              break;
            case "ONE-TIME":
              openTime = new Date(h.fromTime);
              break;
            case "WEEKLY":
            default:
              if (weekday !== today) {
                return;
              }
              openTime = Hour.projectTimeToWeeklyTarget(h.fromTime, h.fromTime, timezone);
              break;
          }
          let diff = openTime.valueOf() - shouldConfirmTime.valueOf();
          if (diff < min_gap) {
            most_close_open_time = openTime;
            min_gap = diff;
          }
        })
      });



    });


    let totalSumRows = this.allRows.map(row => {
      let orders = row.orders
      console.log("ORDERS ", orders)
      let sum = 0
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].total) {
          sum += orders[i].total
        }
      }
      row.totalSum = sum
      return row
    })

    console.log("TOTAL SUM ROWS ", totalSumRows)


    this.qmenuRows = this.rows.filter(row => {
      let orders = row.orders
      if (orders) {
        return orders.some(order => order.payment.method === 'QMENU')
      } else {
        return false
      }
    })

    console.log("FINAL ROWS ", this.rows)
  }


  getTimes(order, row) {

    // console.log("HERES ALL THE PROPERTIES ", properties)

    let fields = order.order
    let timezone = row.timezone

    if (!fields) {
      console.log("FIELDS ARE EMPTY")
    }
    if (fields.timeToDeliver) {



      // if (!fields.createdAt) {
      //   return "MISSING DATE!"
      // }

      let createdAt = this.convertTZ(fields.createdAt, timezone)

      console.log("CREATED AT TIMING ", createdAt, fields.createdAt, timezone)

      let confirmBy: any

      if (fields.type.toLowerCase() === 'delivery') {
        // console.log("ORDER IS DELIVERY")

        row.deliveryTimeEstimate = row.deliveryTimeEstimate ? row.deliveryTimeEstimate : 45

        confirmBy = new Date(new Date(fields.timeToDeliver).getTime() - (row.deliveryTimeEstimate * 60 * 1000))

      } else if (fields.type.toLowerCase() === 'pickup') {
        // console.log("ORDER IS PICK UP")
        row.pickupTimeEstimate = row.pickupTimeEstimate ? row.pickupTimeEstimate : 15

        confirmBy = new Date(new Date(fields.timeToDeliver).getTime() - (row.pickupTimeEstimate * 60 * 1000))


      } else {
        // Dine in order
        confirmBy = new Date(new Date(fields.timeToDeliver).getTime() - (15 * 60 * 1000))
        console.log("ORDER NOT REGISTED AS PICK UP DELIVERY OR PICKUP")
      }

      let expectedDeliverTime = this.convertTZ(fields.timeToDeliver, timezone)
      confirmBy = this.convertTZ(confirmBy, timezone)

      let overnightOrder = false
      if (new Date(fields.timeToDeliver).getTime() - new Date(fields.createdAt).getTime() > (8 * 60 * 60 * 1000)) {
        overnightOrder = true
      }

      let lateTime = this.parseMillisecondsIntoReadableTime(new Date(this.now.getTime() - new Date(confirmBy).getTime()).getTime())

      let oneHourOverdue = false
      if (new Date(this.now.getTime() - new Date(confirmBy).getTime()).getTime() > 60 * 60 * 1000) {
        oneHourOverdue = true
      }

      let scheduledString = `Scheduled for ${expectedDeliverTime.toLocaleString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`
      let placedAtString = `${this.capitalizeFirstLetter(fields.type.toString().toLowerCase())} order placed at ${createdAt.toLocaleString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`

      let confirmByString = overnightOrder ? `Confirm by ${new Date(confirmBy).toLocaleString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })} (Late by ${lateTime} minutes) (order placed yesterday)` : `Confirm by ${new Date(confirmBy).toLocaleString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })} (Late by ${lateTime})`

      if (oneHourOverdue) {
        return {
          texts: [scheduledString, placedAtString, confirmByString],
          overdue: true
        }
      } else {
        return {
          texts: [scheduledString, placedAtString, confirmByString],
          overdue: false
        }
      }


    } else {
      if (fields.createdAt) {

        let startTime = this.convertTZ(fields.createdAt, timezone)
        let expectedConfirmation: any = new Date(startTime.getTime()).setMinutes(startTime.getMinutes() + 10)

        let lateTime = this.parseMillisecondsIntoReadableTime(new Date(this.now.getTime() - new Date(expectedConfirmation).getTime()).getTime())


        let oneHourOverdue = false
        if (new Date(this.now.getTime() - new Date(expectedConfirmation).getTime()).getTime() > 60 * 60 * 1000) {
          oneHourOverdue = true
        }

        expectedConfirmation = new Date(expectedConfirmation).toLocaleString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' });



        // console.log(lateTime)

        return {
          texts: [`${this.capitalizeFirstLetter(fields.type)} order at ${startTime.toLocaleString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`, `Confirm by ${expectedConfirmation}. (Late by ${lateTime})`],
          overdue: oneHourOverdue
        }


      }

    }

  }

  getOrderTimeForTimeZone(createdAt, timeZone) {
    let time = this.convertTZ(createdAt, timeZone)
    return time
  }

  showChannel(channels) {

    if (channels.type.toLowerCase() == 'email') {
      return false
    }

    return (channels && channels.notifications && channels.notifications.includes('Business'))
  }

  getDaysFromId(mongoId) {
    return Math.floor((this.now.valueOf() - parseInt(mongoId.substring(0, 8), 16) * 1000) / (24 * 3600000));
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

}
