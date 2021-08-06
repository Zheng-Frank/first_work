import { ApiService } from './../../../services/api.service';
import { environment } from './../../../../environments/environment';
import { Input } from '@angular/core';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-restaurant-stats',
  templateUrl: './restaurant-stats.component.html',
  styleUrls: ['./restaurant-stats.component.css']
})
export class RestaurantStatsComponent implements OnInit {

  @Input() restaurant: any;
  statistics = {
    totalLifetimeOrders: { value: 0, label: 'Total lifetime orders' },
    averageDailyOrders: { value: 0, label: 'Average daily orders (since the restaurant has been created)' },
    totalUniqueCustomer: { value: 0, label: 'Total unique customers' },
    newCustomerLast30DaysOrders: { value: "", label: 'New customer orders (as % of orders placed in last 30 days)' },
    totalOrdersFromRepeatCustomer: { value: 0, label: 'Total orders from repeat customers' },
    totalOrderFromNewCustomer: { value: 0, label: 'Total orders from new customers' },
    menusWithPicture: { value: 0, label: 'The X menu items with pictures were ordered' },
    menusWithoutPicture: { value: 0, label: 'The Y menu items without pictures were ordered' },
    menusWithPictureOrderRate: { value: 0, label: 'Menu items with pictures sell better than those without by a factor of' }
  }
  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.statisticRestaurantStats();
  }
  // use this method to statistic the restaurant order stats since it was sigin in our system 
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

    const orders = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: query,
      projection: {
        "customerPreviousOrderStatus.order": 1,
        createdAt: 1,
        customer: 1,
        "orderItems.miInstance": 1
      },
      sort: {
        createdAt: -1
      },
    }, 500);

    this.statistics['totalLifetimeOrders'].value = orders.length;
    // toFixed can keep n decimal place
    this.statistics['averageDailyOrders'].value = Number((orders.length / ((new Date().valueOf() - new Date(this.restaurant.createdAt).valueOf()) / (24 * 3600000))).toFixed(4));
    let uniqueOrders = [];
    let repeatOrders = [];
    const customers = orders.map(o => o.customer);
    for (let i = 0; i < customers.length; i++) {
      let customer = customers[i];
      if (uniqueOrders.indexOf(customer) === -1) {
        uniqueOrders.push(customer);
      } else {
        if (repeatOrders.indexOf(customer) === -1) { // if the unique orders array has this phone it must be repeat in total orders
          repeatOrders.push(customer);
        }
      }
    }
    this.statistics['totalUniqueCustomer'].value = uniqueOrders.length;
    // new Date(o.createdAt).valueOf() is millisecond and it will grow largely with time going by
    let newCusutomerLast30DaysOrders = orders.filter(o => !o.customerPreviousOrderStatus && new Date(o.createdAt).valueOf() > (new Date().valueOf() - 30 * 24 * 3600000));
    let last30DaysOrders = orders.filter(o => new Date(o.createdAt).valueOf() > (new Date().valueOf() - 30 * 24 * 3600000));
    if (last30DaysOrders.length > 0) {
      let percent = ((newCusutomerLast30DaysOrders.length / last30DaysOrders.length) * 100).toFixed(4);
      this.statistics['newCustomerLast30DaysOrders'].value = percent + "%";
    } else {
      this.statistics['newCustomerLast30DaysOrders'].value = "0%";
    }
    // for example by demo:
    // it has 311 orders in total,and has 67 unique customers book the food in demo,repeat orders is 292 
    // 311-292=19,and the repeat customer's of order(using customer property) is 48 67-48=19 => 292+19=311
    this.statistics['totalOrdersFromRepeatCustomer'].value = orders.filter(o => repeatOrders.indexOf(o.customer) != -1).length;
    let newCustomerOrders = orders.filter(o => !o.customerPreviousOrderStatus);
    this.statistics['totalOrderFromNewCustomer'].value = newCustomerOrders.length;
    // count menu item with picture and without picture.
    let menuItemWithPictureOrderCount = 0;
    let menuItemWithoutPictureOrderCount = 0;
    orders.forEach(o => {
      o.orderItems.forEach(item => {
        // mcInstance is menu categray,and miInstance is menu item.
        // miInstance  
        if (item.miInstance && item.miInstance.imageObjs && item.miInstance.imageObjs.length > 0) {
          menuItemWithPictureOrderCount++;
        } else {
          menuItemWithoutPictureOrderCount++;
        }
      });
    }
    );
    let menuItemWithPictureCount = 0;
    let menuItemWithoutPictureCount = 0;
    this.restaurant.menus.forEach(menu => {
      menu.mcs.forEach(mc => {
        mc.mis.forEach(mi => {
          if (mi.imageObjs && mi.imageObjs.length > 0) {
            menuItemWithPictureCount++;
          } else {
            menuItemWithoutPictureCount++;
          }
        });
      });
    });
    let tempMenuItemWithPictureCount = menuItemWithPictureCount > 0 ? Number((menuItemWithPictureOrderCount / menuItemWithPictureCount).toFixed(4)) : 0;
    let tempMenuItemWithoutPictureCount = menuItemWithoutPictureCount > 0 ? Number((menuItemWithoutPictureOrderCount / menuItemWithoutPictureCount).toFixed(4)) : 0;
    this.statistics['menusWithPicture'].value = menuItemWithPictureOrderCount;
    this.statistics['menusWithPicture'].label = 'The ' + menuItemWithPictureCount + ' menu items with pictures were ordered';
    this.statistics['menusWithoutPicture'].value = menuItemWithoutPictureOrderCount;
    this.statistics['menusWithoutPicture'].label = 'The ' + menuItemWithoutPictureCount + ' menu items without pictures were ordered';
    this.statistics['menusWithPictureOrderRate'].value = menuItemWithoutPictureCount > 0 ? Number((tempMenuItemWithPictureCount / tempMenuItemWithoutPictureCount).toFixed(4)) : 0;
  }


}
