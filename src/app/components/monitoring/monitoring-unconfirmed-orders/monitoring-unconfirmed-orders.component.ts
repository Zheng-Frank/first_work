import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Hour, TimezoneHelper } from '@qmenu/ui';
import { Helper } from 'src/app/classes/helper';

const to_local_time = (datetime, timeZone) => {
  return new Date(datetime).toLocaleString('en-US', { timeZone, hour: 'numeric', hour12: true, minute: 'numeric' })
}

const readable_ms = (ms) => {
  let hours = Math.floor(ms / (1000 * 60 * 60));
  ms = ms - (1000 * 60 * 60) * hours;
  let minutes = Math.floor(ms / (1000 * 60));
  ms = ms - minutes * 1000 * 60;
  let seconds = Math.floor(ms / 1000);

  return [Helper.padNumber(hours), Helper.padNumber(minutes), Helper.padNumber(seconds)].join(':');
}

@Component({
  selector: 'app-monitoring-unconfirmed-orders',
  templateUrl: './monitoring-unconfirmed-orders.component.html',
  styleUrls: ['./monitoring-unconfirmed-orders.component.css']
})
export class MonitoringUnconfirmedOrdersComponent implements OnInit {

  rtDict = {};
  rows = [];
  now = new Date();
  descending = true;
  showOnlyQmenuCollected = false;
  orders = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.getRTs();
    await this.query();
    this.reorg();
    setInterval(() => { this.now = new Date(); }, 60000);
  }

  async getRTs() {
    let rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: {$ne: true}
      },
      projection: {
        name: 1,
        channels: 1,
        preferredLanguage: 1,
        'menus.hours': 1,
        closedHours: 1,
        'googleAddress.timezone': 1,
        'googleAddress.formatted_address': 1,
        skipOrderConfirmation: 1,
        pickupTimeEstimate: 1,
        deliveryTimeEstimate: 1,
      }
    }, 2000);

    rts.forEach(rt => {
      (rt.menus || []).forEach(m => {
        m.hours = (m.hours || []).map(h => new Hour(h))
      })
      this.rtDict[rt._id] = rt;
    });
  }

  async query() {
    const start = new Date(), end = new Date();
    start.setHours(start.getHours() - 10);
    end.setMinutes(end.getMinutes() - 10);
    const earlier = new Date();
    earlier.setDate(earlier.getDate() - 2);
    const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      aggregate: [
        {
          $match: {
            $and: [
              {createdAt: {$lt: {$date: end}}},
              {createdAt: {$gt: {$date: earlier}}}
            ]
          }
        },
        {
          $match: {
            $or: [
              {
                $and: [
                  {createdAt: {$lt: {$date: end}}},
                  {createdAt: {$gt: {$date: start}}},
                  {timeToDeliver: {$exists: false}}
                ]
              },
              {timeToDeliver: {$gt: {$date: start}}}
            ]
          }
        },
        {
          $project: {
            orderNumber: 1,
            restaurant: 1,
            type: 1,
            total: '$computed.total',
            "paymentObj.method": 1,
            "paymentObj.paymentType": 1,
            timeToDeliver: 1,
            timeToDeliverEstimate: 1,
            status: {
              $arrayElemAt: [{
                  $map: {
                      input: "$statuses",
                      as: "st",
                      in: "$$st.status"
                  }
              }, -1]
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
      limit: 10
    }).toPromise()

    console.log('orders...', orders);

    this.orders = [];

    orders.forEach(order => {
      let rt = this.rtDict[order.restaurant];
      if (!rt) return;
      // skip orders with RT skip confirmation
      if (rt.skipOrderConfirmation) {
        return;
      }
      // 1. non-scheduled
      if (!order.timeToDeliver) {
        let shouldConfirmTime = new Date(order.createdAt);
        // for non-scheduled order, should confirm in 10 mins after created
        shouldConfirmTime.setMinutes(shouldConfirmTime.getMinutes() + 10);
        order.shouldConfirmTime = shouldConfirmTime;
        this.orders.push(order);
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
        order.shouldConfirmTime = shouldConfirmTime;
        this.orders.push(order);
        return;
      }

      // check if RT is open and over time to confirm now.
      // eg. Pickup order scheduled for 12:10PM. RT open time is 12:00PM.
      // RT’s estimated time to prepare pickup orders is 15 minutes.
      // Instead of 11:55AM as the order confirmation deadline (which is before RT even opens),
      // we go with the second option of RT open time+5 mins = 12:05PM.

      let nearby_opent_time, min_gap = Number.MAX_SAFE_INTEGER;
      let today = shouldConfirmTime.toLocaleString('en-US', {timeZone: timezone, weekday: 'long'}),
          year = shouldConfirmTime.getFullYear(),
          month = shouldConfirmTime.getMonth();
      (rt.menus || []).forEach(m => {
        (m.hours || []).forEach(h => {
          const weekday = h.fromTime.toLocaleString('en-US', {timeZone: timezone, weekday: 'long'}); // Sunday, ....
          // get datetime for confirm
          let openTime = new Date(h.fromTime);
          switch(h.ocurrence) {
            case "YEARLY":
              openTime.setFullYear(year);
              break;
            case "MONTHLY":
              openTime.setFullYear(year, month);
              break;
            case "ONE-TIME":
              break;
            case "WEEKLY":
            default:
              if (weekday !== today) {
                return;
              }
              openTime.setFullYear(year, month, shouldConfirmTime.getDate());
              break;
          }
          // if in closed hours, skip
          if (closedHours.some(hour => {
            let tzTime = TimezoneHelper.getTimezoneDateFromBrowserDate(shouldConfirmTime, timezone);
            return tzTime >= hour.fromTime && tzTime <= hour.toTime;
          })) {
            return;
          }
          let diff = openTime.valueOf() - shouldConfirmTime.valueOf();
          if (diff < min_gap) {
            nearby_opent_time = openTime;
            min_gap = diff;
          }
        });
      });

      // check if now is later then opentime+5mins

      if (nearby_opent_time) {
        shouldConfirmTime = new Date(nearby_opent_time);
        shouldConfirmTime.setMinutes(shouldConfirmTime.getMinutes() + 5);
        if (new Date().valueOf() >= shouldConfirmTime.valueOf()) {
          order.shouldConfirmTime = shouldConfirmTime;
          this.orders.push(order);
        }
      }
    });
  }

  async reorg() {
    let dict = {};
    this.orders.forEach(order => {
      if (this.showOnlyQmenuCollected && order.paymentObj.paymentType !== 'QMENU') return;
      let rt = this.rtDict[order.restaurant];
      if (!rt) return;
      let tmp = dict[rt._id] || {
        restaurant: rt, orders: [], total:0,
        channels: (rt.channels || []).filter(x => x.type !== 'Email' && x.notifications && x.notifications.includes('Business'))
       }
      tmp.orders.push(order);
      tmp.total += order.total;
      dict[rt._id] = tmp;
    });
    this.rows = Object.values(dict);
  }

  getList() {
    return this.rows.sort((a, b) => (a.total - b.total) * (this.descending ? -1 : 1))
  }

  isOverdue({shouldConfirmTime}) {
    return new Date(this.now).valueOf() - new Date(shouldConfirmTime).valueOf() > 60 * 60 * 1000;
  }

  getTimeDelay({shouldConfirmTime, timeToDeliver, createdAt, type}, timeZone) {
    const lines = [], place_txt = `${type} order at ${to_local_time(createdAt, timeZone)}`;
    let lateBy = new Date(this.now).valueOf() - new Date(shouldConfirmTime).valueOf();
    if (!timeToDeliver) {
      // non-scheduled
      lines.push(place_txt)
      lines.push(`Confirm by ${to_local_time(shouldConfirmTime, timeZone)}. (Late by ${readable_ms(lateBy)})`);
    } else {
      lines.push(`Scheduled for ${to_local_time(timeToDeliver, timeZone)}`);
      lines.push(place_txt);
      let confirm_txt = `Confirm by ${to_local_time(shouldConfirmTime, timeZone)} (Late by ${readable_ms(lateBy)})`
      let created_date = new Date(createdAt).toLocaleString('en-US', {day: '2-digit', timeZone});
      let scheduled_date = new Date(timeToDeliver).toLocaleString('en-US', {day: '2-digit', timeZone});
      if (created_date !== scheduled_date) {
        confirm_txt += " (order placed yesterday)"
      }
      lines.push(confirm_txt);
    }
    return lines;
  }


  getTimeOffsetByTimezone(timezone){
    return Helper.getOffsetNumToEST(timezone);
  }

  getTimezoneCity(timezone){
    return (timezone || '').split('/')[1] || '';
  }

  getDaysFromId(mongoId) {
    return Math.floor((this.now.valueOf() - parseInt(mongoId.substring(0, 8), 16) * 1000) / (24 * 3600000));
  }

}
