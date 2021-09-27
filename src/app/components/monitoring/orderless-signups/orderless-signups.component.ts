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

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.users = await this._global.getCachedUserList();
    await this.getRTs();
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
              _id: 1, name: 1, rateSchedules: 1, place_id: '$googleListing.place_id'
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
