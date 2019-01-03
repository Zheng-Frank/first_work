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
        disabled: null
      },
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        alias: 1,
        disabled: 1,
        "menus.disabled": 1,
        createdAt: 1,
        "rateSchedules.agent": 1
      },
      limit: 200000
    }).toPromise();

    // restaurantIdsWith
    const havingOrderRestaurantIdSet = new Set(await this._api.get(environment.legacyApiUrl + 'utilities/distinctOrderRestaurantIds').toPromise());
    const restaurantsWithoutValidMenusAndNotDisabled = allRestaurants.filter(r => !r.disabled && (!r.menus || r.menus.filter(menu => !menu.disabled).length === 0));
    console.log('no menu: ', restaurantsWithoutValidMenusAndNotDisabled);
    const restaurantsWithoutAnyOrder = allRestaurants.filter(r => !havingOrderRestaurantIdSet.has(r._id));
    console.log('no order: ', restaurantsWithoutAnyOrder);

    const dict = {};
    restaurantsWithoutValidMenusAndNotDisabled.map(r => dict[r._id] = { restaurant: r, noMenu: true });
    restaurantsWithoutAnyOrder.map(r => { dict[r._id] = dict[r._id] || { restaurant: r }; dict[r._id].noOrder = true; });

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {
        qmenuId: { $in: Object.keys(dict) },
      },
      projection: {
        name: 1,
        "gmbOwnerships": { $slice: -2 },
        qmenuId: 1
      },
      limit: 200
    }).toPromise();

    gmbBizList.map(biz => {
      const hasGmb = biz.gmbOwnerships && biz.gmbOwnerships.length > 0 && biz.gmbOwnerships[biz.gmbOwnerships.length - 1].status === 'Published';
      const hadGmb = biz.gmbOwnerships && (biz.gmbOwnerships.length > 1 || (biz.gmbOwnerships.length > 0 && biz.gmbOwnerships[biz.gmbOwnerships.length - 1].email));
      dict[biz.qmenuId].hasGmb = hasGmb;
      dict[biz.qmenuId].hadGmb = hadGmb;
      dict[biz.qmenuId].matchedGmb = true;
    });

    this.rows = Object.keys(dict).map(id => dict[id]);
    this.rows.map(row => {
      row.restaurant.createdAt = new Date(row.restaurant.createdAt);
      row.agent = ((row.restaurant.rateSchedules || [])[0] || {}).agent;
    });
    this.rows.sort((r1, r2) => r2.restaurant.createdAt.valueOf() - r1.restaurant.createdAt.valueOf())
    console.log(gmbBizList);

  }

  getDaysFromId(mongoId) {
    return Math.floor((this.now.valueOf() - parseInt(mongoId.substring(0, 8), 16) * 1000) / (24 * 3600000));
  }

}
