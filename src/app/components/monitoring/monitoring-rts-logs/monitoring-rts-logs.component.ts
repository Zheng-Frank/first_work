import { Log } from './../../../classes/log';
import { AlertType } from './../../../classes/alert-type';
import { environment } from './../../../../environments/environment';
import { GlobalService } from './../../../services/global.service';
import { ApiService } from 'src/app/services/api.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { RestaurantLogsComponent } from '../../restaurants/restaurant-logs/restaurant-logs.component';
import { PrunedPatchService } from 'src/app/services/prunedPatch.service';

@Component({
  selector: 'app-monitoring-rts-logs',
  templateUrl: './monitoring-rts-logs.component.html',
  styleUrls: ['./monitoring-rts-logs.component.css']
})
export class MonitoringRtsLogsComponent implements OnInit {

  @ViewChild('logList') logList: RestaurantLogsComponent;
  @ViewChild('logEditingModal') logEditingModal;
  rows = [];
  filterRows = [];
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
      label: "Logs"
    }
  ];
  restaurant;
  // filter condition
  users = [];
  user = 'All';
  logTypes = [];
  logType = 'All';
  restaurantNames = [];
  restaurantName = 'All';
  logInEditing = new Log();
  logInEditingOriginal;
  fromDate;
  toDate;
  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  isAdmin() {
    return this._global.user.roles.indexOf('ADMIN') >= 0;
  }

  async ngOnInit() {
    this.fromDate = new Date(new Date().valueOf() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0];
    this.toDate = new Date().toISOString().split('T')[0];
    await this.populateLogsOfRTs();
  }

  equal(a, b) {
    return a && b && (new Date(a.time).getTime() === new Date(b.time).getTime());
  }

  createNewLog(r) {
    this.restaurant = this.rows.find(row => row._id === r._id);
    this.logInEditing = new Log();
    this.logInEditingOriginal = undefined;
    this.logEditingModal.show();
  }

  select(restaurantLog) {
    this.restaurant = this.rows.find(row => row._id === restaurantLog.restaurant._id);
    this.logInEditing = new Log(restaurantLog.log);
    this.logInEditingOriginal = restaurantLog.log;
    this.logEditingModal.show();
  }

  onCancelCreation() {
    this.logEditingModal.hide();
  }

  onSuccessCreation(data) {
    const oldRestaurant = JSON.parse(JSON.stringify(this.restaurant));
    const updatedRestaurant = JSON.parse(JSON.stringify(oldRestaurant));
    updatedRestaurant.logs = updatedRestaurant.logs || [];
    if (!data.log.time) {
      data.log.time = new Date();
    }
    if (!data.log.username) {
      data.log.username = this._global.user.username;
    }

    // check if the original exists
    if (this.restaurant.logs && this.logInEditingOriginal &&
      this.restaurant.logs.some(l => this.equal(l, this.logInEditingOriginal))) {
      const index = this.restaurant.logs.findIndex(l => this.equal(l, this.logInEditingOriginal));
      updatedRestaurant.logs[index] = new Log(data.log);
    } else {
      updatedRestaurant.logs.push(new Log(data.log));
    }
    this.patch(oldRestaurant, updatedRestaurant, data.formEvent.acknowledge);
  }

  patch(oldRestaurant, updatedRestaurant, acknowledge) {
    this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{ old: { _id: oldRestaurant._id, logs: oldRestaurant.logs }, new: { _id: updatedRestaurant._id, logs: updatedRestaurant.logs } }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.rows.forEach(row => {
            if (row._id === updatedRestaurant._id) {
              row.logs = updatedRestaurant.logs;
            }
          });
          this.filter();
          this._global.publishAlert(
            AlertType.Success,
            'Success.'
          );

          acknowledge(null);
          this.logEditingModal.hide();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error');
          acknowledge('API Error');
        }
      );
  }

  getReversedLogs(restaurant) {
    return (restaurant.logs || []).slice().reverse().map(log => ({
      log: log,
      restaurant: restaurant
    }));
  }

  async populateLogsOfRTs() {
    if (!this.fromDate || !this.toDate) {
      return this._global.publishAlert(AlertType.Danger, "Please input a correct time date format!");
    } else if (new Date(this.fromDate).valueOf() - new Date(this.toDate).valueOf() > 0) {
      return this._global.publishAlert(AlertType.Danger, "Please input a correct date format,from time is less than or equals to time!");
    }else if(new Date(this.toDate).valueOf() - new Date(this.fromDate).valueOf() > 30*24*3600*1000){
      return this._global.publishAlert(AlertType.Danger, "Please select a smaller date range!");
    }
    let from = this.fromDate+"T00:00:00.000Z";
    let to = this.toDate+"T00:00:00.000Z";
    this.rows = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      aggregate: [
        { '$match': { disabled: { $ne: true }, logs: { $elemMatch: { time: { $gte: from, $lte: to } } } } },
        { '$project': { _id: 1, name: 1, logs: 1 } },
        { '$limit': 20000 }
      ]
    }).toPromise();
    // create filter types includes restaurants, log types, usernames
    this.rows.forEach(row => {
      if (row.name && this.restaurantNames.indexOf(row.name) === -1) {
        this.restaurantNames.push(row.name);
      }
      row.logs.forEach(log => {
        if (log.username && this.users.indexOf(log.username) === -1) {
          this.users.push(log.username);
        }
        if (log.type) {
          let typeText = log.type.split('-').join(' ');
          if (this.logTypes.indexOf(typeText) === -1){
            this.logTypes.push(typeText);
          }
        }
      });
    });
    this.restaurantNames.sort((a, b) => a.localeCompare(b));
    this.users.sort((a,b)=>a.localeCompare(b));
    if(!this.isAdmin()){
      this.user = this._global.user.username;
    }
    this.filter();
  }

  filter() {
    // filter by username
    if (this.user === 'All') {
      this.filterRows = JSON.parse(JSON.stringify(this.rows));
    } else {
      this.filterRows = JSON.parse(JSON.stringify(this.rows));
      this.filterRows = this.filterRows.map(row => {
        row.logs = row.logs.filter(log => log.username === this.user);
        return row;
      });
    }
    // filter by restaurant
    if (this.restaurantName === 'All') {
      this.filterRows = this.filterRows;
    } else {
      this.filterRows = this.filterRows.filter(row => row.name.indexOf(this.restaurantName) >= 0);
    }
    // filter by log type
    if (this.logType === 'All') {
      this.filterRows = this.filterRows;
    } else {
      this.filterRows = this.filterRows.map(row => {
        row.logs = row.logs.filter(log => log.type === this.logType.split(' ').join('-'));
        return row;
      });
    }
  }

}
