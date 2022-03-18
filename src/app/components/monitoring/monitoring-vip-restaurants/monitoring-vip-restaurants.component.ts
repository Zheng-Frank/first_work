import { TimezoneHelper } from '@qmenu/ui';
import { AlertType } from './../../../classes/alert-type';
import { Log } from 'src/app/classes/log';
import { environment } from './../../../../environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit, ViewChild } from '@angular/core';

enum ViewTypes {
  All = 'All',
  Overdue = 'Followup overdue',
  NotOverdue = 'Followup not overdue'
}

enum RuleTypes {
  Six_Months = '6 months',
  Three_Months = '3 months'
}

@Component({
  selector: 'app-monitoring-vip-restaurants',
  templateUrl: './monitoring-vip-restaurants.component.html',
  styleUrls: ['./monitoring-vip-restaurants.component.css']
})
export class MonitoringVipRestaurantsComponent implements OnInit {

  @ViewChild('logEditingModal') logEditingModal;
  vipRTs = [];
  filterVipRTs = [];
  now = new Date();

  restaurantsColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Score',
      paths: ['score'],
      sort: (a, b) => a - b
    },
    {
      label: 'Avg Commission(overall)',
      paths: ['avgAll'],
      sort: (a, b) => a - b
    },
    {
      label: 'Avg Commission(last 3 months)',
      paths: ['avg3M'],
      sort: (a, b) => a - b
    },
    {
      label: "Timezone (as Offset to EST)",
      paths: ['googleAddress', 'timezone'],
      sort: (a, b) => Number(this.getTimeOffsetByTimezone(a)) - Number(this.getTimeOffsetByTimezone(b))
    },
    {
      label: "Last Follow up",
      paths: ['lastFollowUp'],
      sort: (a, b) => new Date(a || 0).valueOf() - new Date(b || 0).valueOf()
    },
    {
      label: "Logs",
    }
  ];
  vipFollowUpLogType = 'vip-follow-up';
  logInEditing: Log = new Log({ type: this.vipFollowUpLogType, time: new Date() });
  activeRestaurant;
  // filter conditions
  viewModes = [ViewTypes.All, ViewTypes.Overdue, ViewTypes.NotOverdue];
  viewMode = ViewTypes.All;
  rules = [RuleTypes.Six_Months, RuleTypes.Three_Months];
  rule = RuleTypes.Six_Months;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.loadVIPRestaurants();
  }

  get viewTypes() {
    return ViewTypes
  }

  filterFollowUp() {
    switch (this.viewMode) {
      case ViewTypes.All:
        // all includes: overdue, or not overdue in six month rules, three month, or haven't lastFollowup
        this.filterVipRTs = this.vipRTs;
        break;
      case ViewTypes.Overdue:
        this.filterVipRTs = this.vipRTs.filter(vipRT => this.followUpOverdue(vipRT) || !vipRT.lastFollowUp);
        break;
      case ViewTypes.NotOverdue:
        this.filterVipRTs = this.vipRTs.filter(vipRT => vipRT.lastFollowUp && !this.followUpOverdue(vipRT));
        break;

      default:
        break;
    }
  }

  followUpOverdue(rt) {
    // six months
    if (this.rule === RuleTypes.Six_Months) {
      return rt.lastFollowUp && rt.lastFollowUp.valueOf() <= (this.now.valueOf() - 6 * 30 * 24 * 3600 * 1000);
    }
    // three months
    if (this.rule === RuleTypes.Three_Months) {
      return rt.lastFollowUp && rt.lastFollowUp.valueOf() <= (this.now.valueOf() - 3 * 30 * 24 * 3600 * 1000);
    }
  }

  getOverdueDays(rt, isOverDue) {
    if (isOverDue) { // need to calculate delta with 180 or 90 days
      // six months
      if (this.rule === RuleTypes.Six_Months) {
        return Math.round((this.now.valueOf() - 6 * 30 * 24 * 3600 * 1000 - rt.lastFollowUp.valueOf()) / (24 * 3600 * 1000));
      }
      // three months
      if (this.rule === RuleTypes.Three_Months) {
        return Math.round((this.now.valueOf() - 3 * 30 * 24 * 3600 * 1000 - rt.lastFollowUp.valueOf()) / (24 * 3600 * 1000));
      }
    } else {
      // six months
      if (this.rule === RuleTypes.Six_Months) {
        return Math.round((this.now.valueOf() - rt.lastFollowUp.valueOf()) / (24 * 3600 * 1000));
      }
      // three months
      if (this.rule === RuleTypes.Three_Months) {
        return Math.round((this.now.valueOf() - rt.lastFollowUp.valueOf()) / (24 * 3600 * 1000));
      }
    }

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

  /**
   * VIP RTs:
    1. enabled,
    2. have invoice,
    3. invoice:
    - Average invoice for the RT is $150+ per month overall
    - Average invoice for the RT is $150+ per month over last 3 months
    notice that: anyone commission
   */
  async loadVIPRestaurants() {
    const avgAll = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      aggregate: [
        {
          $project: {
            'rtId': '$restaurant.id',
            commission: {
              $cond: {
                if: { $gt: ['$commission', 0] }, then: '$commission', else: {$add: ['$commission', {$ifNull: ['$feesForQmenu', 0]}]}
              }
            },
            createdAt: 1
          }
        },
        {
          $group: {
            _id: {rtId: '$rtId'},
            avgAll: {$avg: '$commission'},
            invs: {
              $push: {
                commission: '$commission',
                createdAt: '$createdAt'
              }
            }
          }
        },
        {
          $project: {
            rtId: '$_id.rtId', _id: 0,
            avgAll: 1,
            avg3M: {
              $avg: {
                $map: {
                  input: {
                    $filter: {
                      input: '$invs',
                      as: 'inv',
                      cond: {
                        $gte: ['$$inv.createdAt', {$dateFromString: {dateString: new Date(new Date().valueOf() - 3 * 30 * 24 * 3600 * 1000)}} ]
                      }
                    }
                  },
                  as: 'item',
                  in: '$$item.commission'
                }
              }
            },
          }
        },
        {$match: {$or: [{avgAll: {$gte: 150}}, {avg3M: {$gte: 150}}]}}
      ]
    }).toPromise();
    const dict = {};
    avgAll.forEach(x => dict[x.rtId] = x)
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      aggregate: [
        {$match: {disabled: {$ne: true}}},
        {
          $project: {
            _id: 1,
            name: 1,
            score: 1,
            'googleAddress.timezone': 1,
            logs: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: {
                  $eq: ['$$log.type', this.vipFollowUpLogType]
                }
              }
            }
          }
        }
      ]
    }).toPromise();
    this.vipRTs = restaurants.filter(({_id}) => !!dict[_id]).map(r => {
      let { logs, _id } = r;
      if (logs && logs.length > 0) {
        logs.sort((l1, l2) => new Date(l2.time).valueOf() - new Date(l1.time).valueOf());
        r.lastFollowUp = new Date(logs[0].time);
      }
      let commissions = dict[_id];
      return {...r, ...commissions};
    });
    this.filterFollowUp();
  }

  async addLog(row) {
    this.logInEditing = new Log({ type: this.vipFollowUpLogType, time: new Date() });
    this.activeRestaurant = row;
    let [restaurant] = await this.getRestaurant(this.activeRestaurant._id);
    this.activeRestaurant.logs = restaurant.logs || [];
    this.logEditingModal.show();
  }

  // load old logs of restaurant which need to be updated to ensure the integrity of data.
  async getRestaurant(rtId) {
    let restaurant = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: {
          $oid: rtId
        }
      },
      projection: {
        logs: 1
      },
      limit: 1
    }).toPromise();
    return restaurant;
  }

  onSuccessAddLog(event) {
    event.log.time = event.log.time ? event.log.time : new Date();
    event.log.username = event.log.username ? event.log.username : this._global.user.username;
    this.activeRestaurant.logs.push(event.log);

    const newRestaurant = { _id: this.activeRestaurant._id, logs: [...this.activeRestaurant.logs] };

    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{
        old: { _id: this.activeRestaurant._id },
        new: { _id: newRestaurant._id, logs: newRestaurant.logs }
      }]).subscribe(result => {
        this.vipRTs.forEach(r => {
          if (r._id === this.activeRestaurant._id) {
            r.logs = [...newRestaurant.logs];
            // also need to update last follow up besides logs
            let logs = r.logs.filter(log => log.type === this.vipFollowUpLogType);
            logs.sort((l1, l2) => new Date(l2.time).valueOf() - new Date(l1.time).valueOf());
            r.lastFollowUp = new Date(logs[0].time);
          }
        });
        this._global.publishAlert(AlertType.Success, 'Log added successfully');

        event.formEvent.acknowledge(null);
        this.logEditingModal.hide();
      },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error while adding log');
          event.formEvent.acknowledge('Error while adding log');
        }
      );
  }

  onCancelAddLog() {
    this.logEditingModal.hide();
  }



}
