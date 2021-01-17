import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-restaurant-fax-settings',
  templateUrl: './fax-settings.component.html',
  styleUrls: ['./fax-settings.component.css']
})
export class RestaurantFaxSettingsComponent {
  @Input() restaurant: Restaurant;

  editing = false;
  customizedRenderingStyles;

  constructor(private _api: ApiService) { }

  toggleEditing() {
    this.editing = !this.editing;
    this.customizedRenderingStyles = this.restaurant.customizedRenderingStyles;
  }

  async update() {

    const customizedRenderingStyles = (this.customizedRenderingStyles || '').trim();
    if (this.restaurant.customizedRenderingStyles !== customizedRenderingStyles) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, customizedRenderingStyles: this.restaurant.customizedRenderingStyles },
        new: { _id: this.restaurant._id, customizedRenderingStyles: customizedRenderingStyles }
      }]).toPromise();
      this.restaurant.customizedRenderingStyles = customizedRenderingStyles;
    }
    this.editing = false;
  }
}