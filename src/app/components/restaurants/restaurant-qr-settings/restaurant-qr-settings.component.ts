import { filter } from 'rxjs/operators';
import { Component, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-restaurant-qr-settings',
  templateUrl: './restaurant-qr-settings.component.html',
  styleUrls: ['./restaurant-qr-settings.component.css']
})
export class RestaurantQrSettingsComponent {
  @Input() restaurant: Restaurant;

  editing = false;
  customizedRenderingStyles;
  viewOnly;
  agent;
  showExplanation = false;
  constructor(private _api: ApiService, private _global: GlobalService) { }
 // if it has the speical number we should show whether remove it.
  havingSpecialNumber(){
    return this.restaurant.channels && this.restaurant.channels.filter(channel=>channel.type && channel.type === 'SMS' && channel.value === '2345678901').length > 0;
  }

  async addSpecialPhoneNumber(){
    if(!this.havingSpecialNumber()){
      const oldChannels = this.restaurant.channels;
      let newChannels = JSON.parse(JSON.stringify(oldChannels));
      if(newChannels.filter(channel=>channel.value === '2345678901').length > 0){
        newChannels = newChannels.map(channel => {
          if(channel.value === '2345678901'){
            channel.type = 'SMS';
            return channel;
          }
            return channel;
        });
      }else{
        newChannels.push({
          type:'SMS',
          value:'2345678901'
        });
      }
      console.log(JSON.stringify(oldChannels));
      console.log(JSON.stringify(newChannels));
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, channels: oldChannels },
        new: { _id: this.restaurant._id, channels: newChannels }
      }]).subscribe(reult=>{
        this.restaurant.channels = newChannels;
        this._global.publishAlert(AlertType.Success,'Add special phone number successfully !');
      },error=>{
        this._global.publishAlert(AlertType.Danger,'Bad add option!');
        console.log(JSON.stringify(error.message));
      });
    }else{
      const oldChannels = this.restaurant.channels;
      let newChannels = JSON.parse(JSON.stringify(oldChannels));
      newChannels = newChannels.filter(channel=>!(channel.type && channel.type === 'SMS' && channel.value === '2345678901'));
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, channels: oldChannels },
        new: { _id: this.restaurant._id, channels: newChannels }
      }]).subscribe(reult=>{
        this.restaurant.channels = newChannels;
        this._global.publishAlert(AlertType.Success,'Remove special phone number successfully !');
      },error=>{
        this._global.publishAlert(AlertType.Danger,'Bad delete option!');
        console.log(JSON.stringify(error.message));
      });
    }
    
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.viewOnly = this.qrSettings.viewOnly;
    this.agent = this.qrSettings.agent;
  }

  get qrSettings() {
    return this.restaurant['qrSettings'] || {};
  }

  populateUsername() {
    this.agent = this._global.user.username;
  }

  async update() {
    const updatedFields = {} as any;
    if (this.qrSettings.agent !== this.agent) {
      updatedFields.agent = this.agent;
      updatedFields.agentAt = new Date();
    }
    if (this.viewOnly !== this.qrSettings.viewOnly) {
      updatedFields.viewOnly = this.viewOnly;
    }
    if (Object.keys(updatedFields).length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, qrSettings: {} },
        new: { _id: this.restaurant._id, qrSettings: updatedFields }
      }]).toPromise();
      Object.assign(this.restaurant['qrSettings'], updatedFields); // directly assign it back to update existing restaurant object
    }
    this.editing = false;
  }
  
}