import { Component, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';

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
  constructor(private _api: ApiService, private _global: GlobalService) { }

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