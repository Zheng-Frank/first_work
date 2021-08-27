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

  orderFromDevice = {
    mobileTotal: "",
    pcTotal: "",
    otherTotal: "",
    mobile: {
      byOS: {
        Android: "",
        iOS: "",
        Others: ""
      },
      byType: {
        PWA: "",
        App: "",
        Browser: "",
        Others: ""
      }
    },
    pc: {
      byOS: {
        Windows: "",
        Linux: "",
        Mac: "",
        Others: ""
      },
      byBrowser: {
        Chrome: "",
        Safari: "",
        Firefox: "",
        IE: "",
        Edge:"",
        Others: ""
      }
    }
  }
  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.statisticRestaurantStats();
  }
  // if count of the order's type is 0 (0.00%), needn't show it.
  isVisiabled(count:string): boolean{
    return count !== "0 (0.00%)";
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
        "orderItems.miInstance": 1,
        "runtime.standalone": 1,
        "runtime.isApp": 1,
        "runtime.os": 1,
        "runtime.browser": 1,
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

    // statistics of order source info
    let fromPhone = orders.filter(order => this.orderFromPhone(order)).length;
    let fromPC = orders.filter(order => this.orderFromPC(order)).length;
    let fromAndroid = orders.filter(order => this.orderFromAndroid(order)).length;
    let fromiOS = orders.filter(order => this.orderFromiOS(order)).length;
    let fromPWA = orders.filter(order => this.orderFromPWA(order)).length;
    let fromApp = orders.filter(order => this.orderFromApp(order)).length;
    let fromPhoneBrowser = orders.filter(order => this.orderFromPhoneBrowser(order)).length;
    let fromWindows = orders.filter(order => this.orderFromWindows(order)).length;
    let fromLinux = orders.filter(order => this.orderFromLinux(order)).length;
    let fromMac = orders.filter(order => this.orderFromMac(order)).length;
    let fromPCChrome = orders.filter(order => this.orderFromPCChrome(order)).length;
    let fromPCSafari = orders.filter(order => this.orderFromPCSafari(order)).length;
    let fromPCFirefox = orders.filter(order => this.orderFromPCFirefox(order)).length;
    let fromPCIE = orders.filter(order => this.orderFromPCIE(order)).length;
    let fromPCEdge = orders.filter(order => this.orderFromPCEdge(order)).length;
    // calculate phone take up rate.
    this.orderFromDevice.mobileTotal = fromPhone > 0 ? fromPhone + " " + this.calcRate(fromPhone / orders.length) : "0 (0.00%)";
    // count by os
    this.orderFromDevice.mobile.byOS.Android = fromPhone > 0 ? fromAndroid + " " + this.calcRate(fromAndroid / fromPhone) : "0 (0.00%)";
    this.orderFromDevice.mobile.byOS.iOS = fromPhone > 0 ? fromiOS + " " + this.calcRate(fromiOS / fromPhone) : "0 (0.00%)";
    this.orderFromDevice.mobile.byOS.Others = fromPhone > 0 ? (fromPhone - fromAndroid - fromiOS) + " " + this.calcRate((fromPhone - fromAndroid - fromiOS) / fromPhone) : "0 (0.00%)";
    // count by type
    this.orderFromDevice.mobile.byType.PWA = fromPhone > 0 ? fromPWA + " " + this.calcRate(fromPWA / fromPhone) : "0 (0.00%)";
    this.orderFromDevice.mobile.byType.App = fromPhone > 0 ? fromApp + " " + this.calcRate(fromApp / fromPhone) : "0 (0.00%)";
    this.orderFromDevice.mobile.byType.Browser = fromPhone > 0 ? fromPhoneBrowser + " " + this.calcRate(fromPhoneBrowser / fromPhone) : "0 (0.00%)";
    this.orderFromDevice.mobile.byType.Others = fromPhone > 0 ? (fromPhone - fromPWA - fromApp - fromPhoneBrowser) + " " + this.calcRate((fromPhone - fromPWA - fromApp - fromPhoneBrowser) / fromPhone) : "0 (0.00%)";

    // calculate PC take up rate.
    this.orderFromDevice.pcTotal = fromPC > 0 ? fromPC + " " + this.calcRate(fromPC / orders.length) : "0 (0.00%)";
    // by os
    this.orderFromDevice.pc.byOS.Windows = fromPC > 0 ? fromWindows + " " + this.calcRate(fromWindows / fromPC) : "0 (0.00%)";
    this.orderFromDevice.pc.byOS.Linux = fromPC > 0 ? fromLinux + " " + this.calcRate(fromLinux / fromPC) : "0 (0.00%)";
    this.orderFromDevice.pc.byOS.Mac = fromPC > 0 ? fromMac + " " + this.calcRate(fromMac / fromPC) : "0 (0.00%)";
    this.orderFromDevice.pc.byOS.Others = fromPC > 0 ? (fromPC - fromWindows - fromLinux - fromMac) + " " + this.calcRate((fromPC - fromWindows - fromLinux - fromMac) / fromPC) : "0 (0.00%)";
    // by browser
    this.orderFromDevice.pc.byBrowser.Chrome = fromPC > 0 ? fromPCChrome + " " + this.calcRate(fromPCChrome / fromPC) : "0 (0.00%)";
    this.orderFromDevice.pc.byBrowser.Firefox = fromPC > 0 ? fromPCFirefox + " " + this.calcRate(fromPCFirefox / fromPC) : "0 (0.00%)";
    this.orderFromDevice.pc.byBrowser.Safari = fromPC > 0 ? fromPCSafari + " " + this.calcRate(fromPCSafari / fromPC) : "0 (0.00%)";
    this.orderFromDevice.pc.byBrowser.IE = fromPC > 0 ? fromPCIE + " " + this.calcRate(fromPCIE / fromPC) : "0 (0.00%)";
    this.orderFromDevice.pc.byBrowser.Edge = fromPC > 0 ? fromPCEdge + " " + this.calcRate(fromPCEdge / fromPC) : "0 (0.00%)";
    this.orderFromDevice.pc.byBrowser.Others = fromPC > 0 ? (fromPC - fromPCChrome - fromPCFirefox - fromPCSafari - fromPCIE - fromPCEdge) + " " + this.calcRate((fromPC - fromPCChrome - fromPCFirefox - fromPCSafari - fromPCIE - fromPCEdge) / fromPC) : "0 (0.00%)";

    // calculate browser and other device take up rate.
    this.orderFromDevice.otherTotal = fromPC > 0 || fromPhone > 0 ? (orders.length - fromPhone - fromPC) + " " + this.calcRate((orders.length - fromPhone - fromPC) / orders.length) : "0 (0.00%)";
  }

  calcRate(rate: number): string {
    return "(" + ((rate) * 100).toFixed(2) + "%)";
  }

  orderFromMac(order) {
    return order.runtime && order.runtime.os && order.runtime.os.indexOf('Mac') >= 0;
  }

  orderFromLinux(order) {
    return order.runtime && order.runtime.os && order.runtime.os.indexOf('Linux') >= 0;
  }

  orderFromWindows(order) {
    return order.runtime && order.runtime.os && order.runtime.os.indexOf('Windows') >= 0;
  }
  // order is from Android, judging by order.runtime.os
  orderFromAndroid(order) {
    return order.runtime && order.runtime.os && order.runtime.os.indexOf('Android') >= 0;
  }
  // order is from is iOS, judging by order.runtime.os
  orderFromiOS(order) {
    return order.runtime && order.runtime.os && order.runtime.os.indexOf('iOS') >=0;
  }
  // judge order whether is from Edge by order.runtime.browser.
  // the type of browser:
  // Chrome, FireFox, Safari, IE
  orderFromPhoneBrowser(order) {
    return this.orderFromPhone(order) && !this.orderFromApp(order) && !this.orderFromPWA(order) && order.runtime && order.runtime.browser;
  }

  orderFromPCChrome(order) {
    return this.orderFromPC(order) && order.runtime && order.runtime.browser.toLowerCase() === 'chrome';
  }

  orderFromPCFirefox(order) {
    return this.orderFromPC(order) && order.runtime && order.runtime.browser.toLowerCase() === 'firefox';
  }

  orderFromPCSafari(order) {
    return this.orderFromPC(order) && order.runtime && order.runtime.browser.toLowerCase() === 'safari';
  }

  orderFromPCIE(order) {
    return this.orderFromPC(order) && order.runtime && order.runtime.browser.toLowerCase() === 'ie';
  }

  orderFromPCEdge(order){
    return this.orderFromPC(order) && order.runtime && order.runtime.browser.toLowerCase() === 'edge';
  }

  // judge order whether is from Edge by order.runtime.isApp.
  // order comes from app judged by both isApp and standalone is true. 
  orderFromApp(order) {
    return order.runtime && order.runtime.os && (order.runtime.os.indexOf('Android') >= 0 || order.runtime.os.indexOf('iOS') >=0) && order.runtime.isApp;
  }
  // judge order whether is from Edge by order.runtime.standalone.
  orderFromPWA(order) {
    return order.runtime && order.runtime.os && (order.runtime.os.indexOf('Android') >= 0 || order.runtime.os.indexOf('iOS') >=0) && order.runtime.standalone && !order.runtime.isApp;
  }
  // judge order whether is from phone. 
  orderFromPhone(order) {
    return order.runtime && order.runtime.isApp ||
      (order.runtime && order.runtime.os && (order.runtime.os.indexOf('Android') >= 0 || order.runtime.os.indexOf('iOS') >=0));
  }
  // judge order whether is from computer. 
  orderFromPC(order) {
    return order.runtime && order.runtime.os && (order.runtime.os.indexOf('Mac') >= 0 || order.runtime.os.indexOf('Linux') >= 0 || order.runtime.os.indexOf('Windows') >= 0);
  }


}
