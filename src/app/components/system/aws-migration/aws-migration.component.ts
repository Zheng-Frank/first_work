import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Restaurant } from '@qmenu/ui';

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
  filteredRows = [];
  domain;
  processingSteps = new Set();
  domainRtDict = {};
  filter;

  expandedRows = new Set();

  processingRows = new Set<Migration>();

  rowMessage = {};
  constructor(private _api: ApiService, private _global: GlobalService) {

  }


  processScore(score) {
    // fresh rows
    //const toBeProcessedRows = this.rows.filter(row => !row.result && !row.steps.some(step => step.executions && step.executions.length > 0));

    // halfway done
    const toBeProcessedRows = this.rows.filter(row => !row.result && row.steps.some(step => step.executions && step.executions.length > 0));

    console.log(toBeProcessedRows);
    if (toBeProcessedRows.length > 200) {
      toBeProcessedRows.length = 200;
    }
    this.myQueue.push(...toBeProcessedRows);
  }

  myQueue: Migration[] = [];

  processingQueue = false;

  async toggleResumeAll() {
    console.log('myQueue', this.myQueue);
    this.processingQueue = !this.processingQueue;
    // const halfwayProcessedRows = this.rows.filter(row => !row.result && row.steps.some(step => step.executions && step.executions.length > 0));
    // console.log(halfwayProcessedRows);
    // this.myQueue.push(...halfwayProcessedRows);

    while (this.processingQueue) {
      // wait 5 seconds between
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.myQueue.length === 0) {
        this.processingQueue = false;
        break;
      }
      const row = this.myQueue.pop();
      this.processRow(row);
    }
  }

  async applyFilter() {
    console.log(this.filter);
    this.filteredRows = this.rows.filter(row => {
      switch (this.filter) {
        case 'SUCCEEDED only':
          return row.result === 'SUCCEEDED';
        case 'SKIPPED only':
          return row.result === 'SKIPPED';
        case 'DEFERRED only':
          return row.result === 'DEFERRED';
        case 'Halfway done':
          return !row.result && row.steps.some(step => step.executions && step.executions.length > 0);
        case 'Untouched':
          return !row.steps.some(step => step.executions && step.executions.length > 0);
        default:
          return true;
      }
    });
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
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=migration', migrations).toPromise();
    this.reload();
  }

  async reload() {
    const migrationDomains = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'migration',
      query: {
        // "steps.0.executions.0": { $exists: true },
        // "shrinked": { $exists: false }
      },
      projection: {
        domain: 1
      },
      limit: 8000
    }).toPromise();

    // loop to get all details
    const batchSize = 100;

    const batchedMigrationDomains = Array(Math.ceil(migrationDomains.length / batchSize)).fill(0).map((i, index) => migrationDomains.slice(index * batchSize, (index + 1) * batchSize));

    const migrations = [];

    for (let batch of batchedMigrationDomains) {
      const batchedResult = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'migration',
        query: {
          _id: {
            $in: batch.map(mig => ({ $oid: mig._id }))
          }
        },
        limit: batch.length
      }).toPromise();
      migrations.push(...batchedResult);
    }

    // const allMigrationIds = 
    // let migrations = await this._api.get(environment.qmenuApiUrl + 'generic', {
    //   resource: 'migration',
    //   query: {
    //     // "steps.0.executions.0": { $exists: true },
    //     // "shrinked": { $exists: false }
    //   },
    //   // projection: {
    //   //   // domain: 1,
    //   //   // restaurant: 1,
    //   //   // result: 1,
    //   //   // steps: 1
    //   //   // "steps.executions": {
    //   //   //   $slice: -2
    //   //   // }
    //   // },
    //   limit:800
    // }).toPromise();

    this.rows = migrations;
    // sort by restaurant score
    console.log('bad domain=', this.rows.filter(row => !row.restaurant));
    this.rows.sort((r2, r1) => (r2.restaurant.score || 0) - (r1.restaurant.score || 0) || (r1.restaurant.name > r2.restaurant.name ? 1 : -1));

    this.applyFilter();

    // console.log(JSON.parse(JSON.stringify(migrations)));
    // // condense ALL migration executions
    // for (let migration of migrations) {
    //   console.log(migration);
    //   migration.steps.map(step => {
    //     const existedExecutionSet = new Set();
    //     for (let i = (step.executions || []).length - 1; i >= 0; i--) {
    //       const execution = step.executions[i];
    //       const stringyfiedResponse = JSON.stringify(execution.response || {});
    //       if(existedExecutionSet.has(stringyfiedResponse)) {
    //         step.executions.splice(i, 1);
    //         console.log('removed!', migration.domain, step.name);

    //       }
    //       existedExecutionSet.add(stringyfiedResponse);
    //     }
    //   });
    // }

    // console.log('after', migrations);
    // const patchPairs = migrations.map(mig => {
    //   return {
    //     old: { _id: mig._id },
    //     new: { _id: mig._id, steps: mig.steps, shrinked: true }
    //   }
    // });
    // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=migration', patchPairs).toPromise();
  }

  // we need to make this execution non-parallel
  processing1 = false;
  async execute(row, step: MigrationStep) {
    console.log('queueing ' + row.domain + ' ' + step.name);
    while (this.processing1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('executing ' + row.domain + ' ' + step.name + '.....................');
    this.processing1 = true;
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
      this._global.publishAlert(AlertType.Success, `Success! ${step.name}: ${row.restaurant.name}`);
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

    // remove last one if it's the same response
    if (step.executions.slice(-1)[0] && JSON.stringify(step.executions.slice(-1)[0].response) === JSON.stringify(execution.response)) {
      step.executions.splice(step.executions.length - 1, 1);
      console.log('step removed bad')
    }
    step.executions.push(execution);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=migration', [{
      old: { _id: row._id },
      new: { _id: row._id, steps: row.steps }
    }]).toPromise();

    this.processing1 = false;

    console.log('execute ' + row.domain + ' done!');
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
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=migration', [{
        old: { _id: migration._id },
        new: { _id: migration._id, result: 'SKIPPED' }
      }]).toPromise();
      migration.result = 'SKIPPED';
    }
  }

  async markSucceeded(row) {
    if (confirm('Are you sure?')) {
      const migration = row;
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=migration', [{
        old: { _id: migration._id },
        new: { _id: migration._id, result: 'SUCCEEDED' }
      }]).toPromise();
      migration.result = 'SUCCEEDED';

      // ALL good! patch SUCEEDED!
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: row.restaurant._id, web: {} },
        new: { _id: row.restaurant._id, web: { qmenuWebsite: 'https://' + row.domain }, domain: row.domain }
      }]).toPromise();

    }
  }
  async markDeferred(migration) {
    if (confirm('Are you sure?')) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=migration', [{
        old: { _id: migration._id },
        new: { _id: migration._id, result: 'DEFERRED' }
      }]).toPromise();
      migration.result = 'DEFERRED';
    }
  }

  async resetResult(migration) {
    if (confirm('Are you sure?')) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=migration', [{
        old: { _id: migration._id, result: 'random' },
        new: { _id: migration._id }
      }]).toPromise();
      delete migration.result;
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


    while (true) {
      // start from LAST failed step!
      const unfinishedOrFailedSteps = [];
      for (let i = row.steps.length - 1; i >= 0; i--) {
        const step = row.steps[i];
        if (step.executions && step.executions.some(exe => exe.success)) {
          break;
        }
        unfinishedOrFailedSteps.push(step);
      }

      const nextStep = unfinishedOrFailedSteps.slice(-1)[0];
      if (nextStep) {
        // process next step!
        switch (nextStep.name) {
          case 'sendCode':
            this.rowMessage[row._id] = "sendCode...";
            await this.execute(row, nextStep);
            if (!nextStep.executions.some(exe => exe.success)) {
              this.processingRows.delete(row);
              this.rowMessage[row._id] = "error on sendCode";
              return;
            }
            break;

          case 'getCode':
            // try get code every 20 seconds
            for (let i = 0; i < 20; i++) {
              if (nextStep.executions && nextStep.executions.some(step => step.success)) {
                break;
              }

              this.rowMessage[row._id] = "wait 20s to getCode again";
              await new Promise(resolve => setTimeout(resolve, 20000));

              this.rowMessage[row._id] = "getCode...";
              await this.execute(row, nextStep);
              this.rowMessage[row._id] = "getCode done";
            }

            if (!nextStep.executions.some(exe => exe.success)) {
              this.processingRows.delete(row);
              this.rowMessage[row._id] = "error on getCode after 20 tries";
              return;
            }
            break;

          case 'transferDomain':
            this.rowMessage[row._id] = "transferDomain...";
            await this.execute(row, nextStep);
            this.rowMessage[row._id] = "transferDomain done";
            if (!nextStep.executions.some(exe => exe.success)) {
              this.processingRows.delete(row);
              this.rowMessage[row._id] = "error on transferDomain";

              //in case of '60 days ago error: we mark it as 60 DAYS
              nextStep.executions.map(exec => {
                const response = exec.response;
                if (response && response.error && response.error.indexOf('60 days ago') > 0) {
                  // ALL good! patch SUCEEDED!
                  this._api.patch(environment.qmenuApiUrl + 'generic?resource=migration', [{
                    old: { _id: row._id },
                    new: { _id: row._id, result: 'DEFERRED' }
                  }]).subscribe(result => {
                    row.result = 'DEFERRED';
                  }, error => { });
                }
              });


              return;
            }
            break;

          case 'checkTransferDomain':
            while (true) {
              this.rowMessage[row._id] = "checkTransferDomain...";
              await this.execute(row, nextStep);
              this.rowMessage[row._id] = "checkTransferDomain done";
              if (nextStep.executions && nextStep.executions.some(exe => exe.success)) {
                break;
              }
              this.rowMessage[row._id] = "wait 10 mins to checkTranserDomain again";
              await new Promise(resolve => setTimeout(resolve, 600000));
            }
            break;

          case 'transferS3':
            this.rowMessage[row._id] = "transferS3...";
            await this.execute(row, nextStep);
            if (!nextStep.executions.some(exe => exe.success)) {
              this.processingRows.delete(row);
              this.rowMessage[row._id] = "error on transferS3";
              return;
            }
            break;

          case 'requestCertificate':
            this.rowMessage[row._id] = "requestCertificate...";
            await this.execute(row, nextStep);
            if (!nextStep.executions.some(exe => exe.success)) {
              this.processingRows.delete(row);
              this.rowMessage[row._id] = "error on requestCertificate";
              return;
            }
            break;

          case 'checkCertificate':
            while (true) {
              this.rowMessage[row._id] = "checkCertificate...";
              await this.execute(row, nextStep);
              this.rowMessage[row._id] = "checkCertificate done";
              if (nextStep.executions && nextStep.executions.some(exe => exe.success)) {
                break;
              }
              this.rowMessage[row._id] = "wait 60s to checkCertificate again";
              await new Promise(resolve => setTimeout(resolve, 60000));
            }
            break;

          case 'createCloudFront':
            this.rowMessage[row._id] = "createCloudFront...";
            await this.execute(row, nextStep);
            if (!nextStep.executions.some(exe => exe.success)) {
              this.processingRows.delete(row);
              this.rowMessage[row._id] = "error on createCloudFront";
              return;
            }
            break;

          case 'checkCloudFront':
            while (true) {
              this.rowMessage[row._id] = "checkCloudFront...";
              await this.execute(row, nextStep);
              this.rowMessage[row._id] = "checkCloudFront done";
              if (nextStep.executions && nextStep.executions.some(exe => exe.success)) {
                break;
              }

              this.rowMessage[row._id] = "wait 2 mins to checkCloudFront";
              await new Promise(resolve => setTimeout(resolve, 120000));
            }
            break;

          case 'validateWebsite':
            while (true) {
              this.rowMessage[row._id] = "...";
              await this.execute(row, nextStep);
              this.rowMessage[row._id] = "validateWebsite done";
              if (nextStep.executions && nextStep.executions.some(exe => exe.success)) {
                break;
              }
              this.rowMessage[row._id] = "wait 30 mins to validateWebsite";
              await new Promise(resolve => setTimeout(resolve, 1800000));
            }
            break;

          case 'setEmail':
            this.rowMessage[row._id] = "setEmail...";
            await this.execute(row, nextStep);
            if (!nextStep.executions.some(exe => exe.success)) {
              this.processingRows.delete(row);
              this.rowMessage[row._id] = "error on setEmail";
              return;
            }
            break

          default:
            break;
        }

      } else {
        // ALL good! patch SUCEEDED!
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=migration', [{
          old: { _id: row._id },
          new: { _id: row._id, result: 'SUCCEEDED' }
        }]).toPromise();
        row.result = 'SUCCEEDED';

        // ALL good! patch SUCEEDED!
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: { _id: row.restaurant._id, web: {} },
          new: { _id: row.restaurant._id, web: { qmenuWebsite: 'https://' + row.domain }, domain: row.domain }
        }]).toPromise();

        this.processingRows.delete(row);
        this.rowMessage[row._id] = "Done";
        break;
      }
    }

    this._global.publishAlert(AlertType.Success, `ALL DONE! ${row.restaurant.name}`);
  }
}

class Migration {
  _id?: string;
  domain: string;
  steps: MigrationStep[];
  restaurant: Restaurant;
  result?: 'SUCCEEDED' | 'SKIPPED' | 'DEFERRED'
}

class Execution {
  time: Date;
  success: boolean;
  response: any;
}
class MigrationStep {
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
