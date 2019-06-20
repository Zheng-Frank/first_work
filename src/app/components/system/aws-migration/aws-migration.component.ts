import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';

export class MigrationStep {
  name: string;
  payload: string[];
  response: any;
  time: Date;
  success: boolean;
}

const steps = [
  {
    name: 'sendCode',
    payload: ['domain']
  },
  {
    name: 'getCode',
    payload: ['domain'],
  },
  {
    name: 'transferDomain',
    payload: ['domain', 'authCode'],
  },
  {
    name: 'checkTransferDomain',
    payload: ['operationId'],
  },
  {
    name: 'requestCertificate',
    payload: ['domain'],
  },
  // {
  //   name: 'checkCertificate',
  //   payload: ['domain'],
  // },
  {
    name: 'createCloudFront',
    payload: ['domain', 'certificateARN'],
  },
  {
    name: 'validateWebsite',
    payload: ['domain'],
  },

  {
    name: 'setEmail',
    payload: ['domain'],
  },
];
@Component({
  selector: 'app-aws-migration',
  templateUrl: './aws-migration.component.html',
  styleUrls: ['./aws-migration.component.css']
})
export class AwsMigrationComponent implements OnInit {

  private migrationSteps = [{
    name: 'send-godaddy-code',
    apiEndpoint: 'send-godaddy-code'
  }];
  rows = [];
  domain;
  processingSteps = new Set();
  domainRtDict = {};
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    // get restaurants with domains
    const restaurantsWithDomain = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
      },
      projection: {
        domain: 1,
        name: 1,
        alias: 1,
        "web.qmenuWebsite": 1
      },
      limit: 80000
    }).toPromise();

    restaurantsWithDomain.map(rt => {
      let website = (rt.web || {}).qmenuWebsite;
      if (!website || website.toLowerCase().indexOf('qmenu') >= 0) {
        website = rt.domain;
      }
      if (website) {
        const domain = website.split('.').slice(-2).map(part => part.replace("/", '').trim()).join('.').toLowerCase();
        this.domainRtDict[domain] = rt;
      }
    });

    console.log(this.domainRtDict);
    this.reload();
  }

  async add() {
    const domain = this.domain.split('.').slice(-2).map(part => part.replace("/", '').trim()).join('.').toLowerCase();
    if (this.rows.some(row => row.domain === domain)) {
      alert(domain + ' is already in list');
    } else {
      const rt = this.domainRtDict
      await this._api.post(environment.adminApiUrl + 'generic?resource=migration', [{
        domain: domain,
        restaurant: this.domainRtDict[domain],
        steps: steps
      }]).toPromise();
      this.reload();
    }
  }

  async reload() {
    let migrations = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'migration',
      query: {
      },
      limit: 80000
    }).toPromise();
    this.rows = migrations;
    console.log(migrations)
  }

  async execute(row, step: MigrationStep) {
    // if (step.success) {
    //   this._global.publishAlert(AlertType.Success, 'Already success');
    //   return;
    // };

    const index = row.steps.indexOf(step);
    const previousStep = row.steps[index - 1];
    const payload = {
      domain: row.domain
    };
    
    (step.payload || []).map(field => payload[field] = ((previousStep || {}).response || {})[field] || payload[field]);


    const oldSteps = JSON.parse(JSON.stringify(row.steps));

    try {
      this.processingSteps.add(step);

      const response = await this._api.post(environment.migrationUrl + step.name, payload).toPromise();
      step.response = response;
      step.success = true;
      this._global.publishAlert(AlertType.Success, 'Success');
      // save it!
      this.processingSteps.delete(step);

    } catch (error) {
      step.response = error;
      step.success = false;
      this.processingSteps.delete(step);
      this._global.publishAlert(AlertType.Danger, 'Error');
    }

    step.time = new Date();
    await this._api.patch(environment.adminApiUrl + 'generic?resource=migration', [{
      old: { _id: row._id },
      new: { _id: row._id, steps: row.steps }
    }]).toPromise();

  }

  isStepProcessing(step) {
    return this.processingSteps.has(step);
  }

  viewResponse(step) {
    alert(JSON.stringify(step.response));
  }

}
