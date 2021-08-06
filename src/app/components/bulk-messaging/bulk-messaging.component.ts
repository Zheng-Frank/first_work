import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from "../../../environments/environment";

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

  inputRestaurantString = '';
  restaurants = [];

  smsMsgContents = '';
  emailMsgContents = '';
  faxMsgContents = '';

  currentStatus = '';

  isError = false;

  processedRestaurantIds = new Set();

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

    const restaurants = await this._global.getCachedRestaurantListForPicker();
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
    this.isRunning = false;
  }

  async startBulkSend() {

    this.isError = false;
    this.isRunning = true;

    for (let currentRestaurant of this.restaurants) {

      if (!this.isRunning)
        break;

      if (this.processedRestaurantIds.has(currentRestaurant._id))
        continue;

      this.processedRestaurantIds.add(currentRestaurant._id);

      // process it
      try {
        // SMS
        if (this.isSMS) {
          const currentRestaurantSMSList = currentRestaurant.channels.filter(r => r.type === 'SMS');
          for (let rtSMS of currentRestaurantSMSList) {
            console.log('Sending SMS to ', rtSMS.value, this.smsMsgContents);

            await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
              "name": "send-sms",
              "params": {
                "to": rtSMS.value,
                "from": "8557592648",
                "providerName": "plivo",
                "message": this.smsMsgContents
              }
            }]).toPromise();
          }
        }


        // Email
        if (this.isEmail) {
          const currentRestaurantEmailList = currentRestaurant.channels.filter(r => r.type === 'Email');
          for (let rtEmail of currentRestaurantEmailList) {
            console.log('Sending Email to ', rtEmail.value, this.emailMsgContents);

            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
              "name": "send-email",
              "params": {
                "to": rtEmail.value,
                "subject": "qMenu Newsletter",
                "html": this.emailMsgContents
              }
            }]).toPromise();
          }
        }


        // Fax
        if (this.isFax) {
          const currentRestaurantFaxList = currentRestaurant.channels.filter(r => r.type === 'Fax');
          for (let rtFax of currentRestaurantFaxList) {
            console.log('Sending Fax to ', rtFax.value, this.faxMsgContents);

            this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
              "name": "send-fax",
              "params": {
                "from": "8555582558",
                "to": rtFax.value,
                "mediaUrl": this.faxMsgContents,
                "providerName": "twilio"
              }
            }]).toPromise();
          }
        }

        this.currentStatus = `Processing ${currentRestaurant.name}... `;
        await new Promise(resolve => setTimeout(resolve, 1000 * 2));
        this.currentStatus = `${this.currentStatus} Done`;
        this.restaurants = this.restaurants.filter(r => r._id !== currentRestaurant._id);
        this.processedRestaurantIds.delete(currentRestaurant._id);

      } catch (error) {
        console.error('Error sending SMS/Email/Fax to restaurant', currentRestaurant._id, error);
        this.isError = true;
      }

    }

    this.currentStatus = 'Task Completed.'
    this.isRunning = false;

  }

}
