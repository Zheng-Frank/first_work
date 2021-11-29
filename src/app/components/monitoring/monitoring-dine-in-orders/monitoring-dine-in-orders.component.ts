import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Order } from '@qmenu/ui'
import { } from '@qmenu/ui'

@Component({
  selector: 'app-monitoring-dine-in-orders',
  templateUrl: './monitoring-dine-in-orders.component.html',
  styleUrls: ['./monitoring-dine-in-orders.component.css']
})
export class MonitoringDineInOrdersComponent implements OnInit {


  //unconfirmed_orders_count:number;

  // Rows that are displayed 
  rows = []; // {rfestaurant, orders}


  // Rows that only contain qMenu Collect payments 
  qmenuRows = []


  //  All rows 

  allRows = []
  currentCriteria = 'All'

  descending = true

  constructor(private _api: ApiService, private _global: GlobalService) { }

  handleArrow() {
    this.descending = !this.descending

    if (this.descending) {
      this.rows = this.rows.sort((a, b) => a.totalSum - b.totalSum)
    } else {
      this.rows = this.rows.sort((a, b) => b.totalSum - a.totalSum)
    }

  }

  now = new Date();

  log(item) {
    console.log(item)
  }
  async ngOnInit() {
    this.refreshOrders();
    // setInterval(() => { this.refreshOrders(); }, 180000);
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
    this.currentCriteria = type
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

  async refreshOrders() {
    const rightNow = new Date();
    const oneDayAgo = rightNow.setHours(rightNow.getHours() - 24).valueOf();

    // query all orders of type DINE-IN from the 24 hours
    const dineInOrders = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        createdAt: { $gt: { $date: oneDayAgo } },
        type: 'DINE-IN'
      },
      projection: {
        _id: 1,
        orderNumber: 1,
        "restaurantObj.name": 1,
        "restaurantObj._id": 1,
        type: 1,
        createdAt: 1,
      },
      sort: {
        createdAt: -1
      },
    }, 500)

    console.log(dineInOrders);
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
