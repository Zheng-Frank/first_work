import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Restaurant} from '@qmenu/ui';
import {Log} from '../../../classes/log';
import {ApiService} from '../../../services/api.service';
import {environment} from '../../../../environments/environment';
import {GlobalService} from '../../../services/global.service';
import {AlertType} from '../../../classes/alert-type';

@Component({
  selector: 'app-restaurant-logs',
  templateUrl: './restaurant-logs.component.html',
  styleUrls: ['./restaurant-logs.component.css']
})
export class RestaurantLogsComponent implements OnInit {


  @ViewChild('logEditingModal') logEditingModal;

  @Input() restaurant: Restaurant;
  @Output() reload = new EventEmitter<(rt: Restaurant) => void>();
  logInEditing = new Log();
  logInEditingOriginal;

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
  }

  equal(a, b) {
    return a && b && (new Date(a.time).getTime() === new Date(b.time).getTime());
  }


  createNewLog() {
    this.logInEditing = new Log();
    this.logInEditingOriginal = undefined;
    this.logEditingModal.show();
  }

  select(restaurantLog) {
    this.reload.emit((rt) => {
      const log = (rt.logs || []).find(x => this.equal(x, restaurantLog.log));
      if (!log) {
        this._global.publishAlert(AlertType.Danger, 'The log is deleted!');
        return;
      }
      this.logInEditing = new Log(log);
      this.logInEditingOriginal = log;
      this.logEditingModal.show();
    });
  }

  onCancelCreation() {
    this.logEditingModal.hide();
  }

  onSuccessCreation(data) {
    this.reload.emit((rt) => {
      this.restaurant = rt;
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
    });
  }

  remove(event) {
    this.reload.emit((rt) => {
      this.restaurant = rt;
      if (this.logInEditingOriginal && this.restaurant &&
        this.restaurant.logs && this.restaurant.logs.some(l => this.equal(l, this.logInEditingOriginal))) {
        const newLogs = this.restaurant.logs.filter(log => !this.equal(log, this.logInEditingOriginal));
        const updatedRestaurant = JSON.parse(JSON.stringify(this.restaurant));
        updatedRestaurant.logs = newLogs;
        this.patch(this.restaurant, updatedRestaurant, event.formEvent.acknowledge);

      } else {
        event.formEvent.acknowledge('Missing restaurant, or restaurant logs');
      }
    });
  }

  getReversedLogs(restaurant) {
    return (restaurant.logs || []).slice().reverse().map(log => ({
      log: log,
      restaurant: this.restaurant
    }));
  }

  patch(oldRestaurant, updatedRestaurant, acknowledge) {
    this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{old: {_id: oldRestaurant._id}, new: {_id: updatedRestaurant._id, logs: updatedRestaurant.logs}}])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.restaurant.logs = updatedRestaurant.logs;
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


}
