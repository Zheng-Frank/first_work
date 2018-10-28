import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { Log } from '../../../classes/log';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-restaurant-logs',
  templateUrl: './restaurant-logs.component.html',
  styleUrls: ['./restaurant-logs.component.css']
})
export class RestaurantLogsComponent implements OnInit {


  @ViewChild('logEditingModal') logEditingModal;

  @Input() restaurant: Restaurant;

  logInEditing = new Log();
  logInEditingOriginal;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }


  createNewLog() {
    this.logInEditing = new Log();
    this.logInEditingOriginal = undefined;
    this.logEditingModal.show();
  }

  select(log) {
    this.logInEditing = new Log(log);
    this.logInEditingOriginal = log;
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
    if (this.restaurant.logs && this.restaurant.logs.indexOf(this.logInEditingOriginal) >= 0) {
      const index = this.restaurant.logs.indexOf(this.logInEditingOriginal);
      updatedRestaurant.logs[index] = new Log(data.log);
    } else {
      updatedRestaurant.logs.push(new Log(data.log));
    }

    this.patch(oldRestaurant, updatedRestaurant, data.formEvent.acknowledge);

  }

  remove(event) {
    if (this.restaurant && this.restaurant.logs && this.restaurant.logs.indexOf(this.logInEditingOriginal) >= 0) {
      const newLogs = this.restaurant.logs.filter(log => log !== this.logInEditingOriginal);
      const updatedRestaurant = JSON.parse(JSON.stringify(this.restaurant));
      updatedRestaurant.logs = newLogs;
      this.patch(this.restaurant, updatedRestaurant, event.formEvent.acknowledge);

    } else {
      event.formEvent.acknowledge('Missing restaurant, or restaurant logs');
    }
  }

  getReversedLogs(restaurant) {
    return (restaurant.logs || []).slice().reverse();
  }

  patch(oldRestaurant, updatedRestaurant, acknowledge) {
    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: oldRestaurant, new: updatedRestaurant }]).subscribe(
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
        this._global.publishAlert(AlertType.Danger, "Error");
        acknowledge("API Error");
      }
    );
  }


}
