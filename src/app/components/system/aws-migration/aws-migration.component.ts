import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Restaurant } from '@qmenu/ui';
import { takeUntil } from 'rxjs/operators';

export class Migration {
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
  // {
  //   name: 'checkCertificate',
  //   payload: ['domain'],
  // },
  {
    name: 'createCloudFront',
    payload: ['domain', 'certificateARN'],
  },
  {
    name: 'checkCloudFront',
    payload: ['domain', 'OperationId'],
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
    this.rows.sort((r1, r2) => (r2.restaurant.score || 0) - (r1.restaurant.score || 0));

    // const badMigs = migrations.filter(mig => mig.domain.indexOf('/') > 0);
    // const patchPairs = badMigs.map(mig => ({
    //   old: {_id: mig._id},
    //   new: {_id: mig._id, domain: this.extractDomain(mig.domain)}
    // }));
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
      const lastPreviousSuccessExecution = (previousStep.executions || []).filter(exe => exe.success).slice(-1)[0];
      if (lastPreviousSuccessExecution && lastPreviousSuccessExecution.response) {
        (step.payload || []).map(field => payload[field] = lastPreviousSuccessExecution.response[field] || payload[field]);
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

  }

  isStepProcessing(step) {
    return this.processingSteps.has(step);
  }

  viewResponse(step) {
    alert(JSON.stringify(step.executions, null, 2));
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

}
