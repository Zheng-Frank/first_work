import { AlertType } from './../../../classes/alert-type';
import { Log } from 'src/app/classes/log';
import { environment } from './../../../../environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-monitoring-vip-restaurants',
  templateUrl: './monitoring-vip-restaurants.component.html',
  styleUrls: ['./monitoring-vip-restaurants.component.css']
})
export class MonitoringVipRestaurantsComponent implements OnInit {

  @ViewChild('logEditingModal') logEditingModal;
  vipRTs = [];

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
      label: "Logs",
    }
  ];

  logInEditing: Log = new Log({ type: 'vip-follow-up', time: new Date() });
  activeRestaurant;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.loadVIPRestaurants();
  }

  /**
   * VIP RTs: 
    1. enabled,
    2. have invoice, 
    3. anyone commission of invoice > 200
    notice that: anyone commission
   */
  async loadVIPRestaurants() {
    const invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      aggregate: [
        {
          $group: {
            _id: {
              restaurantId: '$restaurant.id'
            },
            invoices: {
              $push: {
                invoiceId: '$_id',
                commission: '$commission'
              }
            }
          }
        },
        {
          $project: {
            invoices: {
              $filter: {
                input: '$invoices',
                as: 'invoice',
                cond: { $lte: ['$$invoice.commission', 200] }
              }
            }
          }
        },
        {
          $match: {
            invoices: {
              $size: 0
            }
          }
        },
      ]
    }).toPromise();
    
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      aggregate: [
        {
          $match: {
            disabled: {
              $ne: true
            }
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            'googleAddress.timezone': 1,
            logs: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: {
                  $eq: ['$$log.type', 'vip-follow-up']
                }
              }
            }
          }
        }
      ],
      limit: 20000
    }).toPromise();
    this.vipRTs = restaurants.filter(restaurant => invoices.some(invoice => invoice._id.restaurantId === restaurant._id));
  }

  async addLog(row) {
    this.logInEditing = new Log({ type: 'vip-follow-up', time: new Date() });
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
        this.vipRTs.find(r => r._id === this.activeRestaurant._id).logs = [...newRestaurant.logs];
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
