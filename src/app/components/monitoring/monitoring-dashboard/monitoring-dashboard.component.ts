import { Component, OnInit } from '@angular/core';
import { GlobalService } from 'src/app/services/global.service';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

enum orderStatsTypes{
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
  DINE_IN = 'DINE-IN',
  QR = 'QR',
  Postmates = 'Postmates',
  APP = 'APP',
  iOS = 'iOS',
  Mac = 'Mac',
  Android = 'Android',
  Windows = 'Windows',
  NULL = 'null',
  Linux = 'Linux'
}

@Component({
  selector: 'app-monitoring-dashboard',
  templateUrl: './monitoring-dashboard.component.html',
  styleUrls: ['./monitoring-dashboard.component.css']
})
export class MonitoringDashboardComponent implements OnInit {

  monitoredItem = 'Dashboard Items';
  items = [];
  orderStatsItemsAllTypes = [];
  orderStatsItemsByDate = [];
  orderStatsTypesArr = [
    orderStatsTypes.PICKUP,
    orderStatsTypes.DELIVERY,
    orderStatsTypes.DINE_IN,
    orderStatsTypes.QR,
    orderStatsTypes.Postmates,
    orderStatsTypes.APP,
    orderStatsTypes.iOS,
    orderStatsTypes.Mac,
    orderStatsTypes.Android,
    orderStatsTypes.Windows,
    orderStatsTypes.NULL,
    orderStatsTypes.Linux
  ];
  dashboardItems = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.populate();
  }

  ngOnInit() {
    const roleMap = {
      "Dashboard Items": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
      "Diagnostics": ["ADMIN", "CSR", "ACCOUNTANT"],
      "Cloud Printers": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
      "GMB Tasks": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT", "GMB_SPECIALIST", "MARKETER_INTERNAL"],
      "DB": ["ADMIN"],
      "Events": ["ADMIN"],
      "Scripts": ["ADMIN"],
      "Restaurant Domains": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
      "Restaurant GMBs": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
    };
    const myRoles = this._global.user.roles;
    this.items = Object.keys(roleMap).filter(k => roleMap[k].some(role => myRoles.indexOf(role) >= 0));
  }

  async populate() {
    const dashboardItems = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'dashboard-item',
      limit: 10000
    }).toPromise());
    this.dashboardItems.push(...dashboardItems);
    this.orderStatsItemsAllTypes = this.dashboardItems.filter(item => item.title === 'Daily Order Stats')[0];
    // show the orders of last 20 days.
    const query = {
      $and: [
        {
          createdAt: {
            $gte: { $date: (new Date(new Date().valueOf() - (20 * 24 * 3600 * 1000))) }
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
        _id: 1,
        type: 1,
        createdAt: 1,
        runtime: 1
      },
      sort: {
        createdAt: -1
      },
    }, 15000);
    orders.forEach(order=>{
      this.orderStatsTypesArr.forEach(type=>{
        if(order.type && order.type === type){
          this.orderStatsItemsByDate.push({
            type:type,
            order:order
          });
        }
        if(order.runtime){

        }
      });
    });
   
  }
}
