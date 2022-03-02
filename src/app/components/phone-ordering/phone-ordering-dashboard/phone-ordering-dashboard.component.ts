import { Component, OnInit } from '@angular/core';
import { PhoneOrdering } from 'src/app/classes/phone-ordering';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-phone-ordering-dashboard',
  templateUrl: './phone-ordering-dashboard.component.html',
  styleUrls: ['./phone-ordering-dashboard.component.css']
})
export class PhoneOrderingDashboardComponent implements OnInit {

  phoneOrderingConfigs: PhoneOrdering[] = [];
  phoneRestaurantsMap = {};
  proxyCounterMap = {};

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.load();
  }

  ngOnInit() {
  }

  async load() {
    this.phoneOrderingConfigs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "phone-ordering",
      limit: 60000
    }).toPromise();

    const restaurantList = await this._global.getCachedRestaurantListForPicker();
    this.phoneOrderingConfigs.map(po => {
      this.phoneRestaurantsMap[po.restaurantNumber] = restaurantList.filter(rt => (rt.channels || []).some(c => c.value === po.restaurantNumber));
    });

    // load recent call records and see how many times called
    const callRecords = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "call-record",
      projection: {
        from: 1,
        to: 1,
      },
      limit: 1000000,
      sort: {
        _id: -1
      },
    }).toPromise();

    // match and count!
    callRecords.map(log => {
      const matched = this.phoneOrderingConfigs.find(p => p.proxyNumber === log.to);
      if (matched) {
        this.proxyCounterMap[log.to] = (this.proxyCounterMap[log.to] || 0) + 1;
      }
    });
  }

  getCallCount(phoneNumber) {
    return this.proxyCounterMap[phoneNumber] || 0;
  }

  getRestaurants(phoneNumber) {
    return this.phoneRestaurantsMap[phoneNumber] || [];
  }

}
