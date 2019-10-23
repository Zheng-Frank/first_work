import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from "../../classes/alert-type";
import { environment } from "../../../environments/environment";

import { of } from 'rxjs';

@Component({
  selector: 'app-bulk-messaging',
  templateUrl: './bulk-messaging.component.html',
  styleUrls: ['./bulk-messaging.component.css']
})
export class BulkMessagingComponent implements OnInit {
  @Input() restaurant;

  isSMS = true;
  isEmail = false;
  isFax = false;

  isRunning = false;

  inputRestaurantString = '58ba1a8d9b4e441100d8cdc1';
  restaurants = [];

  smsMsgContents = '';
  emailMsgContents = '';
  faxMsgContents = '';

  restaurantLoopInterval = null;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.onChange();
  }

  onChange() {
  }

  async getRestaurantById(id) {
    if (!id) {
      return;
    }

    const restaurants = await this._global.getCachedVisibleRestaurantList();
    const restaurant = restaurants.filter(rt => rt._id === id.trim())[0];
    return restaurant;
  }

  async onAddRestaurant() {
    const restaurantIdList = this.inputRestaurantString.split(',');

    restaurantIdList.forEach(async restaurantId => {
      const restaurant = await this.getRestaurantById(restaurantId.trim());
      if (restaurant) {
        this.restaurants.push(restaurant);
      }
    });

    this.inputRestaurantString = '';
  }

  onRemove(id) {
    this.restaurants = this.restaurants.filter(restaurant => restaurant._id !== id);
  }

  stopBulkSend() {
    clearInterval(this.restaurantLoopInterval);
  }

  startBulkSend() {
    let restaurantCount = 0;

    this.isRunning = true;

    this.restaurantLoopInterval = setInterval(() => {
      if (restaurantCount < this.restaurants.length) {
        const currentRestaurant = this.restaurants[restaurantCount];

        const flag = { smsError: false, emailError: false, faxError: false };

        // --- Send SMS
        if (this.isSMS) {
          const currentRestaurantSMSList = currentRestaurant.channels.filter(rt => rt.type === 'SMS');
          for (let i = 0; i < currentRestaurantSMSList.length; i++) {
            const currentSMSTo = currentRestaurantSMSList[i];

            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
              "name": "send-sms",
              "params": {
                "to": currentSMSTo.value,
                "from": "8447935942",
                "providerName": "plivo",
                "message": this.smsMsgContents
              }
            }]).subscribe(
              result => {
                // this._global.publishAlert(AlertType.Success, "Message sent successfully");
              },
              error => {
                // this._global.publishAlert(AlertType.Danger, "Error sending message");
                flag.smsError = true;
              }
            );

          }
        }


        // --- Send Email
        if (this.isEmail) {
          const currentRestaurantEmailList = currentRestaurant.channels.filter(rt => rt.type === 'Email');
          for (let j = 0; j < currentRestaurantEmailList.length; j++) {
            const currentEmailTo = currentRestaurantEmailList[j];

            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
              "name": "send-email",
              "params": {
                "to": currentEmailTo.value,
                "subject": "QMenu Notification",
                "html": this.emailMsgContents
              }
            }]).subscribe(
              result => {
                // this._global.publishAlert(AlertType.Success, "Message sent successfully");
              },
              error => {
                // this._global.publishAlert(AlertType.Danger, "Error sending message");
                flag.emailError = true;
              }
            );

          }
        }

        // --- Send Fax
        if (this.isFax) {
          const currentRestaurantFaxList = currentRestaurant.channels.filter(rt => rt.type === 'Fax');
          for (let k = 0; k < currentRestaurantFaxList.length; k++) {
            const currentFaxTo = currentRestaurantFaxList[k];

            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
              "name": "send-fax",
              "params": {
                "from": "8555582558",
                "to": currentFaxTo.value,
                "mediaUrl": this.faxMsgContents,
                "providerName": "twilio"
              }
            }]).subscribe(
              result => {
                // this._global.publishAlert(AlertType.Success,"Message sent successfully");
              },
              error => {
                // this._global.publishAlert(AlertType.Danger, "Error sending message");
                flag.faxError = true;
              }
            );

          }
        }

        if (!(flag.smsError && flag.emailError && flag.faxError)) {
          this.restaurants = this.restaurants.filter(rt => rt._id !== currentRestaurant._id);
        }


        // Next restaurant to process at the next interntal
        restaurantCount++;
      }
    }, 500);

  }

}
