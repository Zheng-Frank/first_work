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
  currentCriteria = 'All'
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
    return new Date(date)
    // return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
  }

  // renderRestaurants(type) {
  //   this.currentCriteria = type

  //   this.rows = this.rows.sort()
  // }

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
        orderNumber: 1,
        "restaurantObj.name": 1,
        "restaurantObj._id": 1,
        "statuses.status": 1,
        "statuses.createdAt": 1,
        "orderItems": 1,
        type: 1,
        "paymentObj.method": 1,
        "paymentObj.paymentType": 1,
        timeToDeliver: 1,
        timeToDeliverEstimate: 1,
        statuses: { $slice: -1 },
        createdAt: 1,
      },
      sort: {
        createdAt: -1
      },
    }, 500)

    console.log("WHAT IS THE WHOLE RESPONSE ? ", ordersWithSatuses)

    // let scheduledOrders = 0
    // let nonscheduledOrders = 0
    // ordersWithSatuses.forEach(order => {
    //   if (order.timeToDeliver) {
    //     scheduledOrders += 1
    //   } else {
    //     nonscheduledOrders += 1
    //   }
    // })

    // console.log("SCHEDULED ORDERS ", scheduledOrders)
    // console.log("NON SCHEDULED ORDERS ", nonscheduledOrders)



    let uniqueIds = [... new Set(ordersWithSatuses.map(o => o.timeToDeliver ? o.restaurantObj._id : null).map(id => ({ $oid: id })).filter(id => id.$oid != undefined || id.$oid != null)
    )].slice(0, 70)
    console.log("UNIQUE IDS ", uniqueIds)



    let restaurantPickupTimes = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $in: uniqueIds } },
      projection: {
        _id: 1,
        pickupTimeEstimate: 1,
        deliveryTimeEstimate: 1,
      },
      sort: {
        createdAt: -1
      },
    }, 50)


    console.log("ALL RESTAURANT PICKUP DELIVERY TIMES ", restaurantPickupTimes)
    // console.log(uniqueIds)
    // ordersWithSatuses.forEach(order => {
    //   console.log('This is the order total!!!', new Order(order).getTotal())
    // })
    // console.log("THESE ARE THE ORDER WITH STATUSES ", ordersWithSatuses)

    // TODO
    // TODO: Find order cost. Look at order portal and produce cost
    let unconfirmedOrdersNonScheduled = ordersWithSatuses.filter(o => o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED' && !o.timeToDeliver);
    //this.unconfirmed_orders_count=unconfirmedOrders.length;

    // These are the unconfirmed orders for non scheduled
    console.log("THESE ARE THE UNCONFIRMED ORDERS NON SCHEDULED ORDERS ", unconfirmedOrdersNonScheduled)


    // For scheduled orders, these are the unconfirmed orders

    const unconfirmedScheduledOrders = ordersWithSatuses.filter(o => {
      let statusCondition = o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED' && o.timeToDeliver;


      if (!statusCondition) {
        return false
      }
      if (o.type.toLowerCase() === 'pickup') {

        let pickupTime;
        restaurantPickupTimes.forEach(res => {
          if (res._id === o.restaurantObj._id) {
            // console.log("MATCHING ID PICK ", res.pickupTimeEstimate, o.restaurantObj)
            if (res.pickupTimeEstimate < 10 || res.pickupTimeEstimate > 35) {
              pickupTime = 15
            } else {
              pickupTime = res.pickupTimeEstimate

            }
          }
        })

        // console.log("PICK UP TIMES ", pickupTime)

        pickupTime = pickupTime ? pickupTime : 15


        let latePickupTime = new Date(new Date(o.timeToDeliverEstimate).getTime() - (pickupTime * 60 * 1000)).getTime()

        console.log("LATE PICK UP TIME ", latePickupTime)
        return this.now.getTime() > latePickupTime

      } else if (o.type.toLowerCase() === 'delivery') {

        let deliveryTime
        restaurantPickupTimes.forEach(res => {
          if (res._id === o.restaurantObj._id) {
            // console.log("MATCHING ID DELIVERY ID ", res.deliveryTimeEstimate)

            if (res.deliveryTimeEstimate < 15 || res.deliveryTimeEstimate >= 75) {
              deliveryTime = 45
            } else {
              deliveryTime = res.deliveryTimeEstimate

            }
          }
        })

        // console.log("DELIVERY TIMES ", deliveryTime)
        deliveryTime = deliveryTime ? deliveryTime : 45

        let lateDeliveryTime = new Date(new Date(o.timeToDeliverEstimate).getTime() - (deliveryTime * 60 * 1000)).getTime()

        return this.now.getTime() > lateDeliveryTime

      }

    })

    console.log("UNCONFIRMED SCHEDULED ORDERS ", unconfirmedScheduledOrders)

    let unconfirmedOrders = [...unconfirmedOrdersNonScheduled, ...unconfirmedScheduledOrders]

    // let unconfirmedOrders = [...unconfirmedOrdersNonScheduled]


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


    console.log("THESE ARE THE IDS ", ids)

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
    }, 100);


    console.log("ALL RESTAUARANTS ", allRestaurants)




    ids = ids.map(obj => obj.$oid)




    let batchedIds = Array(Math.ceil(ids.length / batchSize)).fill(0).map((i, index) => ids.slice(index * batchSize, (index + 1) * batchSize));

    batchedIds = [...Object.keys(rtIdDict).map(id => ({ $oid: id }))];




    // let result = await this._api.get(environment.qmenuApiUrl + 'generic', {
    //   resource: 'restaurant',
    //   query: { _id: { $in: ['5a0afb83de3ec81200489164', '5a202e4fcb7edf14001930e3', '5bbb2ed8a79d1c1400caa019'] } },
    //   projection: {
    //     'googleAddress.formatted_address': 1,
    //     skipOrderConfirmation: 1
    //   },
    //   sort: {
    //     createdAt: -1
    //   }
    // }).toPromise();

    // console.log("RESULTING ID ", result)


    console.log("BATCHED IDS ", batchedIds)

    let result = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $in: batchedIds } },
      projection: {
        skipOrderConfirmation: 1
      },
      limit: 10000
    }).toPromise();

    restaurants.push(...result);

    console.log("SKIP ORDER ", restaurants)



    restaurants.map(rt => (rtIdDict[rt._id].restaurant.address = (rt.googleAddress || {}).formatted_address, rtIdDict[rt._id].restaurant.skipOrderConfirmation = rt.skipOrderConfirmation));


    // allRestaurants.forEach(res => (rtIdDict[res._id].channels = res.channels, rtIdDict[res._id].timezone = res.googleAddress.timezone))


    allRestaurants.forEach(res => {
      rtIdDict[res._id].channels = res.channels
      rtIdDict[res._id].timezone = res.googleAddress.timezone
      rtIdDict[res._id].pickupTimeEstimate = res.pickupTimeEstimate
      rtIdDict[res._id].deliveryTimeEstimate = res.deliveryTimeEstimate

    })

    console.log("RT ID DICT ", rtIdDict)


    this.rows = Object.values(rtIdDict).filter(item => !item['restaurant'].skipOrderConfirmation);


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

      let lateTime = new Date(this.now.getTime() - new Date(fields.timeToDeliver).getTime()).getMinutes()

      let scheduledString = `Scheduled for ${expectedDeliverTime.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`
      let placedAtString = `${this.capitalizeFirstLetter(fields.type.toString().toLowerCase())} order placed at ${createdAt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`

      let confirmByString = overnightOrder ? `Confirm by ${new Date(confirmBy).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })} (Late by ${lateTime} minutes) (order placed yesterday)` : `Confirm by ${new Date(confirmBy).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })} (Late by ${lateTime} minutes)`


      return [scheduledString, placedAtString, confirmByString]

    } else {
      if (fields.createdAt) {

        let startTime = this.convertTZ(fields.createdAt, timezone)
        let expectedConfirmation: any = new Date(startTime.getTime()).setMinutes(startTime.getMinutes() + 10)

        let lateTime = new Date(this.now.getTime() - new Date(expectedConfirmation).getTime()).getMinutes()

        if (lateTime < 0) {
          console.log("NEGATIVE ORDER ", order)
        }

        expectedConfirmation = new Date(expectedConfirmation).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' });



        // console.log(lateTime)

        return [`${this.capitalizeFirstLetter(fields.type)} order at ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, minute: 'numeric' })}`, `Confirm by ${expectedConfirmation}. (Late by ${lateTime} minutes)`]

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
