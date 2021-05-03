import { Component, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
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
  constructor(private _api: ApiService) { }

  toggleEditing() {
    this.editing = !this.editing;
    this.viewOnly = this.restaurant['qrSettings'].viewOnly;
  }

  async toggleViewOnly() {
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: { _id: this.restaurant._id, qrSettings: {} },
      new: { _id: this.restaurant._id, qrSettings: { viewOnly: this.viewOnly } }
    }]).toPromise();
    this.restaurant['qrSettings'].viewOnly = this.viewOnly;
    this.editing = false;
  }
}