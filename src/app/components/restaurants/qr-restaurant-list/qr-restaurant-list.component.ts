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
  pagination = true;
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
      sort: (a, b) =>a.qrOrderNumber-b.qrOrderNumber
    },
    {
      label: "Fee/Rate Schedules"
    }

  ];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.populateQrRestaurant();
  }
   
  async populateQrRestaurant() {
    this.qrRestaurantListRows = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { qrSettings: { $exists: true } },
      projection: {
        logs: 0,
      },
      sort: { updatedAt: -1 }
    }, 100000); //the second param is running time 
    this._global.getCachedUserList().then(users => this.knownUsers = users).catch(console.error);
    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "dine-in-session",
      query: {
        "orderObj.restaurantObj._id":{
          $exists:true
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
      let tempOrders = orders.filter(o=> o.orderObj.restaurantObj._id === restaurant._id);
      this.qrRestaurantListRows[i].qrOrderNumber = tempOrders.length;
    }


  }

}
