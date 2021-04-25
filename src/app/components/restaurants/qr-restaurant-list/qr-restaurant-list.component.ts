import { filter } from 'rxjs/operators';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-qr-restaurant-list',
  templateUrl: './qr-restaurant-list.component.html',
  styleUrls: ['./qr-restaurant-list.component.css']
})
export class QrRestaurantListComponent implements OnInit {

  qrRestaurantListRows;
  qrFilterRestaurantListRows;
  pagination = true;
  qrFullyConfigured = false;
  knownUsers = [];
  restaurantsColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Num QR orders",
      sort: (a, b) => a.qrOrderNumber - b.qrOrderNumber
    },
    {
      label: "Fee/Rate Schedules"
    }

  ];
  targets = [
    {
      value: 'ONLINE_ONLY',
      text: 'Online only'
    }, {
      value: 'DINE_IN_ONLY',
      text: 'Dine-in only'
    }, {
      value: 'ALL',
      text: 'Both online and dine-in'
    }];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.populateQrRestaurant();
  }
  /**
   * RT is considered to have complete QR code setup if:
    "QR fully configured"
    Has fee schedules (not rate schedules)
    Must have at least one menu with dine-in type (or both dine-in and online)
    Must have fee setting for dine-in specifically:
    must have at least one fee where: 
    a) Qmenu is receiving money, 
    b) the service type includes dine-in, 
    c) the type is "service fee", 
    d) amount/percent is NOT 0.
   */
  filterQrFullyConfigured() {
    if (this.qrFullyConfigured) {
      this.qrFilterRestaurantListRows = this.qrRestaurantListRows
        .filter(qrList => qrList.feeSchedules && qrList.feeSchedules.filter(f => f.payee === 'QMENU' && f.name === 'service fee' && !(!(f.rate > 0) && !(f.amount > 0)) && f.orderTypes && f.orderTypes.filter(type => type === 'DINE-IN').length > 0).length > 0
          && qrList.menus && qrList.menus.filter(m => m.targetCustomer && (m.targetCustomer === 'DINE_IN_ONLY' || m.targetCustomer === 'ALL')).length > 0);
    } else {
      this.qrFilterRestaurantListRows = this.qrRestaurantListRows;
    }
  }
  async populateQrRestaurant() {
    this.qrRestaurantListRows = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { qrSettings: { $exists: true } },
      projection: {
        _id: 1,
        name: 1,
        googleAddress: 1,
        qrOrderNumber: 1,
        feeSchedules: 1,
        rateSchedules: 1
      },
      sort: { updatedAt: -1 }
    }, 5000);
    this._global.getCachedUserList().then(users => this.knownUsers = users).catch(console.error);
    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "dine-in-session",
      query: {
        "orderObj.restaurantObj._id": {
          $exists: true
        }
      },
      projection: {
        "orderObj": 1
      },
      sort: {
        createdAt: -1
      },
      limit: 10000
    }).toPromise();
    for (let i = 0; i < this.qrRestaurantListRows.length; i++) {
      let restaurant = this.qrRestaurantListRows[i];
      let tempOrders = orders.filter(o => o.orderObj.restaurantObj._id === restaurant._id);
      this.qrRestaurantListRows[i].qrOrderNumber = tempOrders.length;
      if(this.qrRestaurantListRows[i].menus){
        this.qrRestaurantListRows[i].menus = this.qrRestaurantListRows[i].menus.map(m => {
          if (m.targetCustomer) {
            m.menuTarget = this.targets.filter(t => t.value === m.targetCustomer)[0].text;
          }
          return m;
        });
      }
    }
    this.qrFilterRestaurantListRows = this.qrRestaurantListRows;

  }

}
