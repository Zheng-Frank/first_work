import { Component, OnInit, Output } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Restaurant, Order } from '@qmenu/ui'
import { } from '@qmenu/ui'

@Component({
  selector: 'app-monitoring-unconfirmed-orders',
  templateUrl: './monitoring-unconfirmed-orders.component.html',
  styleUrls: ['./monitoring-unconfirmed-orders.component.css']
})
export class MonitoringUnconfirmedOrdersComponent implements OnInit {


  //unconfirmed_orders_count:number;

  rows = []; // {rfestaurant, orders}
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();

  log(item) {
    console.log(item)
  }
  ngOnInit() {

    console.log("TESTING FUNCTION")
    this.refreshOrders();
    // setInterval(() => { this.refreshOrders(); }, 180000);
    setInterval(() => { this.now = new Date(); }, 60000);
  }

  convertTZ(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
  }

  async refreshOrders() {






    const minutesAgo = new Date();
    minutesAgo.setMinutes(minutesAgo.getMinutes() - 10);
    console.log("MINUTES AGO", minutesAgo)
    // we DON'T need an accurate cut of day. Let's just pull the latest 3000
    const ordersWithSatuses = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        // { _id: { $oid: '6053d1d56265d60008926948' } }
        createdAt: {
          // TODO: less than 15 minutes ago (arbritrary number)
          // TODO: replace slice with Mongo 4.4 version?
          // TODO:
          $lt: {
            $date: (new Date(new Date().getTime() - (60 * 60 * 1000 * .25)))
          },
          $gt: {
            $date: (new Date(new Date().getTime() - (60 * 60 * 1000 * 4)))
          },
        }
      },
      projection: {
        _id: 1,
        // orderNumber: 1,
        // "restaurantObj.name": 1,
        // "restaurantObj._id": 1,
        // "statuses.status": 1,
        // "statuses.createdAt": 1,
        // "orderItems": 1,
        type: 1,
        // "paymentObj.method": 1,
        // "paymentObj.paymentType": 1,
        timeToDeliver: 1,
        statuses: {
          $slice: -1
        },
        createdAt: 1,
        // timeToDeliver: 1
      },
      sort: {
        createdAt: -1
      },
    }, 1000)

    console.log("WHAT IS THE WHOLE RESPONSE ? ", ordersWithSatuses)

    let scheduledOrders = 0
    let nonscheduledOrders = 0
    ordersWithSatuses.forEach(order => {
      if (order.timeToDeliver) {
        scheduledOrders += 1
      } else {
        nonscheduledOrders += 1
      }
    })

    console.log("SCHEDULED ORDERS ", scheduledOrders)
    console.log("NON SCHEDULED ORDERS ", nonscheduledOrders)



    let uniqueIds = [... new Set(ordersWithSatuses.map(o => o.restaurantObj._id))]
    console.log(uniqueIds)
    // ordersWithSatuses.forEach(order => {
    //   console.log('This is the order total!!!', new Order(order).getTotal())
    // })
    // console.log("THESE ARE THE ORDER WITH STATUSES ", ordersWithSatuses)

    // TODO
    // TODO: Find order cost. Look at order portal and produce cost
    let unconfirmedOrders = ordersWithSatuses.filter(o => new Date(o.createdAt).valueOf() < minutesAgo.valueOf() && o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED');
    //this.unconfirmed_orders_count=unconfirmedOrders.length;

    // These are the unconfirmed orders for non scheduled
    console.log("THESE ARE THE UNCONFIRMED ORDERS ", unconfirmedOrders)


    // For scheduled orders, these are the unconfirmed orders

    // const unconfirmedScheduledOrders = ordersWithSatuses.filter(o => {
    //   o.timeToDeliver
    //   o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED'
    // })


    // const scheduledOrders = ordersWithSatuses.filter(o => new Date(o.createdAt).valueOf() < minutesAgo.valueOf() && o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED');


    // unconfirmedOrders = [...unconfirmedOrders, ...unconfirmedScheduledOrders]




    // TODO
    // group by restaurants
    const rtIdDict = unconfirmedOrders.reduce((dict, order) => (
      dict[order.restaurantObj._id] = dict[order.restaurantObj._id] || { restaurant: order.restaurantObj, orders: [] },
      dict[order.restaurantObj._id].orders.push({ order, total: new Order(order).getTotal(), payment: order.paymentObj }),
      dict
    ), {});


    console.log("RT ID DICT ", rtIdDict)



    let batchSize = 50;
    let restaurants = [];
    let ids: any = [...Object.keys(rtIdDict).map(id => ({ $oid: id }))];



    // Make API calls for corresponding restaurants to get phone number & closing + open time


    let allRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $in: ids } },
      projection: {
        channels: 1,
        preferredLanguage: 1,
        pickupTimeEstimate: 1,
        deliveryTimeEstimate: 1,
        _id: 1,
        "googleAddress.timezone": 1,
      },
      sort: {
        createdAt: -1
      }
    }, 10000);


    console.log("ALL RESTAUARANTS ", allRestaurants)




    ids = ids.map(obj => obj.$oid)




    console.log("THESE ARE THE IDS ", ids)
    const batchedIds = Array(Math.ceil(ids.length / batchSize)).fill(0).map((i, index) => ids.slice(index * batchSize, (index + 1) * batchSize));


    for (let batch of batchedIds) {
      let result = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: { _id: { $in: batch } },
        projection: {
          'googleAddress.formatted_address': 1,
          skipOrderConfirmation: 1
        },
        sort: {
          createdAt: -1
        }
      }, 1000);

      restaurants.push(...result);
    }

    // let arr = []
    // restaurants.forEach(res => {
    //   arr.push(new Restaurant(res))
    // })
    // console.log("RESTAUARANT 1", restaurants)
    // console.log("RESTAURANT INIT ", arr)

    // arr.forEach(res => {
    //   console.log("BOOL IS OPEN?? ", res.isHourOpen(new Date()))
    // })

    // arr.forEach(res => {
    //   console.log("OPEN HOURS ON DATE ", res.getOpenHoursOnDate(new Date(), res.menus), res.name)
    // })


    // const demo = await this._api.get(environment.qmenuApiUrl + 'generic', {
    //   resource: 'restaurant',
    //   query: { name: 'Demo' },
    //   sort: {
    //     createdAt: -1
    //   }
    // }).toPromise();

    // console.log("DEMO ", demo)

    // let demo_1 = new Restaurant(demo)
    // console.log("THIS IS DEMO 1 ", demo_1)
    // console.log("DEMO HOURS ", demo_1.getOpenHoursOnDate(new Date(), demo_1.menus))

    // console.log("RESTAURANTS BATCH ", restaurants)

    // get if restaurant skipOrderConfirmation

    // const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
    //   resource: 'restaurant',
    //   query: { _id: { $in: [...Object.keys(rtIdDict).map(id => ({ $oid: id }))] } },
    //   projection: {
    //     'googleAddress.formatted_address': 1,
    //     skipOrderConfirmation: 1
    //   },
    //   sort: {
    //     createdAt: -1
    //   }
    // }, 1000)

    restaurants.map(rt => (rtIdDict[rt._id].restaurant.address = (rt.googleAddress || {}).formatted_address, rtIdDict[rt._id].restaurant.skipOrderConfirmation = rt.skipOrderConfirmation));


    // allRestaurants.forEach(res => (rtIdDict[res._id].channels = res.channels, rtIdDict[res._id].timezone = res.googleAddress.timezone))


    allRestaurants.forEach(res => {
      rtIdDict[res._id].channels = res.channels
      rtIdDict[res._id].timezone = res.googleAddress.timezone
      rtIdDict[res._id].pickupTimeEstimate = res.pickupTimeEstimate
      rtIdDict[res._id].deliveryTimeEstimate = res.deliveryTimeEstimate

    })

    // const menus = await this._api.post(environment.appApiUrl + "gmb/generic", {
    //   name: "get-open-hours",
    //   payload: {
    //     "restaurantIds": ids
    //   }
    // }).toPromise();

    // console.log("THESE ARE THE MENUS ", menus)

    // menus.forEach(menu => {
    //   rtIdDict[menu.rtId].menus = menu
    // })

    this.rows = Object.values(rtIdDict).filter(item => !item['restaurant'].skipOrderConfirmation);


    // map in individual restaurant hours 

    // this.rows.forEach(row => {
    //   let dayIndex = new Date().getDay()
    //   let timezone = row.timezone
    //   let menuHours = row.menus.regularHours[dayIndex]
    //   let openTime: any = menuHours.openTime
    //   // let closeTime: any = menuHours.closeTime
    //   row.orders.forEach(order => {
    //     if (this.convertTZ(new Date(order.createdAt), timezone).getTime() - new Date(openTime).getTime() >= (1000 * 60 * 5)) {
    //       order = null
    //     }
    //   })
    // })
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



      if (!fields.createdAt) {
        return "MISSING DATE!"
      }

      let createdAt = this.convertTZ(fields.createdAt, timezone)

      let confirmBy: any = new Date(createdAt.getTime()).setMinutes(createdAt.getMinutes() + row.pickupTimeEstimate)

      if (fields.type.toLowerCase() === 'delivery') {
        // console.log("ORDER IS DELIVERY")

        row.deliveryTimeEstimate = row.deliveryTimeEstimate ? row.deliveryTimeEstimate : 45

        confirmBy = new Date(createdAt.getTime()).setMinutes(new Date(fields.timeToDeliver).getMinutes() - row.deliveryTimeEstimate)

      } else if (fields.type.toLowerCase() === 'pickup') {
        // console.log("ORDER IS PICK UP")
        row.pickupTimeEstimate = row.pickupTimeEstimate ? row.pickupTimeEstimate : 15

        confirmBy = new Date(createdAt.getTime()).setMinutes(new Date(fields.timeToDeliver).getMinutes() - row.pickupTimeEstimate)

      } else {
        confirmBy = new Date(createdAt.getTime()).setMinutes(new Date(fields.timeToDeliver).getMinutes() - 45)
        console.log("ORDER NOT REGISTED AS PICK UP DELIVERY OR PICKUP")
      }

      let expectedDeliverTime = this.convertTZ(fields.timeToDeliver, timezone)


      return [`Scheduled for ${expectedDeliverTime.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`, `${this.capitalizeFirstLetter(fields.type.toString().toLowerCase())} order placed at ${createdAt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`, `Confirm by ${new Date(confirmBy).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`]

    } else {
      if (fields.createdAt) {

        let startTime = this.convertTZ(fields.createdAt, timezone)
        let expectedConfirmation: any = new Date(startTime.getTime()).setMinutes(startTime.getMinutes() + 10)


        expectedConfirmation = new Date(expectedConfirmation).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' });

        return [`${this.capitalizeFirstLetter(fields.type)} order at ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`, `Confirm by ${expectedConfirmation}`]

      } else {
        return "MISSING DATE!"
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
