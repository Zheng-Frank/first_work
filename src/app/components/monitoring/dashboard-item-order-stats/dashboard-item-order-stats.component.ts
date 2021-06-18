import { filter } from 'rxjs/operators';
import { Component, OnInit, Input } from '@angular/core';
enum orderStatsTypes {
  ALLTYPES = 'All Types',
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
  selector: 'app-dashboard-item-order-stats',
  templateUrl: './dashboard-item-order-stats.component.html',
  styleUrls: ['./dashboard-item-order-stats.component.css']
})
export class DashboardItemOrderStatsComponent implements OnInit {
  @Input()
  orderStatsItemsAllTypes;
  @Input()
  orderStatsItemsByDate; // the item of it has two propertys,that is order,type.
  filterOrderStatsItemsByDate;
  filterType = orderStatsTypes.ALLTYPES;
  orderStatsTypesArr = [
    orderStatsTypes.ALLTYPES,
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
  displayingJson = false;
  displayingMore = false;
  now = new Date();
  constructor() { }

  ngOnInit() {

  }

  filterOrderStats() {
    switch (this.filterType) {
      case orderStatsTypes.ALLTYPES:

        break;
      case orderStatsTypes.PICKUP:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.PICKUP);
        break;
      case orderStatsTypes.DELIVERY:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.DELIVERY);
        break;
      case orderStatsTypes.DINE_IN:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.DINE_IN);
        break;
      case orderStatsTypes.QR:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.QR);
        break;
      case orderStatsTypes.Postmates:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.Postmates);
        break;
      case orderStatsTypes.APP:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.APP);
        break;
      case orderStatsTypes.Mac:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.Mac);
        break;
      case orderStatsTypes.Android:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.Android);
        break;
      case orderStatsTypes.iOS:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.iOS);
        break;
      case orderStatsTypes.Windows:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.Windows);
        break;
      case orderStatsTypes.NULL:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.NULL);
        break;
      case orderStatsTypes.Linux:
        this.filterOrderStatsItemsByDate = this.orderStatsItemsByDate.filter(item => item.type === orderStatsTypes.Linux);
        break;
      default:
        break;
    }
    let dateArr = [];
    for (let i = 1; i <= 20; i++) {
      let count = 0;
      let orderItem;
      this.filterOrderStatsItemsByDate.forEach(item => {
        if ((new Date().valueOf() - new Date(item.order.createdAt).valueOf()) < (24 * 3600 * 1000 * i)) {
          count++;
          orderItem = item;
        }
      });
      if(orderItem && orderItem.order){
        dateArr.push({
          date: orderItem.order.createdAt,
          count: count
        });
      }
    }
    this.filterOrderStatsItemsByDate['dateArr'] = dateArr;
  }
  getAllTypesRows() {
    if (this.displayingMore) {
      return this.orderStatsItemsAllTypes.rows;
    } else {
      return this.orderStatsItemsAllTypes.rows.slice(0, 4);
    }
  }
}
