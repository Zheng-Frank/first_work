import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Hour } from '@qmenu/ui';
@Component({
  selector: 'app-monitoring-hours',
  templateUrl: './monitoring-hours.component.html',
  styleUrls: ['./monitoring-hours.component.css']
})
export class MonitoringHoursComponent implements OnInit {
  rows = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.populate();
  }

  async populate() {
    // all restaurant stubs
    const allRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        "menus.hours": 1,
        "menus.name": 1,
        "googleAddress.formatted_address": 1,
        offsetToEST: 1
      },
      limit: 200000
    }).toPromise();

    this.rows = allRestaurants.map(r => {
      const badMenuAndHours = [];
      (r.menus || []).map(menu => (menu.hours || []).map(hour => {
        const item = {
          menu: menu,
          hour: new Hour(hour)
        };

        if (!hour) {
          badMenuAndHours.push(item);
          return {
            restaurant: r,
            badMenuAndHours: badMenuAndHours
          };
        }
        let timeDiff = new Date(hour.fromTime).valueOf() - new Date(hour.toTime).valueOf();

        if (timeDiff >= 0) {
          badMenuAndHours.push(item)
        }
      }));
      return {
        restaurant: r,
        badMenuAndHours: badMenuAndHours
      };
    }).filter(item => item.badMenuAndHours.length > 0);

  }
}
