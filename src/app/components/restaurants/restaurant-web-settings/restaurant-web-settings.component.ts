import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Helper } from 'src/app/classes/helper';

@Component({
  selector: 'app-restaurant-web-settings',
  templateUrl: './restaurant-web-settings.component.html',
  styleUrls: ['./restaurant-web-settings.component.css']
})
export class RestaurantWebSettingsComponent implements OnInit {
  @Input() restaurant: Restaurant;

  retrievedCodeObject;
  now = new Date();
  qmenuExclusive;
  agreeToCorporate;

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
  }

  async onEdit(event, field: string) {
    const web = this.restaurant.web || {};
    const newValue = (event.newValue || '').trim();

    if (field === 'qmenuPop3Password' && !this.restaurant.web.qmenuWebsite) {
      this._global.publishAlert(AlertType.Danger, 'Error: no qMenu managed website found. Please enter managed website before entering a password');
      return;
    }
    try {
      web[field] = newValue;
      if (field === 'qmenuPop3Password' && event.newValue && event.newValue.length < 20) {
        // reset password:
        const email = 'info@' + Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
        web[field] = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', { salt: email, phrase: event.newValue }).toPromise();
      }

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id },
        new: { _id: this.restaurant._id, web: web }
      }]).toPromise();

      this.restaurant.web = web;

      this._global.publishAlert(AlertType.Success, 'Updated');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }
  
  async toggle(event, field) {
    try {
      const web = this.restaurant.web || {};
      
      const newValue = event.target.checked;
      web[field] = newValue;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {_id: this.restaurant._id},
        new: {_id: this.restaurant._id, web: web}
      }]).toPromise();

      this.restaurant.web = web;

      this._global.publishAlert(AlertType.Success, 'Updated');

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
    }
  }


  async handleUpdate() {
    const web = this.restaurant.web || {};
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id },
        new: { _id: this.restaurant._id, web: web }
      }]).toPromise();

      this.restaurant.web = web;

      this._global.publishAlert(AlertType.Success, 'Updated');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);

    }
  }

  async retrieveCode() {
    this.retrievedCodeObject = undefined;

    const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
    const host = 'mail.' + domain;
    const email = 'info@' + domain;
    let password = this.restaurant.web.qmenuPop3Password;

    try {
      if (password.length > 20) {
        password = await this._api.post(environment.qmenuApiUrl + 'utils/crypto', { salt: email, phrase: password }).toPromise();
      }
      this.retrievedCodeObject = await this._api.post(environment.autoGmbUrl + 'retrieveGodaddyEmailVerificationCode', { host: host, email: email, password: password }).toPromise();
    } catch (error) {
      alert('Error retrieving email: ' + JSON.stringify(error));
    }

  }
}

