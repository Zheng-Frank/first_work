import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { TimezoneService } from "../../../services/timezone.service"
import { Hour } from '@qmenu/ui';
@Component({
  selector: 'app-monitoring-hours',
  templateUrl: './monitoring-hours.component.html',
  styleUrls: ['./monitoring-hours.component.css']
})
export class MonitoringHoursComponent implements OnInit {
  rows = [];
  constructor(private _api: ApiService, private _global: GlobalService, private _timezone: TimezoneService) { }

  now = new Date();
  ngOnInit() {
    this.populate();
  }

  async populate() {
    // all restaurant stubs

    const allRestaurants = [];
    const batchSize = 4000;
    let skip = 0;
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: {
          name: 1,
          "menus.hours": 1,
          "menus.name": 1,
          "googleAddress.formatted_address": 1,
          "googleAddress.timezone": 1
        },
        skip: skip,
        limit: batchSize
      }).toPromise();
      if (batch.length === 0) {
        break;
      }
      allRestaurants.push(...batch);
      skip += batchSize;
    }


    this.rows = allRestaurants.map(r => {
      const badMenuAndHours = [];
      (r.menus || []).map(menu => (menu.hours || []).map(hour => {

        if (!hour) {
          const item = {
            menu: menu
          };
          badMenuAndHours.push(item);
        }
        try {
          let timeDiff = new Date(hour.fromTime).valueOf() - new Date(hour.toTime).valueOf();

          if (timeDiff >= 0) {
            badMenuAndHours.push({
              menu: menu,
              hour: new Hour(hour)
            })
          }
        } catch (error) {
          console.log(hour);
        }

      }));

      return {
        restaurant: r,
        badMenuAndHours: badMenuAndHours
      };
    }).filter(item => item.badMenuAndHours.length > 0);

  }
}
