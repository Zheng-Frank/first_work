import { TimezoneHelper } from '@qmenu/ui';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-rts-by-provider',
  templateUrl: './rts-by-provider.component.html',
  styleUrls: ['./rts-by-provider.component.css']
})
export class RtsByProviderComponent implements OnInit {


  restaurants = [];
  providers = [];
  minProviderCount = 1;
  checkedProviders = [];
  filteredRTs = [];
  now = new Date();
  constructor(private _api: ApiService) { }

  async ngOnInit() {
    await this.query();
  }

  // our salesperson only wants to know what is the time offset
  // between EST and the location of restaurant
  getTimeOffsetByTimezone(timezone) {
    if (timezone) {
      let localTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), timezone);
      let ESTTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), 'America/New_York');
      let offset = (ESTTime.valueOf() - localTime.valueOf()) / (3600 * 1000);
      return offset > 0 ? "+" + offset.toFixed(0) : offset.toFixed(0);
    } else {
      return 'N/A';
    }
  }

  getTimezoneCity(timezone) {
    return (timezone || '').split('/')[1] || '';
  }

  checkProvider(e, provider) {
    if (e.target.checked) {
      this.checkedProviders.push(provider);
    } else {
      this.checkedProviders = this.checkedProviders.filter(x => x !== provider);
    }
  }

  async query() {

    this.restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      aggregate: [
        {
          $project: {
            name: 1,
            'googleAddress.timezone': 1,
            providers: {
              "$ifNull": [
                {
                  $filter: {
                    input: {
                      $map: {
                        input: '$providers',
                        as: 'item',
                        in: '$$item.name'
                      }
                    },
                    as: 'item',
                    cond: { $ne: ['$$item', null] }
                  }
                },
                []
              ]
            }
          }
        },
        { $match: { 'providers.0': { $exists: true } } }
      ]
    }).toPromise();
    this.providers = Array.from(new Set(this.restaurants.reduce((a, c) => [...a, ...c.providers], [])))
      .sort((a, b) => a.toString().localeCompare(b.toString()));
    this.filter();
  }

  filter() {
    this.minProviderCount = Math.max(1, this.minProviderCount || 1);
    this.filteredRTs = this.restaurants.filter(rt => rt.providers.length >= this.minProviderCount && this.checkedProviders.every(p => rt.providers.includes(p)));
  }

}
