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

    // load recent call logs
    const callLogs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "call-log",
      projection: {
        From: 1,
        To: 1,
        CallStatus: 1
      },
      limit: 1000000,
      sort: {
        _id: -1
      },
    }).toPromise();

    // match and count!
    callLogs.map(log => {
      const to = log.To.slice(1);
      const matched = this.phoneOrderingConfigs.find(p => log.CallStatus === 'ringing' && p.proxyNumber === to);
      if (matched) {
        this.proxyCounterMap[to] = (this.proxyCounterMap[to] || 0) + 1;
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
