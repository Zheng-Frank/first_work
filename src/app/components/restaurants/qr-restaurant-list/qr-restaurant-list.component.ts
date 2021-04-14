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
    for (let i = 0; i < this.qrRestaurantListRows.length; i++) {
      let restaurant = this.qrRestaurantListRows[i];
      const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          $and: [ //we should use $and to ensure the order belongs to the restaurant.
            {
              restaurant: {
                $oid: restaurant._id,
              }
            },
            {  //qr setting has it code value but it is the table number
              dineInSessionObj: { $exists: true } //this property is used to remark whether the order is qr dine-in
            }
          ]
        },
        projection: {
          logs: 0,
        },
        sort: {
          createdAt: -1
        },
        limit: 10000
      }).toPromise();
      this.qrRestaurantListRows[i].qrOrderNumber = orders.length;
    }


  }

}
