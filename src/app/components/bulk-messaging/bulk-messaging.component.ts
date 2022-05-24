import { AlertType } from './../../classes/alert-type';
import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from "../../../environments/environment";

enum languageTypes {
  All = 'ALL',
  Chinese = 'CHINESE',
  English = 'ENGLISH',
  None = 'NONE'
}

enum copyTypes {
  SMS = 'SMS',
  Email = 'Email',
  Fax = 'Fax'
}

@Component({
  selector: 'app-bulk-messaging',
  templateUrl: './bulk-messaging.component.html',
  styleUrls: ['./bulk-messaging.component.css']
})
export class BulkMessagingComponent implements OnInit {
  @Input() restaurant;
  @Input() ePLRestaurants = [];// enable prefer language restaurants

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

  filterEPLRestaurants = [];
  selectTypes = [languageTypes.All, languageTypes.English, languageTypes.Chinese, languageTypes.None];
  selectType = languageTypes.All;
  copies = [copyTypes.SMS, copyTypes.Email, copyTypes.Fax];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.onChange();
  }
  
  isAdmin() {
    return this._global.user.roles.some(r => r === 'ADMIN');
  }

  copyRTInfos(field) {
    let content = [];
    this.restaurants.map(rt => rt.channels).forEach(channels => {
      const fieldChannels = channels.filter(ch => ch.type === field).map(ch => ch.value);
      fieldChannels.forEach(fieldChannel => content.indexOf(fieldChannel) === -1 && content.push(fieldChannel));
    });
  
    let text = `${content.join(', ')}`;
    const handleCopy = (e: ClipboardEvent) => {
      // clipboardData maybe null
      e.clipboardData && e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      // removeEventListener should input second params
      document.removeEventListener('copy', handleCopy);
    };
    document.addEventListener('copy', handleCopy);
    document.execCommand('copy');
    this._global.publishAlert(AlertType.Success, `${content.length} has copyed to your clipboard ~`, 1000);
  }

  onChange() {
    this.filterEPLRestaurants = this.ePLRestaurants;
  }

  filterRestaurantByLanguage() {
    this.inputRestaurantString = '';
    switch (this.selectType) {
      case languageTypes.All:
        this.filterEPLRestaurants = this.ePLRestaurants.filter(rt => !rt.disabled ? true : false);;
        break;
      case languageTypes.English:
        this.filterEPLRestaurants = this.ePLRestaurants.filter(rt => !rt.disabled ? rt.preferredLanguage === languageTypes.English : false);
        break;
      case languageTypes.Chinese:
        this.filterEPLRestaurants = this.ePLRestaurants.filter(rt => !rt.disabled ? rt.preferredLanguage === languageTypes.Chinese : false);
        break;
      case languageTypes.None:
        this.filterEPLRestaurants = this.ePLRestaurants.filter(rt => !rt.disabled && rt.preferredLanguage !== languageTypes.English && rt.preferredLanguage !== languageTypes.Chinese);
      default:
        break;
    }
    this.inputRestaurantString = this.filterEPLRestaurants.map(rt => rt._id).join(', ');
  }

  async onAddRestaurant() {
    this.restaurants.length = 0;
    this.inputRestaurantString = this.inputRestaurantString.replace(/\s+/g, ' ');
    const restaurantIdList = this.inputRestaurantString.split(',').map(str => str.trim());
    let tempRestaurantIdList = [];
    restaurantIdList.forEach(rt => {
      if (tempRestaurantIdList.indexOf(rt) === -1) {
        tempRestaurantIdList.push(rt);
      }
    });
    tempRestaurantIdList.forEach(restaurantId => {
      const restaurant = this.ePLRestaurants.find(rt => rt._id === restaurantId);
      if (restaurant) {
        this.restaurants.push(restaurant);
      }
    });
    this.inputRestaurantString = '';
  }

  onRemove(id) {
    this.restaurants = this.restaurants.filter(restaurant => restaurant._id !== id);
  }

  onClearRestaurants() {
    this.restaurants.length = 0;
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
                "message": this.smsMsgContents,
                "trigger": {
                  "id": this._global.user._id,
                  "name": this._global.user.username,
                  "source": "CSR",
                  "module": "bulk messaging"
                }
              }
            }]).toPromise();
          }
        }


        // Email
        if (this.isEmail) {
          const currentRestaurantEmailList = currentRestaurant.channels.filter(r => r.type === 'Email');
          for (let rtEmail of currentRestaurantEmailList) {
            console.log('Sending Email to ', rtEmail.value, this.emailMsgContents);

            await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
              "name": "send-email",
              "params": {
                "to": rtEmail.value,
                "subject": "qMenu Newsletter",
                "html": this.emailMsgContents,
                "trigger": {
                  "id": this._global.user._id,
                  "name": this._global.user.username,
                  "source": "CSR",
                  "module": "bulk messaging"
                }
              }
            }]).toPromise();
          }
        }


        // Fax
        if (this.isFax) {
          const currentRestaurantFaxList = currentRestaurant.channels.filter(r => r.type === 'Fax');
          for (let rtFax of currentRestaurantFaxList) {
            console.log('Sending Fax to ', rtFax.value, this.faxMsgContents);

            await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
              "name": "send-fax",
              "params": {
                "from": "4704356926",
                "to": rtFax.value,
                "mediaUrl": this.faxMsgContents,
                "providerName": "telnyx",
                "trigger": {
                  "id": this._global.user._id,
                  "name": this._global.user.username,
                  "source": "CSR",
                  "module": "bulk messaging"
                }
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
