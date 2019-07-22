import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { Gmb3Service } from 'src/app/services/gmb3.service';
import { TaskService } from 'src/app/services/task.service';
import { Helper } from 'src/app/classes/helper';

const TWELEVE_HOURS = 43200000; // 12 hours
const TWO_HOURS = 7200000; // 2 hours

const SKIPPING_EMAILS = ['christesting'];

const DEBUGGING = false;
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
  waitBetweenScan = 4 * 3600000; // 4 hour

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

    // const badRequests = await this._api.get(environment.adminApiUrl + 'generic', {
    //   resource: 'gmbRequest',
    //   query: {
    //     "gmbBizId": "5c4f56fcdd9078a346e91845"
    //   },
    //   limit: 10000
    // }).toPromise();

    // console.log(badRequests);
    // badRequests.length = 1;
    // await this._api.delete(environment.adminApiUrl + 'generic', {
    //   resource: 'gmbRequest',
    //   ids: badRequests.map(r => r._id)
    // }).toPromise();

    // if (new Date()) {
    //   throw 'bug'
    // }

    this.startTime = new Date();
    this.now = new Date();
    this.scannedAccounts = 0;
    this.executedTasks = 0;
    this.addRunningMessage('start');

    try {
      while (this.startTime) {

        this.addRunningMessage('Scan accounts for GMB locations...');
        const accountsScanResult = await this.scanAccountsForLocations();
        this.addRunningMessage('Succeeded ' + accountsScanResult.succeeded.length + ', failed ' + accountsScanResult.failed.length);

        this.addRunningMessage('Generate missing GMB Biz...');
        await this.generateMissingGmbBizListings();


        this.addRunningMessage('Scan emails...');
        const emailsResult = await this.scanEmailsForRequests();
        this.addRunningMessage('Succeeded ' + emailsResult.succeeded.length + ', failed ' + emailsResult.failed.length);

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

        this.addRunningMessage('Scan for Apply GMB Tasks...');
        const newApplyTasks = await this.scanForApplyTask();
        this.addRunningMessage('Created ' + newApplyTasks.length);

        this.addRunningMessage('Purge Apply GMB Tasks...');
        const purgedApplyTasks = await this.purgeInvalidGmbApplyTasks();
        this.addRunningMessage('Purged ' + purgedApplyTasks.length);


        this.addRunningMessage('Scan for Transfer Tasks...');
        const newTransferTasks = await this.scanForTransferTask();
        this.addRunningMessage('Created ' + newTransferTasks.length);

        this.addRunningMessage('Purge Transfer Tasks...');
        const purgedTransferTasks = await this.purgeInvalidGmbTransferTasks();
        this.addRunningMessage('Purged ' + purgedTransferTasks.length);

        this.addRunningMessage('Scan for Appeal Tasks...');
        const newAppealTasks = await this.scanForAppealTasks();
        this.addRunningMessage('Created ' + newAppealTasks.length);

        this.addRunningMessage('Purge Appeal Tasks...');
        const purgedAppealTasks = await this.purgeInvalidAppealTasks();
        this.addRunningMessage('Purged ' + purgedAppealTasks.length);

        this.addRunningMessage('Run auto-apeal...');
        await this.runAutoAppeal();


        this.addRunningMessage('Inject qMenu Websites...');
        await this.runInjectQmenuWebsites();

        this.addRunningMessage('-------FINISHED ONE ROUND!---------')

        await new Promise((resolve) => setTimeout(resolve, this.waitBetweenScan));
      } // end for while loop

    }
    catch (error) {
      this.addErrorMessage('Exception happened!');
      console.log(error);
      this.startTime = undefined;
    }


  }

  stop() {
    this.startTime = undefined;
    this.addErrorMessage('stop');
  }

  /** 
   * 1. skip ones that crawled within 4 hours
  */
  async crawlRestaurantGoogleListings() {
    let restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      query: {
        "googleAddress.formatted_address": { $exists: 1 },
        disabled: { $in: [null, false] }
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

    let batchSize = 500;
    if (DEBUGGING && restaurants.length > 200) {
      restaurants.length = 200;
      batchSize = 100;
    }

    // restaurants = restaurants.filter(r => r._id ==='5b127bc190ab1b1400929cb3');
    // console.log(restaurants);
    // if(new Date()){
    //   throw "test"
    // }

    const batchedRestaurants = Array(Math.ceil(restaurants.length / batchSize)).fill(0).map((i, index) => restaurants.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedRestaurants) {
      try {
        const results = await this._gmb3.crawlBatchedRestaurants(batch);
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve();
          }, 60000)
        });

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
        qmenuId: 1,
        address: 1
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

    console.log('before 12 hours filter: ', + gmbBizList.length);
    console.log('skip gmbBiz crawled within 12 hours!');
    gmbBizList = gmbBizList.filter(b => !b.crawledAt || new Date().valueOf() - new Date(b.crawledAt).valueOf() > TWELEVE_HOURS);
    console.log('after: ', + gmbBizList.length);

    const failedGmbBizList = [];
    const succeededGmbBizList = [];
    let abortionMessage;

    let batchSize = 500;

    if (DEBUGGING && gmbBizList.length > 200) {
      gmbBizList.length = 200;
      batchSize = 100;
    }

    const batchedGmbBizList = Array(Math.ceil(gmbBizList.length / batchSize)).fill(0).map((i, index) => gmbBizList.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedGmbBizList) {
      try {
        const results = await this._gmb3.crawlBatchedGmbBizList(batch);
        await new Promise(resolve => setTimeout(resolve, 6000));
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

  async purgeInvalidGmbTransferTasks() {
    return this._task.purgeTransferTasks();
  }

  async purgeInvalidGmbApplyTasks() {
    return this._task.purgeApplyTasks();
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
    const before = gmbAccounts.slice(0);
    gmbAccounts.sort((a1, a2) => new Date(a1.gmbScannedAt || 0).valueOf() - new Date(a2.gmbScannedAt || 0).valueOf());

    const after = gmbAccounts.slice(0);
    gmbAccounts = gmbAccounts.filter(g => !SKIPPING_EMAILS.some(k => g.email.indexOf(k) >= 0));


    const succeeded = [];
    const failed = [];

    if (DEBUGGING && gmbAccounts.length > 6) {
      gmbAccounts.length = 6;
    }

    const batchSize = 6;
    const batchedAccounts = Array(Math.ceil(gmbAccounts.length / batchSize)).fill(0).map((i, index) => gmbAccounts.slice(index * batchSize, (index + 1) * batchSize));


    for (let i = 0; i < batchedAccounts.length; i++) {
      this.addRunningMessage(`Batched scanning ${(i + 1)} of ${batchedAccounts.length}: ${batchedAccounts[i].map(a => a.email).join(', ')}`);
      const results = await this._gmb3.scanAccountsForLocations(batchedAccounts[i].map(a => a.email), false);
      results.map((result, index) => {
        if (Array.isArray(result)) {
          succeeded.push(batchedAccounts[i][index]);
        } else {
          failed.push(batchedAccounts[i][index]);
        }
      });

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


    gmbAccounts = gmbAccounts.filter(g => !SKIPPING_EMAILS.some(k => g.email.indexOf(k) >= 0));


    const succeeded = [];
    const failed = [];

    let batchSize = 2;
    if (DEBUGGING && gmbAccounts.length > 6) {
      gmbAccounts.length = 3;
      batchSize = 2;
    }

    const batchedAccounts = Array(Math.ceil(gmbAccounts.length / batchSize)).fill(0).map((i, index) => gmbAccounts.slice(index * batchSize, (index + 1) * batchSize));
    console.log(gmbAccounts);
    console.log(batchSize);
    console.log(batchedAccounts);
    for (let i = 0; i < batchedAccounts.length; i++) {
      this.addRunningMessage(`Batched scanning ${(i + 1)} of ${batchedAccounts.length}: ${batchedAccounts[i].map(a => a.email).join(', ')}`);

      const promises = batchedAccounts[i].map(account => this._gmb3.scanOneEmailForGmbRequests(account.email, false));

      const batchedResults = await Helper.processBatchedPromises(promises);
      batchedResults.map((result, index) => {
        if (result.success) {
          succeeded.push(gmbAccounts[index]);
        } else {
          failed.push(gmbAccounts[index]);
        }
      });
    }

    return {
      succeeded: succeeded,
      failed: failed
    }
  } // scan emails

  /** Apply for MAIN listing only */
  async scanForApplyTask() {
    // 1. no main listing ownership
    // 2. not disabled
    // 3. not already an apply task existed
    // 4. skip sale's agent 'restaurant.web.disableAutoTask' (unless it had published at least once or more than xx days created)
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant', query: {
        disabled: { $in: [null, false] },
        "googleListing.cid": { $exists: 1 }
      },
      projection: {
        "googleListing.cid": 1,
        name: 1,
        rateSchedules: 1,
        web: 1,
        score: 1
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

    // ignoreGmbOwnershipRequest
    const restaurantsToBeAppliedWithoutDisableAutoTask = restaurantsToBeApplied.filter(r => {
      const disableInitialApplyTask = r.web && r.web.disableAutoTask;
      const ignoreGmbOwnershipRequest = r.web && r.web.ignoreGmbOwnershipRequest;
      const idMoreThan30Days = Helper.getDaysFromId(r._id, new Date()) > 30;
      const hadGmb = gmbAccounts.some(account => account.locations.some(loc => loc.cid === (r.googleListing || {}).cid && loc.statusHistory.some(h => h.status === 'Published' || h.status === 'Suspended')));
      return !ignoreGmbOwnershipRequest && (!disableInitialApplyTask || hadGmb /*|| idMoreThan30Days*/);

    });

    console.log('restaurantsToBeAppliedWithoutDisableAutoTask', restaurantsToBeAppliedWithoutDisableAutoTask);

    const tasks = restaurantsToBeAppliedWithoutDisableAutoTask.map(r => {
      const gmbBiz = gmbBizList.filter(biz => biz.cid === r.googleListing.cid)[0];
      const task = {
        name: 'Apply GMB Ownership',
        scheduledAt: { $date: new Date() },
        description: r.name,
        roles: ['GMB', 'ADMIN'],
        score: r.score,
        relatedMap: { gmbBizId: gmbBiz._id, cid: gmbBiz.cid, qmenuId: r._id },
        transfer: {}
      };
      return task;
    });

    await this._api.post(environment.adminApiUrl + 'generic?resource=task', tasks).toPromise();

    return tasks;
  } // end scan


  async generateMissingGmbBizListings() {
    await this._gmb3.generateMissingGmbBizListings();
  }

  async computePostcardTasksThatJustLost() {
    await this._gmb3.computePostcardTasksThatJustLost();
  }

  async scanForAppealTasks() {
    return await this._task.scanForAppealTasks();
  }

  async purgeInvalidAppealTasks() {
    return await this._task.purgeAppealTasks();

  }

  async runAutoAppeal() {
    const openAppealTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Appeal Suspended GMB',
        result: null
      },
      limit: 5000
    }).toPromise();

    console.log(openAppealTasks.length);
    let dueTasks = openAppealTasks.filter(t => new Date(t.scheduledAt).valueOf() < new Date().valueOf());
    console.log(dueTasks.length);
    await this._gmb3.appeal(dueTasks);

  }
  gmbAccountsWithLocations
  async runInjectQmenuWebsites() {
    // 1. non-disabled restaurants
    // 2. having published cid/appealId
    // 3. check if main website or others are supposed to be qmenu's (check domain???)
    // 4. inject

    const gmbAccountsWithLocations = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        email: 1,
        password: 1,
        "locations.status": 1,
        "locations.cid": 1,
        "locations.appealId": 1,
        "locations.phone": 1,
        injection: 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        cid: 1,
        qmenuId: 1,
        reservations: 1,
        menuUrls: 1,
        serviceProviders: 1,
        gmbWebsite: 1
      },
      limit: 6000
    }).toPromise();

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        alias: 1,
        "googleListing.cid": 1,
        disabled: 1,
        "channels.value": 1,
        web: 1
      },
      limit: 6000
    }).toPromise();

    const publishedCidMap = gmbAccountsWithLocations.reduce((map, account) => (account.locations.map(loc => {
      if (loc.status === 'Published') {
        map[loc.cid] = {
          location: loc,
          account: account
        };
      }
    }), map), {});


    const publishedList = Object.keys(publishedCidMap).map(k => publishedCidMap[k]);

    gmbBizList.map(biz => {
      if (publishedCidMap[biz.cid]) {
        publishedCidMap[biz.cid].gmbBiz = biz;
      }
    });

    // matching order: 1. cid, 2. qmenuId, 3. phone
    publishedList.map(item => {
      let restaurantByCid = restaurants.filter(r => !r.disabled && r.googleListing && r.googleListing.cid === item.location.cid)[0];
      let restaurantByCidDisabled = restaurants.filter(r => r.disabled && r.googleListing && r.googleListing.cid === item.location.cid)[0];
      let restaurantByQmenuId = restaurants.filter(r => r._id === (item.gmbBiz || {}).qmenuId)[0];
      let restaurantByPhone = restaurants.filter(r => !r.disabled && (r.channels || []).some(c => c.value === item.location.phone))[0];
      item.restaurant = restaurantByCid || restaurantByCidDisabled || restaurantByQmenuId || restaurantByPhone;
    });

    const missingBiz = publishedList.filter(p => !p.gmbBiz);
    const missingRestaurant = publishedList.filter(p => !p.restaurant);
    const withDisabledRestaurants = publishedList.filter(p => p.restaurant && p.restaurant.disabled);
    const consideredItems = publishedList.filter(item => missingBiz.indexOf(item) < 0 && missingRestaurant.indexOf(item) < 0 && withDisabledRestaurants.indexOf(item) < 0);

    console.log('publishedList', publishedList);
    console.log('missingBiz', missingBiz);
    console.log('missingRestaurant', missingRestaurant);
    console.log('withDisabledRestaurants', withDisabledRestaurants);
    console.log('consideredItems', consideredItems);

    const nokItems = consideredItems.map(item => {
      // website, menu, 

      // make sure we have web object!
      const target = Helper.getDesiredUrls(item.restaurant);
      try {

        const isWebsiteOk = Helper.areDomainsSame(target.website, item.gmbBiz.gmbWebsite) || (item.gmbBiz.gmbWebsite && item.gmbBiz.gmbWebsite.indexOf('qmenu') > 0 && (item.gmbBiz.gmbWebsite.indexOf('target') < 0));
        const isMenuUrlOk = (item.gmbBiz.menuUrls || []).length > 0 && (item.gmbBiz.menuUrls || []).some(url => Helper.areDomainsSame(url, target.menuUrl));
        const isReservationOk = (item.gmbBiz.reservations || []).length > 0 && (item.gmbBiz.reservations || []).some(url => Helper.areDomainsSame(url, target.reservation));


        item.isWebsiteOk = isWebsiteOk;
        item.isMenuUrlOk = isMenuUrlOk;
        item.isReservationOk = isReservationOk;

        item.targetWebsite = target.website;
        item.targetMenuUrl = target.menuUrl;
        item.targetOrderAheadUrl = target.orderAheadUrl;
        item.targetReservation = target.reservation;
      }
      catch (e) {
        console.log('error in restaurant', item.restaurant);
      }

      return item;
    }).filter(item => !item.isWebsiteOk || !item.isMenuUrlOk || !item.isReservationOk);

    console.log('allNokItems', nokItems);
    const websiteNokItems = nokItems.filter(item => !item.isWebsiteOk || !item.isMenuUrlOk);


    websiteNokItems.map(item => {
      if (item.targetWebsite && item.targetWebsite.startsWith('http:')) {
        item.targetWebsite = 'https://qmenu.us/#/' + item.restaurant.alias;
      }
    });
    console.log('websiteNokItems', websiteNokItems);
    // if(new Date()){
    //   throw "Test";
    // }

    // now inject!
    const appealIdInjectTimeDict = {};
    gmbAccountsWithLocations.map(account => Object.keys((account.injection || {})).map(k => appealIdInjectTimeDict[k] = account.injection[k].time));

    console.log(appealIdInjectTimeDict);

    const havingTargetWebsiteNokItems = websiteNokItems.filter(item => item.targetWebsite);
    console.log('havingTargetWebsiteNokItems', havingTargetWebsiteNokItems);

    console.log(appealIdInjectTimeDict);

    const oldNokItems = havingTargetWebsiteNokItems.filter(item => !appealIdInjectTimeDict[item.location.appealId] || (new Date().valueOf() - new Date(appealIdInjectTimeDict[item.location.appealId]).valueOf() > TWO_HOURS));

    console.log('oldNokItems', oldNokItems);

    let batchSize = 2;
    if (DEBUGGING && oldNokItems.length > 6) {
      oldNokItems.length = 6;
      batchSize = 2;
    }

    const batchedItems = Array(Math.ceil(oldNokItems.length / batchSize)).fill(0).map((i, index) => oldNokItems.slice(index * batchSize, (index + 1) * batchSize)).filter(batch => batch.length > 0);
    for (let batch of batchedItems) {
      const promises = batch.map(item =>
        this._api
          .post(environment.adminApiUrl + 'utils/crypto', { salt: item.account.email, phrase: item.account.password }).toPromise()
          .then(password => this._api.post(
            environment.autoGmbUrl + 'updateWebsite', {
              email: item.account.email,
              password: password,
              websiteUrl: item.targetWebsite,
              menuUrl: item.targetMenuUrl,
              orderAheadUrl: item.targetOrderAheadUrl,
              reservationsUrl: item.targetReservation,
              appealId: item.location.appealId,
              stayAfterScan: false
            }
          ).toPromise())
      );
      const batchResult = await Helper.processBatchedPromises(promises);
      // // update account's history
      const patchPairs = batch.map((item, index) => {
        const injection = {};
        injection[item.location.appealId] = {
          time: new Date(),
          success: batchResult[index].success
        }
        return {
          old: { _id: item.account._id, injection: {} },
          new: { _id: item.account._id, injection }
        };
      });
      console.log(patchPairs);
      await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount', patchPairs).toPromise();
    } // end batch
  }
}