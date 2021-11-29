import { TimezoneHelper } from '@qmenu/ui';
import {Component, OnInit} from '@angular/core';
import {environment} from '../../../../environments/environment';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {Helper} from '../../../classes/helper';

@Component({
  selector: 'app-orderless-signups',
  templateUrl: './orderless-signups.component.html',
  styleUrls: ['./orderless-signups.component.css']
})
export class OrderlessSignupsComponent implements OnInit {

  restaurants = [];
  filtered = [];
  users = [];
  agent = '';
  agents = [];
  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.users = await this._global.getCachedUserList();
    await this.getRTs();
  }

  // our salesperson only wants to know what is the time offset
  // between EST and the location of restaurant
  getTimeOffsetByTimezone(timezone){
    if(timezone){
      let localTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), timezone);
      let ESTTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), 'America/New_York');
      let offset = (ESTTime.valueOf() - localTime.valueOf())/(3600*1000);
      return offset > 0 ? "+"+offset.toFixed(0) : offset.toFixed(0);
    }else{
      return 'N/A';
    }
  }

  getTimezoneCity(timezone){
    return (timezone || '').split('/')[1] || '';
  }

  async getOrderedRTs() {
    try {
      let data = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        aggregate: [
          {$group: {_id: '$restaurant'}},
          {$project: {_id: 0, rtId: '$_id'}}
        ],
        limit: 20000
      }).toPromise();
      return new Set(data.map(x => x.rtId));
    } catch (e) {
      console.log(e);
      return new Set();
    }
  }

  async getGMBPublishedPlaces() {
    try {
      let data = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        aggregate: [
          {'$unwind': '$locations'},
          {'$replaceRoot': {'newRoot': '$locations'}},
          {
            '$project': {
              'place_id': 1,
              'published': {
                '$anyElementTrue': [
                  {
                    '$ifNull': [
                      {
                        '$map': {
                          'input': '$statusHistory',
                          'as': 'item',
                          'in': {
                            '$eq': ['$$item.status', 'Published']
                          }
                        }
                      },
                      [false]
                    ]
                  }
                ]
              }
            }
          },
          {'$match': {'published': true}},
          {
            '$group': {
              '_id': {
                'place_id': '$place_id'
              }
            }
          },
          {
            '$project': {
              '_id': 0,
              'place_id': '$_id.place_id',
            }
          }
        ],
        limit: 20000
      }).toPromise();
      return new Set(data.map(x => x.place_id));
    } catch (e) {
      console.log(e);
      return new Set();
    }
  }

  async getRTs() {
    this.restaurants = [];
    let rts = [];
    try {
        rts = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        aggregate: [
          {$match: {disabled: {$ne: true}, 'googleListing.place_id': {$exists: true}}},
          {
            $project: {
              _id: 1, name: 1, rateSchedules: 1, place_id: '$googleListing.place_id',
              'googleAddress.timezone': 1
            }
          }
        ],
        limit: 20000
      }).toPromise();
    } catch (e) {
      console.log(e);
    }

    let orderedRTs = await this.getOrderedRTs();
    let gmbPublishedPlaces = await this.getGMBPublishedPlaces();

    rts.forEach(rt => {
      let agent = Helper.getSalesAgent(rt.rateSchedules, this.users);
      if (agent !== 'N/A') {
        this.agents.push(agent);
      }
      if (!orderedRTs.has(rt._id) && !gmbPublishedPlaces.has(rt.place_id)) {
        this.restaurants.push({...rt, salesAgent: agent});
      }
    });
    this.restaurants.sort((a, b) => a.name.localeCompare(b.name));
    this.agents = Array.from(new Set(this.agents)).sort((a, b) => a.localeCompare(b));
    this.filtered = this.restaurants;
  }

  filter() {
    if (this.agent) {
      this.filtered = this.restaurants.filter(x => x.salesAgent === this.agent);
    } else {
      this.filtered = this.restaurants;
    }
  }
}
