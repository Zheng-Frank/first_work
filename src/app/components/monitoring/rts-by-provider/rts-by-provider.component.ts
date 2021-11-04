import { Component, OnInit } from '@angular/core';
import {environment} from '../../../../environments/environment';
import {ApiService} from '../../../services/api.service';

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

  constructor(private _api: ApiService) { }

  async ngOnInit() {
    await this.query();
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
                    cond: {$ne: ['$$item', null]}
                  }
                },
                []
              ]
            }
          }
        },
        {$match: {'providers.0': {$exists: true}}}
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
