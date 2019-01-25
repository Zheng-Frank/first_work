import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { TaskService } from 'src/app/services/task.service';

const TWELEVE_HOURS = 14400000; // 4 hours
@Component({
  selector: 'app-automation-dashboard',
  templateUrl: './automation-dashboard.component.html',
  styleUrls: ['./automation-dashboard.component.css']
})
export class AutomationDashboardComponent implements OnInit {


  startTime;
  scannedAccounts = 0;
  executedTasks = 0;

  failures = [];
  errorMessages = [];
  runningMessages = [];

  now = new Date();

  // wait ms between each scan
  waitBetweenScan = 3600000; // 1 hour

  constructor(private _api: ApiService, private _global: GlobalService, private _task: TaskService, private _gmb3: Gmb3Service) { }

  ngOnInit() {
    setInterval(() => { this.now = new Date(); }, 60000);
  }

  addRunningMessage(message) {
    this.runningMessages.unshift(new Date().toLocaleTimeString() + ' ' + message);
    if (this.runningMessages.length > 40) {
      this.runningMessages.length = 40;
    }
  }

  addErrorMessage(message) {
    this.errorMessages.unshift(new Date().toLocaleTimeString() + ' ' + message);
    if (this.errorMessages.length > 40) {
      this.errorMessages.length = 40;
    }
  }

  async start() {

    this.startTime = new Date();
    this.now = new Date();
    this.scannedAccounts = 0;
    this.executedTasks = 0;
    this.addRunningMessage('start');
    while (this.startTime) {

      //   // should apply GMB:

      //   console.log('should apply gmb', shouldApplyList);
      //   if (shouldApplyList.length > 0) {
      //     this.addRunningMessage('add new gmb task, ' + shouldApplyList.map(biz => biz.name).join(', '));
      //     await this.createApplyTasks(shouldApplyList);
      //     this.executedTasks++;
      //   }

      // } catch (error) {
      //   console.log(error);
      //   this.addRunningMessage('ERROR --> create apply task');
      // }

      this.addRunningMessage('Scan accounts for GMB locations...');
      const accountsScanResult = await this.scanAccountsForLocations();
      this.addRunningMessage('Succeeded ' + accountsScanResult.succeeded.length + ', failed ' + accountsScanResult.failed.length);


      this.addRunningMessage('Scan emails...');
      const emailsResult = await this.scanEmailsForRequests();
      this.addRunningMessage('Succeeded ' + emailsResult.succeeded.length + ', failed ' + emailsResult.failed.length + ', new requests ' + emailsResult.newRequests.length);

      this.addRunningMessage('Crawl restaurants...');
      const restaurantCrawlingResult = await this.crawlRestaurantGoogleListings();
      this.addRunningMessage('Succeeded ' + restaurantCrawlingResult.succeeded.length + ', failed ' + restaurantCrawlingResult.failed.length);

      this.addRunningMessage('Crawl gmbBiz list...');
      const gmbBizCrawlingResult = await this.crawlGmbGoogleListings();
      this.addRunningMessage('Succeeded ' + gmbBizCrawlingResult.succeeded.length + ', failed ' + gmbBizCrawlingResult.failed.length);
      if (gmbBizCrawlingResult.abortionMessage) {
        this.addErrorMessage(gmbBizCrawlingResult.abortionMessage);
      }

      // if we had postcard code and the ownership was lost, immediately schedule it to grab it back!
      this.addRunningMessage('Reschedule tasks with postcard verification code and ownership just lost...');
      const lostList = await this._gmb3.computePostcardTasksThatJustLost();
      this.addRunningMessage('Found ' + lostList.length);

      this.addRunningMessage('Scan for Transfer Tasks...');
      const newTransferTasks = await this.scanForTransferTask();
      this.addRunningMessage('Created ' + newTransferTasks.length);

      this.addRunningMessage('Purge Transfer Tasks...');
      const purgedTransferTasks = await this._task.purgeTransferTasks();
      this.addRunningMessage('Purged ' + purgedTransferTasks.length);

      this.addRunningMessage('Purge Apply Tasks...');
      const purgedApplyTasks = await this._task.purgeApplyTasks();
      this.addRunningMessage('Purged ' + purgedApplyTasks.length);


      this.addRunningMessage('-------FINISHED ONE ROUND!---------')

      await new Promise((resolve) => setTimeout(resolve, this.waitBetweenScan));
    } // end for while loop
  }

