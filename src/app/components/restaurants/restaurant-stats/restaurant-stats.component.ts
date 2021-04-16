import { filter } from 'rxjs/operators';
import { ApiService } from './../../../services/api.service';
import { environment } from './../../../../environments/environment';
import { Input } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-restaurant-stats',
  templateUrl: './restaurant-stats.component.html',
  styleUrls: ['./restaurant-stats.component.css']
})
export class RestaurantStatsComponent implements OnInit {

  @Input() restaurant: any;
  statistics = {
    "Total lifetime orders": 0,
    "Average daily orders (since the restaurant has been created)": 0,
    "Total unique customers": 0,
    "New customer orders (as % of orders placed in last 30 days)": "",
    "Total orders from repeat customers": 0,
    "Total orders from new customers": 0
  }
  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.statisticRestaurantStats();
  }
  //use this method to statistic the restaurant order stats since it was sigin in our system 
  async statisticRestaurantStats() {
    const query = {
      restaurant: {
        $oid: this.restaurant._id
      },
      $and: [
        {
          createdAt: {
            $gte: { $date: this.restaurant.createdAt }
          }
        },
        {
          createdAt: {
            $lte: { $date: new Date() }
          }
        }
      ]
    } as any;

    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: query,
      projection: {//返回除logs以外的所有行
        logs: 0,
      },
      sort: {
        createdAt: -1
      },
      limit: 10000
    }).toPromise();
    this.statistics['Total lifetime orders'] = orders.length;
    //toFixed can keep n decimal place
    this.statistics['Average daily orders (since the restaurant has been created)'] = Number((orders.length / ((new Date().valueOf() - new Date(this.restaurant.createdAt).valueOf()) / (24 * 3600000))).toFixed(4));
    let uniqueOrders = [];
    let repeatOrders = [];
    const phones = orders.map(o => o.customerObj.phone);
    for (let i = 0; i < phones.length; i++) {
      let phone = phones[i];
      if (uniqueOrders.indexOf(phone) === -1) {
        uniqueOrders.push(phone);
      } else {
        if (repeatOrders.indexOf(phone) === -1) { //if the unique orders array has this phone it must be repeat in total orders
          repeatOrders.push(phone);
        }
      }
    }
    this.statistics['Total unique customers'] = uniqueOrders.length;
    let newCusutomerLastMonthOrders = orders.filter(o => !o.customerPreviousOrderStatus && new Date(o.createdAt).valueOf() > (new Date().valueOf() - 30 * 24 * 3600000));
    let lastMonthOrders = orders.filter(o => new Date(o.createdAt).valueOf() > (new Date().valueOf() - 30 * 24 * 3600000));
    if (lastMonthOrders.length > 0) {
      this.statistics['New customer orders (as % of orders placed in last 30 days)'] = Number((newCusutomerLastMonthOrders.length / lastMonthOrders.length).toFixed(4)) * 100 + "%";
    }
    //for example by demo:
    //it has 303 orders in total,and has 11 unique customers book the food in demo,repeat orders is 298 
    //303-298=5,and the repeat cutomer's phone is 6 11-6=5 => 298+5=303
    this.statistics['Total orders from repeat customers'] = orders.filter(o => repeatOrders.indexOf(o.customerObj.phone) != -1).length;
    let newCustomerOrders = orders.filter(o => !o.customerPreviousOrderStatus);
    this.statistics['Total orders from new customers'] = newCustomerOrders.length;
  }


}
