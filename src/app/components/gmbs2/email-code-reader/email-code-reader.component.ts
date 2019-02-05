import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment'
import { GlobalService } from '../../../services/global.service';
import { Helper } from 'src/app/classes/helper';
import { AlertType } from 'src/app/classes/alert-type';
import { CacheService } from 'src/app/services/cache.service';
@Component({
  selector: 'app-email-code-reader',
  templateUrl: './email-code-reader.component.html',
  styleUrls: ['./email-code-reader.component.css']
})

export class EmailCodeReaderComponent implements OnInit {

  @Input() restaurant;

  submitClicked = false;
  retrievedObj: any;
  apiRequesting = false;

  now = new Date();
  templateNames = [];
  constructor(private _api: ApiService, private _cache: CacheService, private _global: GlobalService) { }

  async ngOnInit() {
    if (this._cache.get('templateNames') && this._cache.get('templateNames').length > 0) {
      return this._cache.get('templateNames');
    } else {
      this.templateNames = await this._api.get(environment.qmenuApiUrl + 'utils/list-template').toPromise();
      // we like to move Chinese Restaurant Template to top
      const cindex = this.templateNames.indexOf('Chinese Restaurant Template');
      if (cindex > 0) {
        this.templateNames.splice(cindex, 1);
        this.templateNames.unshift('Chinese Restaurant Template');
        this._cache.set('templateNames', this.templateNames, 300 * 60);
      }
    }
  }

  getEmail() {
    if (this.restaurant && this.restaurant.web && this.restaurant.web.qmenuWebsite) {
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      return 'info@' + domain;
    }
  }


  async clickRetrieve() {
    this.retrievedObj = undefined;

    this.submitClicked = true;
    const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
    const email = 'info@' + domain;
    const host = 'mail.' + domain;
    let password = this.restaurant.web.qmenuPop3Password;


    if (email && host && password) {
      this.apiRequesting = true;
      if (password.length > 20) {
        password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: email, phrase: password }).toPromise();
      }

      try {
        const result = await this._api.post(environment.autoGmbUrl + 'retrieveGodaddyEmailVerificationCode', { host: host, email: email, password: password }).toPromise();
        this.apiRequesting = false;
        this.retrievedObj = result;
        this.retrievedObj.time = new Date(Date.parse(this.retrievedObj.time));
        this.now = new Date();
      } catch (error) {
        this.apiRequesting = false;
        alert('Error retrieving email');
      }
    }
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
        web[field] = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: email, phrase: event.newValue }).toPromise();
      }

      if (field !== 'qmenuPop3Password') {
        web[field] = web[field].trim().toLowerCase();
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

  async injectWebsite() {

    try {
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website domain');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-template', {
        domain: domain,
        templateName: this.restaurant.web.templateName,
        restaurantId: this.restaurant._id
      }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success');

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed: ' + JSON.stringify(error));
    }
  }



}