  stop() {
    this.startTime = undefined;
    this.addErrorMessage('stop');
  }

  async createApplyTasks(gmbBizList: GmbBiz[]) {
    const tasks = gmbBizList.map(gmbBiz => {
      const task = {
        name: 'Apply GMB Ownership',
        scheduledAt: { $date: new Date() },
        description: gmbBiz.name,
        roles: ['GMB', 'ADMIN'],
        score: gmbBiz.score,
        relatedMap: { gmbBizId: gmbBiz._id, cid: gmbBiz.cid, qmenuId: gmbBiz.qmenuId },
        transfer: {}
      };
      return task;
    });
    await this._api.post(environment.adminApiUrl + 'generic?resource=task', tasks).toPromise();
    return tasks;
  }

  /** 
   * 1. skip ones that crawled within 4 hours
  */
  async crawlRestaurantGoogleListings() {
    let restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      query: {
        "googleAddress.formatted_address": { $exists: 1 },
        disabled: null
      },
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.crawledAt": 1,
        "googleAddress.formatted_address": 1
      },
      limit: 80000
    }).toPromise();

    // sort by crawledAt:
    restaurants.sort((r1, r2) => new Date((r1.googleListing || {}).crawledAt || 0).valueOf() - new Date((r2.googleListing || {}).crawledAt || 0).valueOf());

    console.log('before: ', restaurants.length);
    console.log('skip restaurants crawled within 4 hours!');
    const now = new Date();
    restaurants = restaurants.filter(r => !r.googleListing || !r.googleListing.crawledAt || now.valueOf() - new Date(r.googleListing.crawledAt).valueOf() > TWELEVE_HOURS);
    console.log('after: ', restaurants.length);

    const failedRestaurants = [];
    const succeededRestaurants = [];

    const batchSize = 10;
    const batchedRestaurants = Array(Math.ceil(restaurants.length / batchSize)).fill(0).map((i, index) => restaurants.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedRestaurants) {
      try {
        const results = await this._gmb3.crawlBatchedRestaurants(batch);
        succeededRestaurants.push(...batch);
      } catch (error) {
        failedRestaurants.push(...batch);
        console.log(error);
      }
    }

    return {
      succeeded: succeededRestaurants,
      failed: failedRestaurants
    };
  }


  /** 
   * 0. batched (test 10 first?)
   * 1. skip ones that crawled within 4 hours
   * 2. DIRECT cid scan
   * 3. break, if found non-matching cid
  */
  async crawlGmbGoogleListings() {
    let gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        cid: 1,
        name: 1,
        crawledAt: 1,
        qmenuId: 1
      },
      limit: 80000
    }).toPromise();

    // remove those that are disable
    let disabledRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: true
      },
      projection: {
        disabled: 1,
        "googleListing.cid": 1
      },
      limit: 80000
    }).toPromise();

    console.log('before disabled filter: ', gmbBizList.length);
    gmbBizList = gmbBizList.filter(biz => !disabledRestaurants.some(r => r._id === biz.qmenuId || r.googleListing && r.googleListing.cid === biz.cid));
    console.log('after: ', gmbBizList.length);
    // now let's crawl gmbBiz list, with cid!!!

    // sort by crawledAt:
    gmbBizList.sort((b1, b2) => new Date(b1.crawledAt).valueOf() - new Date(b2.crawledAt).valueOf());

    console.log('before 4 hours filter: ', + gmbBizList.length);
    console.log('skip gmbBiz crawled within 4 hours!');
    gmbBizList = gmbBizList.filter(b => !b.crawledAt || new Date().valueOf() - new Date(b.crawledAt).valueOf() > TWELEVE_HOURS);
    console.log('after: ', + gmbBizList.length);

    const failedGmbBizList = [];
    const succeededGmbBizList = [];
    let abortionMessage;

    const batchSize = 10;
    const batchedGmbBizList = Array(Math.ceil(gmbBizList.length / batchSize)).fill(0).map((i, index) => gmbBizList.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedGmbBizList) {
      try {
        const results = await this._gmb3.crawlBatchedGmbBizList(batch);
        succeededGmbBizList.push(...batch);
      } catch (error) {
        failedGmbBizList.push(...batch);
        console.log(error);
      }
    }

    return {
      succeeded: succeededGmbBizList,
      failed: failedGmbBizList,
      abortionMessage: abortionMessage
    };
  }

  async scanForTransferTask() {
    return await this._task.scanForTransferTask();
  }

  async injectModifiedWebsites() {

  }

  async autoSuggest() {

  }

  async appealSuspended() {

  }

  async purgeInvalidGmbTransferTasks() {
    this._task.purgeTransferTasks();
  }

  async purgeInvalidGmbApplyTasks() {
    this._task.purgeApplyTasks();
  }
  /////////////////////////////////////////////////////////////////////////////////////////
  async scanAccountsForLocations() {

    let gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        gmbScannedAt: 1,
        email: 1
      },
      limit: 6000
    }).toPromise();

    gmbAccounts.sort((a1, a2) => new Date(a1.gmbScannedAt || 0).valueOf() - new Date(a2.gmbScannedAt || 0).valueOf());

    // gmbAccounts = gmbAccounts.filter(g => g.email.startsWith('books'));

    const succeeded = [];
    const failed = [];
    for (let i = 0; i < gmbAccounts.length; i++) {
      try {
        this.addRunningMessage(`Account scanning ${(i + 1)} of ${gmbAccounts.length}: ${gmbAccounts[i].email}`);
        const locations = await this._gmb3.scanOneAccountForLocations(gmbAccounts[i].email, false);
        succeeded.push(gmbAccounts[i]);
      } catch (error) {
        this.addErrorMessage('ERROR SCANNING ' + gmbAccounts[i].email);
        failed.push(gmbAccounts[i]);
      }
    }

    return {
      succeeded: succeeded,
      failed: failed
    }

  }


  /** scalable upto 6000 gmbBiz list */
  async scanEmailsForRequests() {

    let gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        emailScannedAt: 1,
        email: 1
      },
      limit: 6000
    }).toPromise();

    gmbAccounts.sort((a1, a2) => new Date(a1.emailScannedAt || 0).valueOf() - new Date(a2.emailScannedAt || 0).valueOf());

    gmbAccounts = gmbAccounts.filter(g => g.email.startsWith('ga'));

    const succeeded = [];
    const failed = [];
    const newRequests = [];

    for (let i = 0; i < gmbAccounts.length; i++) {
      try {
        this.addRunningMessage(`Email scanning ${(i + 1)} of ${gmbAccounts.length}: ${gmbAccounts[i].email}`);
        const result = await this._gmb3.scanOneEmailForGmbRequests(gmbAccounts[i].email, false);
        succeeded.push(gmbAccounts[i]);
      } catch (error) {
        this.addErrorMessage('ERROR SCANNING ' + gmbAccounts[i].email);
        failed.push(gmbAccounts[i]);
      }
    }

    return {
      succeeded: succeeded,
      failed: failed,
      newRequests: newRequests
    }
  } // scan emails

  /** Apply for MAIN listing only */
  async scanForApplyTask() {
    // 1. no main listing ownership
    // 2. not disabled
    // 3. not already an apply task existed
    // 4. skip sale's agent 'gmbBiz.disableAutoTask' (unless it had published at least once or more than xx days created)
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: null,
        "googleListing.cid": { $exists: 1 }
      },
      projection: {
        "googleListing.cid": 1,
        name: 1
      },
      limit: 6000
    }).toPromise();

    console.log(restaurants);

    let gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        "locations.status": 1,
        "locations.cid": 1,
        "locations.statusHistory": 1,
      },
      limit: 6000
    }).toPromise();

    gmbAccounts = gmbAccounts.filter(a => a.locations && a.locations.length > 0);

    let gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        "cid": 1,
        score: 1,
        disableAutoTask: 1
      },
      limit: 6000
    }).toPromise();

    // MAIN listing
    const publishedRestaurants = restaurants.filter(r => gmbAccounts.some(a => a.locations.some(loc => loc.cid && loc.cid === r.googleListing.cid && loc.status === 'Published')));
    const notPublishedRestaurants = restaurants.filter(r => publishedRestaurants.indexOf(r) < 0);

    console.log('Published:', publishedRestaurants);
    console.log('Not Published:', notPublishedRestaurants);

    const publishedRestaurantsWithoutBiz = publishedRestaurants.filter(r => !gmbBizList.some(biz => biz.cid === r.googleListing.cid));
    const notPublishedRestaurantsWithoutBiz = notPublishedRestaurants.filter(r => !gmbBizList.some(biz => biz.cid === r.googleListing.cid));
    const notPublishedRestaurantsWithBiz = notPublishedRestaurants.filter(r => gmbBizList.some(biz => biz.cid === r.googleListing.cid));

    console.log('Published witout gmbBiz:', publishedRestaurantsWithoutBiz);
    console.log('Not Published without gmbBiz:', notPublishedRestaurantsWithoutBiz);

    const existingOpenApplyTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Apply GMB Ownership',
        result: null    // null is the same as either non-exists or actually null in mongodb
      },
      projection: {
        relatedMap: 1
      },
      limit: 6000
    }).toPromise();

    console.log(existingOpenApplyTasks);

    const bizIdMap = gmbBizList.reduce((map, biz) => (map[biz._id] = biz, map), {});
    const cidsWithTaskSet = new Set(existingOpenApplyTasks.map(t => (bizIdMap[t.relatedMap.gmbBizId] || {}).cid).filter(id => id));

    const restaurantsToBeApplied = notPublishedRestaurantsWithBiz.filter(r => !cidsWithTaskSet.has(r.googleListing.cid));

    console.log('restaurantsToBeApplied', restaurantsToBeApplied);

    // const restaurantPublishedOnce = restaurantsToBeApplied
    //   .filter(r =>
    //     gmbAccounts.some(account => account.locations.some(loc => loc.cid === r.googleListing.cid && loc.statusHistory.some(h => h.status === 'Published'))));

    // console.log('restaurantPublishedOnce', restaurantPublishedOnce);


    const restaurantsToBeAppliedWithoutDisableAutoTask = restaurantsToBeApplied.filter(r => {
      const gmbBiz = gmbBizList.filter(biz => biz.cid === r.googleListing.cid)[0];
      return gmbBiz && !gmbBiz.disableAutoTask;
    });

    console.log('restaurantsToBeAppliedWithoutDisableAutoTask', restaurantsToBeAppliedWithoutDisableAutoTask);

    const tasks = restaurantsToBeAppliedWithoutDisableAutoTask.map(r => {
      const gmbBiz = gmbBizList.filter(biz => biz.cid === r.googleListing.cid)[0];
      const task = {
        name: 'Apply GMB Ownership',
        scheduledAt: { $date: new Date() },
        description: r.name,
        roles: ['GMB', 'ADMIN'],
        score: gmbBiz.score,
        relatedMap: { gmbBizId: gmbBiz._id, cid: gmbBiz.cid, qmenuId: gmbBiz.qmenuId },
        transfer: {}
      };
      return task;
    });

    await this._api.post(environment.adminApiUrl + 'generic?resource=task', tasks).toPromise();

  } // end scan


  async generateMissingGmbBizListings() {
    await this._gmb3.generateMissingGmbBizListings();
  }

  async computePostcardTasksThatJustLost() {
    await this._gmb3.computePostcardTasksThatJustLost();
  }

  async scanForAppealTasks() {

  }

  async purgeInvalidAppealTasks() {

  }

  async runAutoAppeal() {

  }

  async runInjectQmenuWebsites() {

  }

}
