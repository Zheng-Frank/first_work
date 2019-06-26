import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Restaurant } from '@qmenu/ui';
import { takeUntil, withLatestFrom } from 'rxjs/operators';
import { a } from '@angular/core/src/render3';

export class Migration {
  _id?: string;
  domain: string;
  steps: MigrationStep[];
  restaurant: Restaurant;
  result?: 'SUCCEEDED' | 'SKIPPED'
}

export class Execution {
  time: Date;
  success: boolean;
  response: any;
}
export class MigrationStep {
  name: string;
  payload: string[];
  executions?: Execution[];
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
    payload: ['OperationId'],
  },
  {
    name: 'transferS3',
    payload: ['domain'],
  },
  {
    name: 'requestCertificate',
    payload: ['domain'],
  },
  {
    name: 'checkCertificate',
    payload: ['domain', 'certificateARN'],
  },
  {
    name: 'createCloudFront',
    payload: ['domain', 'certificateARN'],
  },
  {
    name: 'checkCloudFront',
    payload: ['domain', 'distributionId'],
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

  expandedRows = new Set();

  constructor(private _api: ApiService, private _global: GlobalService) {

  }

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
        score: 1,
        disabled: 1,
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
        const domain = this.extractDomain(website);
        this.domainRtDict[domain] = rt;
      }
    });

    this.reload();
  }

  private extractDomain(website) {
    return website.split('.').slice(-2).map(part => part.split(':/').slice(-1)[0].replace("/", '').trim()).join('.').toLowerCase();
  }

  async add() {
    const domain = this.extractDomain(this.domain);
    if (this.rows.some(row => row.domain === domain)) {
      alert(domain + ' is already in list');
    } else {
      await this.addMigrations([{
        domain: domain,
        restaurant: this.domainRtDict[domain],
        steps: steps
      }]);
    }
  }

  async addMigrations(migrations: Migration[]) {
    await this._api.post(environment.adminApiUrl + 'generic?resource=migration', migrations).toPromise();
    this.reload();
  }

  async reload() {
    let migrations = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'migration',
      query: {
      },
      limit: 80000
    }).toPromise();
    this.rows = migrations;
    // sort by restaurant score
    this.rows.sort((r2, r1) => (r2.restaurant.score || 0) - (r1.restaurant.score || 0) || (r1.restaurant.name > r2.restaurant.name ? 1 : -1));

    // patch all checkCloudFront payload to contain distributionId!
    // const patchPairs = migrations.map(mig => {
    //   // insert step:
    //   mig.steps[8] = {
    //     name: 'checkCloudFront',
    //     payload: ['domain', 'distributionId'],
    //   };
    //   return {
    //     old: { _id: mig._id },
    //     new: { _id: mig._id, steps: mig.steps }
    //   }
    // });
    // await this._api.patch(environment.adminApiUrl + 'generic?resource=migration', patchPairs).toPromise();
  }

  async execute(row, step: MigrationStep) {
    const index = row.steps.indexOf(step);
    const previousStep = row.steps[index - 1];
    const payload = {
      domain: row.domain
    };

    // inject success response's field from previous step!
    if (previousStep) {
      let shouldUseExecution = (previousStep.executions || []).filter(exe => exe.success).slice(-1)[0];
      if (!shouldUseExecution) {
        shouldUseExecution = (previousStep.executions || []).slice(-1)[0];
      }
      if (shouldUseExecution && shouldUseExecution.response) {
        (step.payload || []).map(field => payload[field] = shouldUseExecution.response[field] || payload[field]);
      }
    }
    let execution: Execution;
    try {
      this.processingSteps.add(step);

      const response = await this._api.post(environment.migrationUrl + step.name, payload).toPromise();
      execution = {
        response: response,
        success: true,
        time: new Date()
      };
      this._global.publishAlert(AlertType.Success, 'Success');
      // save it!
      this.processingSteps.delete(step);

    } catch (error) {
      execution = {
        response: error,
        success: false,
        time: new Date()
      };
      this.processingSteps.delete(step);
      this._global.publishAlert(AlertType.Danger, 'Error');
    }

    step.executions = step.executions || [];
    step.executions.push(execution);
    await this._api.patch(environment.adminApiUrl + 'generic?resource=migration', [{
      old: { _id: row._id },
      new: { _id: row._id, steps: row.steps }
    }]).toPromise();

    // if(step.name === 'validateWebsite' && execution.success) {
    //   alert('siccess')
    // }
  }

  isStepProcessing(step) {
    return this.processingSteps.has(step);
  }

  viewResponse(step) {
    alert(JSON.stringify(step.executions.slice(-1), null, 2));
    console.log(step.executions);
  }

  isStepSuccess(step) {
    return (step.executions || []).some(execution => execution.success);
  }


  async injectValuableDomains() {
    // has orders, plus having domain names
    const valuableMigrations = [];

    const valuableRestaurantsWithDomains = Object.keys(this.domainRtDict).map(domain => {
      const rt = this.domainRtDict[domain];
      if (rt.score > 1 && !rt.disabled && !this.rows.some(row => row.domain === domain)) {
        valuableMigrations.push(
          {
            domain: domain,
            steps: steps,
            restaurant: rt
          }
        );
      }
    });

    this.addMigrations(valuableMigrations)
  }

  async skip(migration) {
    if (confirm('Are you sure to skip?')) {
      await this._api.patch(environment.adminApiUrl + 'generic?resource=migration', [{
        old: { _id: migration._id },
        new: { _id: migration._id, result: 'SKIPPED' }
      }]).toPromise();
      migration.result = 'SKIPPED';
    }
  }

  async markSucceeded(migration) {
    if (confirm('Are you sure?')) {
      await this._api.patch(environment.adminApiUrl + 'generic?resource=migration', [{
        old: { _id: migration._id },
        new: { _id: migration._id, result: 'SUCCEEDED' }
      }]).toPromise();
      migration.result = 'SUCCEEDED';
    }
  }

  toggle(row) {
    if (this.expandedRows.has(row)) {
      this.expandedRows.delete(row);
    } else {
      this.expandedRows.add(row);
    }
  }

  async processRow(row: Migration) {
    this.processingRows.add(row);
    this.rowMessage[row._id] = "started";

    // ignore finished rows 
    if (row.result) {
      this.processingRows.delete(row);
      this.rowMessage[row._id] = "migration " + row.result;
      return;
    }

    // sendCode
    const sendCodeStep = row.steps.filter(step => step.name === 'sendCode')[0];
    if (!sendCodeStep.executions || sendCodeStep.executions.length === 0) {
      this.rowMessage[row._id] = "sendCode...";
      await this.execute(row, sendCodeStep);
    }

    if (!sendCodeStep.executions.some(exe => exe.success)) {
      this.processingRows.delete(row);
      this.rowMessage[row._id] = "error on sendCode";
      return;
    }

    // getCode
    const getCodeStep = row.steps.filter(step => step.name === 'getCode')[0];
    // try get code every 20 seconds
    for (let i = 0; i < 20; i++) {
      if (getCodeStep.executions && getCodeStep.executions.some(step => step.success)) {
        break;
      }

      this.rowMessage[row._id] = "wait 20s";
      await new Promise(resolve => setTimeout(resolve, 20000));

      this.rowMessage[row._id] = "getCode...";
      await this.execute(row, getCodeStep);
      this.rowMessage[row._id] = "getCode done";
    }

    if (!getCodeStep.executions.some(exe => exe.success)) {
      this.processingRows.delete(row);
      this.rowMessage[row._id] = "error on getCode";
      return;
    }

    // transfer domain, one shot
    const transferDomainStep = row.steps.filter(step => step.name === 'transferDomain')[0];

    if (!transferDomainStep.executions || transferDomainStep.executions.length === 0) {
      this.rowMessage[row._id] = "transferDomain...";
      await this.execute(row, transferDomainStep);
      this.rowMessage[row._id] = "transferDomain done";
    }

    if (!transferDomainStep.executions.some(exe => exe.success)) {
      this.processingRows.delete(row);
      this.rowMessage[row._id] = "error on transferDomain";
      return;
    }

    // checkTransferDomain: loop until success!
    const checkTransferDomainStep = row.steps.filter(step => step.name === 'checkTransferDomain')[0];

    while (true) {
      this.rowMessage[row._id] = "checkTransferDomain...";
      await this.execute(row, checkTransferDomainStep);
      this.rowMessage[row._id] = "checkTransferDomain done";
      if (checkTransferDomainStep.executions && checkTransferDomainStep.executions.some(exe => exe.success)) {
        break;
      }

      this.rowMessage[row._id] = "wait 30 mins";
      await new Promise(resolve => setTimeout(resolve, 1800000));
    }

    // transferS3
    const transferS3Step = row.steps.filter(step => step.name === 'transferS3')[0];
    if (!transferS3Step.executions || transferS3Step.executions.length === 0) {
      this.rowMessage[row._id] = "transferS3...";
      await this.execute(row, transferS3Step);
    }

    if (!transferS3Step.executions.some(exe => exe.success)) {
      this.processingRows.delete(row);
      this.rowMessage[row._id] = "error on transferS3";
      return;
    }


    // requestCertificate
    const requestCertificateStep = row.steps.filter(step => step.name === 'requestCertificate')[0];
    if (!requestCertificateStep.executions || requestCertificateStep.executions.length === 0) {
      this.rowMessage[row._id] = "requestCertificate...";
      await this.execute(row, requestCertificateStep);
    }

    if (!requestCertificateStep.executions.some(exe => exe.success)) {
      this.processingRows.delete(row);
      this.rowMessage[row._id] = "error on requestCertificate";
      return;
    }

    // checkCertificate: loop until success!
    const checkCertificateStep = row.steps.filter(step => step.name === 'checkCertificate')[0];

    while (true) {
      this.rowMessage[row._id] = "checkCertificate...";
      await this.execute(row, checkCertificateStep);
      this.rowMessage[row._id] = "checkCertificate done";
      if (checkCertificateStep.executions && checkCertificateStep.executions.some(exe => exe.success)) {
        break;
      }

      this.rowMessage[row._id] = "wait 60s";
      await new Promise(resolve => setTimeout(resolve, 60000));
    }

    // createCloudFront
    const createCloudFrontStep = row.steps.filter(step => step.name === 'createCloudFront')[0];
    if (!createCloudFrontStep.executions || createCloudFrontStep.executions.length === 0) {
      this.rowMessage[row._id] = "createCloudFront...";
      await this.execute(row, createCloudFrontStep);
    }

    if (!createCloudFrontStep.executions.some(exe => exe.success)) {
      this.processingRows.delete(row);
      this.rowMessage[row._id] = "error on createCloudFront";
      return;
    }

    // checkCloud: loop until success!
    const checkCloudFrontStep = row.steps.filter(step => step.name === 'checkCloudFront')[0];

    while (true) {
      this.rowMessage[row._id] = "checkCloudFront...";
      await this.execute(row, checkCloudFrontStep);
      this.rowMessage[row._id] = "checkCloudFront done";
      if (checkCloudFrontStep.executions && checkCloudFrontStep.executions.some(exe => exe.success)) {
        break;
      }

      this.rowMessage[row._id] = "wait 2 mins";
      await new Promise(resolve => setTimeout(resolve, 120000));
    }

    // validateWebsite: loop until success!
    const validateWebsiteStep = row.steps.filter(step => step.name === 'validateWebsite')[0];

    while (true) {
      this.rowMessage[row._id] = "validateWebsite...";
      await this.execute(row, validateWebsiteStep);
      this.rowMessage[row._id] = "validateWebsite done";
      if (validateWebsiteStep.executions && validateWebsiteStep.executions.some(exe => exe.success)) {
        break;
      }

      this.rowMessage[row._id] = "wait 30 mins";
      await new Promise(resolve => setTimeout(resolve, 1800000));
    }

    // setEmail
    const setEmailStep = row.steps.filter(step => step.name === 'setEmail')[0];
    if (!setEmailStep.executions || setEmailStep.executions.length === 0) {
      this.rowMessage[row._id] = "setEmail...";
      await this.execute(row, setEmailStep);
    }

    if (!setEmailStep.executions.some(exe => exe.success)) {
      this.processingRows.delete(row);
      this.rowMessage[row._id] = "error on setEmail";
      return;
    }

    // ALL good! patch SUCEEDED!
    await this._api.patch(environment.adminApiUrl + 'generic?resource=migration', [{
      old: { _id: row._id },
      new: { _id: row._id, result: 'SUCCEEDED' }
    }]).toPromise();
    row.result = 'SUCCEEDED';

    this.processingRows.delete(row);
    this.rowMessage[row._id] = "Done";
  }

  processingRows = new Set<Migration>();

  rowMessage = {};

}
