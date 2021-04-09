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
      label: "Fee Schedules"
    }
    
  ];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.populateQrRestaurant();
  }

  async populateQrRestaurant(){
      this.qrRestaurantListRows = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { qrSettings: {$exists:true} },
      projection:{

      },
      sort: { updatedAt: -1 }
    }, 100000);
    this._global.getCachedUserList().then(users => this.knownUsers = users).catch(console.error);
  }

}
