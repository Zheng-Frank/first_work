import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment'
import { GlobalService } from '../../../services/global.service';
import { Helper } from 'src/app/classes/helper';
import { AlertType } from 'src/app/classes/alert-type';
import { CacheService } from 'src/app/services/cache.service';
import { OWL_DATETIME_VALIDATORS } from 'ng-pick-datetime/date-time/date-time-picker-input.directive';
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
      this.templateNames = this._cache.get('templateNames');
      return;
    } else {
      this.templateNames = await this._api.get(environment.qmenuApiUrl + 'utils/list-template').toPromise();
      // we like to move Chinese Restaurant Template to top

      const cindex = this.templateNames.indexOf('Chinese Restaurant Template');

      if (cindex > 0) {
        this.templateNames.splice(cindex, 1);
        this.templateNames.unshift('Chinese Restaurant Template');
      }
      this._cache.set('templateNames', this.templateNames, 300 * 60);
    }
  }

  getEmail() {
    if (this.restaurant && this.restaurant.web && this.restaurant.web.qmenuWebsite) {
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      return 'info@' + domain;
    }
  }

  async populateAlias() {
    const aliasUrl = environment.customerUrl + '#/' + this.restaurant.alias;
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.restaurant._id, web: {} },
        new: { _id: this.restaurant._id, web: { qmenuWebsite: aliasUrl } },
      }
    ]).toPromise();

    this.restaurant.web = this.restaurant.web || {};
    this.restaurant.web.qmenuWebsite = aliasUrl;
    
  }


  async clickRetrieve() {
    this.retrievedObj = undefined;

    this.submitClicked = true;
    const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
    const email = 'info@' + domain;
    const host = 'mail.' + domain;
    let password = this.restaurant.web.qmenuPop3Password;

    if (!email || !password) {
      return this._global.publishAlert(AlertType.Danger, 'Fail: mising email or password');
    }

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
    const oldWeb = {};
    const newWeb = {};
    oldWeb[field] = event.oldValue;

    const newValue = (event.newValue || '').trim();

    if (field === 'qmenuPop3Password' && !this.restaurant.web.qmenuWebsite) {
      this._global.publishAlert(AlertType.Danger, 'Error: no qMenu managed website found. Please enter managed website before entering a password');
      return;
    }
    try {
      newWeb[field] = newValue;
      if (field === 'qmenuPop3Password' && event.newValue && event.newValue.length < 20) {
        // reset password:
        const email = 'info@' + Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
        newWeb[field] = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: email, phrase: event.newValue }).toPromise();
      }

      if (field === 'qmenuWebsite') {
        newWeb[field] = newWeb[field].toLowerCase();
      }

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id, web: oldWeb },
        new: { _id: this.restaurant._id, web: newWeb }
      }]).toPromise();

      // update this object
      this.restaurant.web = this.restaurant.web || {};
      this.restaurant.web[field] = newWeb[field];

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
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
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

