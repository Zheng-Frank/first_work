import { Component, OnInit, Output } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Restaurant, Order } from '@qmenu/ui'

@Component({
  selector: 'app-monitoring-unconfirmed-orders',
  templateUrl: './monitoring-unconfirmed-orders.component.html',
  styleUrls: ['./monitoring-unconfirmed-orders.component.css']
})
export class MonitoringUnconfirmedOrdersComponent implements OnInit {


  //unconfirmed_orders_count:number;

  rows = []; // {restaurant, orders}
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {

    console.log("TESTING FUNCTION")
    this.refreshOrders();
    // setInterval(() => { this.refreshOrders(); }, 180000);
    setInterval(() => { this.now = new Date(); }, 60000);
  }

  async refreshOrders() {






    const minutesAgo = new Date();
    minutesAgo.setMinutes(minutesAgo.getMinutes() - 10);
    console.log("MINUTES AGO", minutesAgo)
    // we DON'T need an accurate cut of day. Let's just pull the latest 3000
    const ordersWithSatuses = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        createdAt: {
          // TODO: less than 15 minutes ago (arbritrary number)
          // TODO: replace slice with Mongo 4.4 version?
          // TODO:
          $gt: {
            $date: (new Date(new Date().getTime() - (60 * 60 * 1000 * .5)))
          },
        }
      },
      // projection: {
      //   _id: 1,
      //   orderNumber: 1,

      //   "restaurantObj.name": 1,
      //   "restaurantObj._id": 1,
      //   "statuses.status": 1,
      //   "statuses.createdAt": 1,
      //   "orderItems": 1,
      //   type: 1,
      //   "paymentObj.method": 1,
      //   "paymentObj.paymentType": 1,
      //   statuses: {
      //     $slice: -1
      //   },
      //   createdAt: 1,
      //   // timeToDeliver: 1
      // },
      sort: {
        createdAt: -1
      },
      limit: 100000
    }, 250)

    console.log("WHAT IS THE WHOLE RESPONSE ? ", ordersWithSatuses)


    // ordersWithSatuses.forEach(order => {
    //   console.log('This is the order total!!!', new Order(order).getTotal())
    // })
    // console.log("THESE ARE THE ORDER WITH STATUSES ", ordersWithSatuses)

    // TODO
    // TODO: Find order cost. Look at order portal and produce cost
    const unconfirmedOrders = ordersWithSatuses.filter(o => new Date(o.createdAt).valueOf() < minutesAgo.valueOf() && o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED');
    //this.unconfirmed_orders_count=unconfirmedOrders.length;

    console.log("THESE ARE THE UNCONFIRMED ORDERS ", unconfirmedOrders)





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
    let ids = [...Object.keys(rtIdDict).map(id => ({ $oid: id }))];



    // Make API calls for corresponding restaurants to get phone number & closing + open time


    let allRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $in: ids } },
      projection: {
        channels: 1,
        preferredLanguage: 1,
        menus: 1,
        pickupTimeEstimate: 1,
        deliveryTimeEstimate: 1,
        _id: 1,
        "googleAddress.timezone": 1,
      },
      sort: {
        createdAt: -1
      }
    }, 20);


    console.log("ALL RESTAUARANTS ", allRestaurants)

    const menus = await this._api.post(environment.appApiUrl + "gmb/generic", {
      name: "get-open-hours",
      payload: {
        "restaurantIds": ["5b0aa4a3bab26f14006479f1", "58884aaf7945f91100bad519"]
      }
    }).toPromise();

    console.log("THESE ARE THE MENUS ", menus)




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


    allRestaurants.forEach(res => (rtIdDict[res._id].channels = res.channels, rtIdDict[res._id].timezone = res.googleAddress.timezone))

    this.rows = Object.values(rtIdDict).filter(item => !item['restaurant'].skipOrderConfirmation);


    console.log("FINAL ROWS ", this.rows)

  }

  getOrderTimeForTimeZone(createdAt, timeZone) {
    return ["Scheduled for 11:00AM", "Confirmed by 12:30PM"]
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

}
