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
    this.apiRequesting = true;
    this.submitClicked = true;

    try {
      // const result = await this._api.post(environment.autoGmbUrl + 'retrieveGodaddyEmailVerificationCode', { host: host, email: email, password: password }).toPromise();

      const result = await this._api.post(environment.appApiUrl + 'utils/read-godaddy-gmb-pin', { restaurantId: this.restaurant._id }).toPromise();


      this.apiRequesting = false;
      this.retrievedObj = result;
      this.retrievedObj.time = new Date(Date.parse(this.retrievedObj.time));
      this.now = new Date();
    } catch (error) {
      this.apiRequesting = false;
      alert('Error retrieving email');
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
        alert("pop3 email is obsolete")
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

  async injectWebsiteAws() {

    try {
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        domain: domain,
        templateName: this.restaurant.web.templateName,
        restaurantId: this.restaurant._id
      }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success');

      //Invalidate the domain cloudfront
      try {
        const result = await this._api.post(environment.appApiUrl + 'events', [{ queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`, event: { name: "invalidate-domain", params: { domain: domain } } }]).toPromise();
      } catch (error) {
        this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
      }

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed: ' + JSON.stringify(error));
    }
  }

  domain;

  async createWebsite() {
    const domain = (this.domain || "").trim().toLowerCase();
    const templateName = this.restaurant.web.templateName;
    const restaurantId = this.restaurant._id;
    console.log(domain);
    console.log(templateName);
    console.log(restaurantId);
    if (!domain || !templateName || !restaurantId) {
      return alert('Need Domain Name and Website Template');
    }

    const postBody = {
      templateName: 'create-website',
      inputs: { domain, restaurantId, templateName }
    };
    console.log(postBody);
    const result = await this._api.post(environment.appApiUrl + 'workflows/templates', postBody).toPromise();

    alert('Workflow created! Please visit workflows to start.');

  }

  // sync menu hours
  applyOffset(date, offsetToEST) {
    if (date) {
      const cloned = new Date(date.valueOf());
      const serverOffset = (new Date(date.toString('en-US')).valueOf() - new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' })).valueOf()) / 3600000;
      const totalOffset = -serverOffset + (offsetToEST || 0);
      cloned.setHours(cloned.getHours() + totalOffset);
      return cloned;
    }
    return null;
  }

  mergeDates(ranges) {
    let result = [], last;
    ranges.forEach((r) => {
      if (!last || r.start > last.end)
        result.push(last = r);
      else if (r.end > last.end)
        last.end = r.end;
    });
    return result;
  };

  splitRanges(ranges) {
    const partitionBy = (arr, ind) => {
      const i = arr.findIndex(c => c.start < ind && ind <= c.end);
      if (i < 0) return;
      const cur = arr[i];
      arr.splice(i, 1,
        { start: cur.start, end: ind },
        { start: ind, end: cur.end }
      );
    }

    const foldInNewInterval = (arr, int) => {
      partitionBy(arr, int.start);
      partitionBy(arr, int.end);
      for (let i = 0; i < arr.length; i++) {
        if (int.start < arr[i].start) {
          if (int.end < arr[i].start) {
            arr.splice(i, 0, int);
            return;
          }
          arr.splice(i, 0, { start: int.start, end: arr[i].start });
          i++;
          int.start = arr[i].start;
        }
        if (int.start === arr[i].start) {
          int.start = arr[i].end;
        }
        if (int.end < int.start) {
          return;
        }
      }
      arr.push(int);
    }

    const ret = [];
    ranges.forEach(i => foldInNewInterval(ret, { start: i.start, end: i.end }));
    return ret;
  }

  async syncGmbMenuHours() {
    try {
      const results = await this._api.post(environment.appApiUrl + "gmb/generic", {
        name: "sync-gmb-menu-hours",
        payload: {
          "restaurantId": this.restaurant.id
        }
      }).toPromise();

      console.log(results);

      this._global.publishAlert(AlertType.Success, `Menu Hours Synced`);
    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, `Couldn't sync menu hours`);
    }

  }

}

