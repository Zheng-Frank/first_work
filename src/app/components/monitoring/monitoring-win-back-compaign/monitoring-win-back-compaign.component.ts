import { AlertType } from './../../../classes/alert-type';
import { GlobalService } from 'src/app/services/global.service';
import { Log } from './../../../classes/log';
import { ApiService } from 'src/app/services/api.service';
import { environment } from './../../../../environments/environment.qa';
import { Component, OnInit, ViewChild } from '@angular/core';

enum tier1PotentialTypes {
  All = 'Tier 1 Potential Types?',
  GMB_Based = 'GMB-based',
  History_Based = 'History-based'
}

@Component({
  selector: 'app-monitoring-win-back-compaign',
  templateUrl: './monitoring-win-back-compaign.component.html',
  styleUrls: ['./monitoring-win-back-compaign.component.css']
})
export class MonitoringWinBackCompaignComponent implements OnInit {
  @ViewChild('logEditingModal') logEditingModal;
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
      label: "Tier 1 Potential (orders across GMB duration)"
    },
    {
      label: 'Current Tier (orders/mo)',
      paths: ['tier'],
      sort: (a, b) => a - b
    },
    {
      label: "Logs",
    }
  ];
  tier1PotentialOptions = [tier1PotentialTypes.All, tier1PotentialTypes.GMB_Based, tier1PotentialTypes.History_Based];
  tier1PotentialOption = tier1PotentialTypes.All;
  rows = [];
  filteredRows = [];
  activeRow;
  winbackLogType = 'tier-1-winback';
  logInEditing: Log = new Log({ type: this.winbackLogType, time: new Date() });
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.populateWinBackRTs();
  }

  get tier1PotentialTypes() {
    return tier1PotentialTypes;
  }

  async populateWinBackRTs() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "restaurant",
      aggregate: [
        {
          $match: {
            "computed.activities": {
              $exists: true
            },
            "computed.gmbPositiveScore": {
              $exists: true
            }
          }
        },
        {
          $project: {
            name: 1,
            "googleAddress.timezone": 1,
            tier: {
              $slice: ["$computed.tier", 1]
            },
            activities: "$computed.activities",
            gmbPositiveScore: "$computed.gmbPositiveScore"
          }
        }
      ],
    }).toPromise();
    // generate tier data
    restaurants.forEach(row => {
      // compute tier of rt
      let latest = ((row.restaurant.computed || {}).tier || [])[0];
      row.restaurant.tier = this.getTier(latest ? latest.ordersPerMonth : 0);
    });
    this.rows = restaurants;
  }

  getTier(ordersPerMonth = 0) {
    if (ordersPerMonth > 125) { // VIP
      return 0;
    }
    if (ordersPerMonth > 40) {
      return 1;
    }
    if (ordersPerMonth > 4) {
      return 2;
    }
    return 3;
  }

  filterRows() {
    this.filteredRows = this.rows;
    if (this.tier1PotentialOption !== tier1PotentialTypes.All) {
      if (this.tier1PotentialOption === tier1PotentialTypes.GMB_Based) {
        this.filteredRows = this.filteredRows.filter(row => row.gmbPositiveScore.ordersPerMonth > 40);
      } else if (this.tier1PotentialOption === tier1PotentialTypes.History_Based) {
        this.filteredRows = this.filteredRows.filter(row => {
          let count = 0;
          for (let i = 0; i < row.activities.length; i++) {
            let activity = row.activities[i];
            if (count >= 3) {
              break;
            }
            if (i < row.activities.length - 1) {
              if (activity > 40 && row.activities[i + 1] > 40) {
                count++;
              } else {
                count = 0;
              }
            }
          }
          return count >= 3;
        });
      }
    }
  }

  async addLog(row) {
    this.logInEditing = new Log({ type: this.winbackLogType, time: new Date() });
    this.activeRow = row;
    let [restaurant] = await this.getRestaurant(this.activeRow._id);
    this.activeRow.logs = restaurant.logs || [];
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
    this.activeRow.logs.push(event.log);

    const newRestaurant = { _id: this.activeRow._id, logs: [...this.activeRow.logs] };

    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{
        old: { _id: this.activeRow._id },
        new: { _id: newRestaurant._id, logs: newRestaurant.logs }
      }]).subscribe(result => {
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
