import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
@Component({
  selector: 'app-monitoring-onboarding',
  templateUrl: './monitoring-onboarding.component.html',
  styleUrls: ['./monitoring-onboarding.component.css']
})
export class MonitoringOnboardingComponent implements OnInit {

  rows = []; // {restaurant, noMenu, noOrder, hasGmb, hadGmb}
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.populate();
  }

  async populate() {
    // all restaurant stubs
    const allRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: { $in: [null, false] }
      },
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        alias: 1,
        disabled: 1,
        "menus.disabled": 1,
        "googleListing.cid": 1,
        createdAt: 1,
        "rateSchedules.agent": 1
      },
      limit: 200000
    }).toPromise();

    // restaurantIdsWith
    const havingOrderRestaurantIdSet = new Set(await this._api.get(environment.legacyApiUrl + 'utilities/distinctOrderRestaurantIds').toPromise());
    const restaurantsWithoutValidMenusAndNotDisabled = allRestaurants.filter(r => !r.disabled && (!r.menus || r.menus.filter(menu => !menu.disabled).length === 0));
    const restaurantsWithoutAnyOrder = allRestaurants.filter(r => !havingOrderRestaurantIdSet.has(r._id));

    const dict = {};
    restaurantsWithoutValidMenusAndNotDisabled.map(r => dict[r._id] = { restaurant: r, noMenu: true });
    restaurantsWithoutAnyOrder.map(r => { dict[r._id] = dict[r._id] || { restaurant: r }; dict[r._id].noOrder = true; });

    const cids = Object.keys(dict).map(k => dict[k]).filter(r => r.restaurant.googleListing).map(r => r.restaurant.googleListing.cid);

    const testingOrders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        customer: {
          $in: [{
            "$oid": "5c2d773c51684ad9739e5168"
          }]
        }
      },
      projection: {
        restaurant: 1
      },
      limit: 20000
    }).toPromise();
console.log(testingOrders)
    const gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        "locations.cid": { $in: cids }
      },
      projection: {
        "email": 1,
        "locations.cid": 1,
        "locations.status": 1
      },
      limit: 200
    }).toPromise();

    Object.keys(dict).map(k => {
      const row = dict[k];
      const accountAndStatuses = [];
      gmbAccounts.map(account => (account.locations || []).filter(loc => loc.cid && loc.cid === (row.restaurant.googleListing || {}).cid).map(loc => {
        accountAndStatuses.push({ email: account.email, status: loc.status });
      }));
      const statusOrder = ['Duplicate', 'Verification required', 'Pending verification', 'Suspended', 'Published'];
      accountAndStatuses.sort((s1, s2) => statusOrder.indexOf(s1.status) - statusOrder.indexOf(s2.status));
      row.hadGmb = accountAndStatuses.some(i => i.status === 'Published' || i.status === 'Suspended');
      row.accountAndStatuses = accountAndStatuses;
    });

    this.rows = Object.keys(dict).map(id => dict[id]);
    this.rows.map(row => {
      row.restaurant.createdAt = new Date(row.restaurant.createdAt);
      row.agent = ((row.restaurant.rateSchedules || [])[0] || {}).agent;
    });
    this.rows.sort((r1, r2) => r2.restaurant.createdAt.valueOf() - r1.restaurant.createdAt.valueOf())

  }

  getDaysFromId(mongoId) {
    return Math.floor((this.now.valueOf() - parseInt(mongoId.substring(0, 8), 16) * 1000) / (24 * 3600000));
  }

}
