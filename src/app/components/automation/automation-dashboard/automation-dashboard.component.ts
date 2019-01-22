import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
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



      //  retrieve all accounts:
      // try {
      //   this.addRunningMessage('retrieve all accounts')
      //   const gmbAccounts = await this._api.get(environment.adminApiUrl + "generic", {
      //     resource: "gmbAccount",
      //     projection: {
      //       email: 1,
      //       password: 1,
      //       gmbScannedAt: 1
      //     },
      //     limit: 5000
      //   }).toPromise();
      //   this.addRunningMessage(`total: ${gmbAccounts.length}`);
      //   for (let gmbAccount of gmbAccounts) {
      //     if (!this.startTime) {
      //       break;
      //     }
      //     try {


      //       // 2. inject modified websites: qMenu managed, has website, but websites are modified
      //       const publishedLocations = locations.filter(loc => loc.status === 'Published');
      //       if (publishedLocations.length > 0) {

      //         const bizListToBeUpdated = [];
      //         // find which gmbBiz needs update website: linked by place_id
      //         publishedLocations.map(loc => {
      //           const biz = gmbBizList.filter(b => b.place_id && b.place_id === loc.place_id)[0];
      //           if (loc.homepage && biz && (biz.bizManagedWebsite || biz.qmenuWebsite)) {
      //             const mainWebsite = (biz.useBizWebsite && biz.bizManagedWebsite) || biz.qmenuWebsite;
      //             if (!Helper.areDomainsSame(loc.homepage, mainWebsite)) {
      //               bizListToBeUpdated.push(biz);
      //             }
      //           }
      //         });

      //         // crawl published locations!
      //         const publishedBizList = publishedLocations.map(loc => gmbBizList.filter(b => b.place_id && b.place_id === loc.place_id)[0]).filter(b => b) as GmbBiz[];

      //         for (let biz of publishedBizList) {
      //           try {
      //             const crawlResult = await this._gmb.crawlOneGoogleListing(biz);
      //             const mainWebsite = (biz.useBizWebsite && biz.bizManagedWebsite) || biz.qmenuWebsite;
      //             const qmenuWebsite = biz.qmenuWebsite || biz.bizManagedWebsite;

      //             if (!mainWebsite) {
      //               continue;
      //             }


      //             if (
      //               !Helper.areDomainsSame(crawlResult.gmbWebsite, mainWebsite)
      //               || (crawlResult.menuUrls && !crawlResult.menuUrls.some(url => Helper.areDomainsSame(qmenuWebsite, url))) // we insist qmenu website here
      //               || (crawlResult.reservations && !crawlResult.reservations.some(url => Helper.areDomainsSame(qmenuWebsite, url))) // we insist qmenu website here
      //               // || (crawlResult.serviceProviders && !crawlResult.serviceProviders.some(url => Helper.areDomainsSame(qmenuWebsite, url)))
      //             ) {

      //               bizListToBeUpdated.push(biz);
      //             }

      //             // if main website is NOT mainWebsite or one of reservation URL, menu URL etc is not qmenu website, we need to update!
      //           } catch (error) {
      //             console.log(error);
      //             this.addErrorMessage(`Error crawling ${biz.name}`);
      //           }
      //         }

      //         const uniqueBizList = [...new Set(bizListToBeUpdated)];
      //         console.log('need update website list,', uniqueBizList);

      //         for (let gmbBiz of uniqueBizList) {
      //           try {
      //             this.addRunningMessage(`update website: ${gmbBiz.name}`);
      //             await this._gmb.updateGmbWebsite(gmbBiz, false);
      //             this.executedTasks++;
      //           } catch (error) {
      //             this.addErrorMessage('ERROR ---> injecting ' + gmbBiz.name);
      //           }
      //         }
      //       } // end publishedLocations.length > 0

      //       // 3. appeal due suspended tasks
      //       const appealTasks = await this._api.get(environment.adminApiUrl + "generic", {
      //         resource: "task",
      //         query: {
      //           name: 'Appeal Suspended GMB',
      //           "relatedMap.gmbBizId": { $in: gmbBizList.map(gmbBiz => gmbBiz._id) },
      //           "relatedMap.gmbAccountId": gmbAccount._id,
      //           result: null
      //         },
      //         limit: 5000
      //       }).toPromise();

      //       const dueAppealTasks = appealTasks.filter(t => new Date(t.scheduledAt || 0) < this.now);
      //       console.log('due appeal tasks');
      //       console.log(dueAppealTasks)

      //       for (let task of dueAppealTasks) {
      //         // find gmbBiz
      //         if (task.relatedMap && task.relatedMap.gmbBizId) {
      //           const gmbBiz = gmbBizList.filter(biz => biz._id === task.relatedMap.gmbBizId)[0];
      //           try {
      //             this.addRunningMessage(`appeal ${gmbBiz.name}`);
      //             await this._gmb.appeal(gmbAccount, gmbBiz, task);
      //             this.executedTasks++;
      //           } catch (error) {
      //             this.addErrorMessage(`ERROR ---> appeal suspended ${gmbBiz && gmbBiz.name}`);
      //           }
      //         }
      //       } // end 3

      //       // others go below in future...

      //     } catch (error) {
      //       this.addErrorMessage('ERROR ---> ' + gmbAccount.email);
      //     }
      //     this.scannedAccounts++;
      //   } // end each gmbAccount
      // } catch (error) {
      //   this.addErrorMessage('ERROR ---> ' + error);
      //   console.log(error);
      // } // end one BIG loop


      // find the newly LOST gmb!
      // try {
      //   const gmbBizList = (await this._api.get(environment.adminApiUrl + 'generic', {
      //     resource: 'gmbBiz',
      //     projection: {
      //       gmbOwnerships: { $slice: -4 },
      //       name: 1,
      //       score: 1,
      //       place_id: 1
      //     },
      //     limit: 10000
      //   }).toPromise()).map(biz => new GmbBiz(biz));

      //   const disabledRestaurants = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      //     resource: 'restaurant',
      //     query: {
      //       disabled: true
      //     },
      //     projection: {
      //       name: 1
      //     },
      //     limit: 10000
      //   }).toPromise());

      //   const notOwnedList = gmbBizList.filter(biz => !biz.gmbOwnerships || biz.gmbOwnerships.length === 0 || !biz.gmbOwnerships[biz.gmbOwnerships.length - 1].email);

      //   console.log('Not owned: ', notOwnedList.length);
      //   // further filter
      //   const minScore = 1;
      //   const minHistoryLength = 1;

      //   const filteredList = notOwnedList.filter(biz => (biz.score || 0) >= minScore && biz.gmbOwnerships && biz.gmbOwnerships.length >= minHistoryLength);
      //   console.log('Filtered list: ', filteredList.length);

      //   const outstandingApplyTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      //     resource: "task",
      //     query: {
      //       name: 'Apply GMB Ownership',
      //       result: null
      //     },
      //     projection: {
      //       relatedMap: 1
      //     },
      //     limit: 5000
      //   }).toPromise();


      //   // should apply GMB:
      //   // 1. restaurant is not closed;
      //   // 2. gmbBiz has place_id;
      //   // 3. not already existed

      //   const shouldApplyList = filteredList
      //     .filter(biz => !biz.disableAutoTask)
      //     .filter(biz => !biz.closed && biz.place_id && !outstandingApplyTasks.some(t => t.relatedMap && t.relatedMap.gmbBizId === biz._id))
      //     .filter(gmbBiz => !disabledRestaurants.some(r => r._id === gmbBiz.qmenuId));

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

      this.addRunningMessage('Scan accounts for GMB status...');
      const accountsScanResult = await this.scanGmbAccounts();
      this.addRunningMessage('Succeeded ' + accountsScanResult.succeeded.length + ', failed ' + accountsScanResult.failed.length + ', new ' + accountsScanResult.new.length + ', lost ' + accountsScanResult.lost.length);


      this.addRunningMessage('Scan emails...');
      const emailsResult = await this.scanEmailsForRequests();
      this.addRunningMessage('Succeeded ' + emailsResult.succeeded.length + ', failed ' + emailsResult.failed.length + ', new requests ' + emailsResult.newRequests.length);

      this.addRunningMessage('Crawl restaurants...');
      const restaurantCrawlingResult = await this.crawlRestaurantGoogleListings();
      this.addRunningMessage('Succeeded ' + restaurantCrawlingResult.succeeded.length + ', failed ' + restaurantCrawlingResult.failed.length);
      if (restaurantCrawlingResult.abortionMessage) {
        this.addErrorMessage(restaurantCrawlingResult.abortionMessage);
      }

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
        relatedMap: { 'gmbBizId': gmbBiz._id },
        transfer: {}
      };
      return task;
    });
    await this._api.post(environment.adminApiUrl + 'generic?resource=task', tasks).toPromise();
    return tasks;
  }

  /** 
   * 1. skip ones that crawled within 4 hours
   * 2. also update gmbBiz's if same cid found!
   * 3. break, if service is down
   * 4. break if found same cid for two qmenu restaurants
  */
  async crawlRestaurantGoogleListings() {

    let restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      query: {
        "googleAddress.formatted_address": { $exists: 1 }
      },
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.crawledAt": 1,
        "googleAddress.formatted_address": 1
      },
      limit: 80000
    }).toPromise();

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

    // sort by crawledAt:
    restaurants.sort((r1, r2) => new Date((r1.googleListing || {}).crawledAt || 0).valueOf() - new Date((r2.googleListing || {}).crawledAt || 0).valueOf());

    console.log('before: ', restaurants.length);
    console.log('skip restaurants crawled within 4 hours!');
    const now = new Date();
    restaurants = restaurants.filter(r => !r.googleListing || !r.googleListing.crawledAt || now.valueOf() - new Date(r.googleListing.crawledAt).valueOf() > TWELEVE_HOURS);
    console.log('after: ', restaurants.length);

    const patchListing = (restaurant, result) => {
      result['crawledAt'] = new Date();
      //patch restaurant googleListing crawledAt:
      return this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
        {
          old: { _id: restaurant._id },
          new: { _id: restaurant._id, googleListing: result }
        }
      ]).toPromise();
    }

    console.log(restaurants)
    const failedRestaurants = [];
    const succeededRestaurants = [];
    let abortionMessage;
    for (let i = 0; i < restaurants.length; i++) {
      const r = restaurants[i];
      console.log(`crawling ${i + 1} of ${restaurants.length} ${r.name} ${r._id}`);

      let result = {} as any;
      try {
        result = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", {
          q: r.name + " " + r.googleAddress.formatted_address
        }).toPromise();
        await patchListing(r, result);

        if (gmbBizList.some(biz => biz.qmenuId && biz.qmenuId !== r._id && biz.cid === result.cid)) {
          console.log('FOUND cid matched on DIFFERENT restaurant.');
          console.log(r);
          console.log(gmbBizList.filter(biz => biz.qmenuId && biz.qmenuId !== r._id && biz.cid === result.cid));
          abortionMessage = 'FOUND cid matched on DIFFERENT restaurant.';

          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
            old: { _id: r._id },
            new: { _id: r._id, error: 'cid matched to different biz with different qmenuId. cid=' + result.cid }
          }]).toPromise();
          continue;

        }

        const affectedBizList = gmbBizList.filter(biz => biz.cid === result.cid);
        if (affectedBizList.length > 0) {
          // unfortunately, we don't want to update name and address (because scan GMB account need name and address to match things :()
          delete result.name;
          delete result.address;

          await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz',
            affectedBizList.map(gmbBiz => ({
              old: { _id: gmbBiz._id },
              new: { _id: gmbBiz._id, ...result, crawledAt: new Date(), qmenuId: r._id }
            }))
          ).toPromise();

          // also update biz crawledAt so that later we don't crawl it again!
          affectedBizList.map(biz => biz.crawledAt = new Date());

        } else {
          // case no matching gmbs
          console.log('No gmb found for ' + r.name);
        }

        succeededRestaurants.push(r);

      } catch (error) {

        failedRestaurants.push(r);
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
          {
            old: { _id: r._id },
            new: { _id: r._id, error: error }
          }
        ]).toPromise();

        console.log('error crawling ' + r.name + ' ' + r._id);
        if (error.status !== 400) {
          console.log(error);
          console.log('Service unhandled error, stopped.');
          abortionMessage = 'Service unhandled error, stopped.';
          // break;
        } else {
          await patchListing(r, {});
        }
      }
    }

    return {
      abortionMessage: abortionMessage,
      failed: failedRestaurants,
      succeeded: succeededRestaurants
    };
  }

  /** 
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

    for (let i = 0; i < gmbBizList.length; i++) {
      const biz = gmbBizList[i];
      console.log(`crawling ${i + 1} of ${gmbBizList.length} ${biz.name} ${biz._id}`);
      try {
        const result = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", {
          q: biz.name,
          ludocid: biz.cid
        }).toPromise();

        if (result.cid !== biz.cid && result.name !== biz.name) {
          console.log(biz);
          console.log(result);

          await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', [
            {
              old: { _id: biz._id },
              new: { _id: biz._id, error: 'cid NOT same after using lucid scan' }
            }
          ]).toPromise();
          continue;

        }

        // unfortunately, we don't want to update name and address (because scan GMB account need name and address to match things :()
        delete result.name;
        delete result.address;

        await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz',
          [{
            old: { _id: biz._id },
            new: { _id: biz._id, ...result, crawledAt: new Date() }
          }]).toPromise();
        console.log('updated ' + biz.name);
        succeededGmbBizList.push(biz);
      }
      catch (error) {
        console.log(error);
        failedGmbBizList.push(biz);
        if (error.status && error.status !== 400) {
          abortionMessage = 'Service unhandled error, stopped.';

        }
        if (!error.status) {
          abortionMessage = error;

        }

        await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', [
          {
            old: { _id: biz._id },
            new: { _id: biz._id, error: error }
          }
        ]).toPromise();

      }
    }

    return {
      succeeded: succeededGmbBizList,
      failed: failedGmbBizList,
      abortionMessage: abortionMessage
    };

  }

  async scanGmbAccounts() {

    let gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        gmbScannedAt: 1,
        password: 1,
        email: 1,
        migrated: 1
      },
      limit: 6000
    }).toPromise();

    gmbAccounts.sort((a1, a2) => new Date(a1.gmbScannedAt || 0).valueOf() * (a1.migrated ? 1 : 0) - new Date(a2.gmbScannedAt || 0).valueOf() * (a2.migrated ? 1 : 0));

    console.log(gmbAccounts);

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      // MUST: name, address, appealId, and accounts for matching
      projection: {
        name: 1,
        address: 1,
        appealId: 1,
        accounts: 1,
        cid: 1,
        qmenuId: 1
      },
      limit: 6000
    }).toPromise();


    // debug
    gmbAccounts = gmbAccounts.filter(a => a.email.startsWith('qmenu06'));
    const succeededAccounts = [];
    const failedAccounts = [];
    const newPublishedList = [];
    const lostList = [];

    for (let i = 0; i < gmbAccounts.length; i++) {
      const account = gmbAccounts[i];
      console.log(`${i + 1}/${gmbAccounts.length} ${account.email}...`);

      try {
        let password = account.password;
        if (password.length > 20) {
          password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: account.email, phrase: password }).toPromise();
        }

        // scan locations
        // for each biz, MUST: name, address, appealId, and accounts for matching
        // if NOT migrated, we'd like to rescan for cids!
        const knownGmbBizList = account.migrated ? gmbBizList : [];
        const scanResult = await this._api.post(environment.autoGmbUrl + 'scanLocations2', { email: account.email, password: password, knownGmbBizList: knownGmbBizList, stayAfterScan: false }).toPromise();

        const locations = scanResult.locations;

        console.log(scanResult);

        // 10/28/2018 Treating Pending edits as Published!
        locations.map(loc => {
          if (loc.status === 'Pending edits') {
            loc.status = 'Published';
          }
        });

        // skip if there is nothing in the account!
        if (scanResult.length === 0) {
          continue;
        }

        // we need to sort so that Published override others in case there are multiple locations for same restaurant
        const statusOrder = ['Duplicate', 'Verification required', 'Pending verification', 'Suspended', 'Published'];
        locations.sort((l1, l2) => statusOrder.indexOf(l1.status) - statusOrder.indexOf(l2.status));

        console.log('scanned locations: ', locations);
        // SKIP handling of duplicated cid listings: We keep ONLY the last appeared ones!
        const uniqueLocations = [];
        for (let j = 0; j < locations.length; j++) {
          if (!locations.slice(j + 1).some(loc => loc.cid === locations[j].cid)) {
            uniqueLocations.push(locations[j]);
          }
        }

        console.log('unique locations: ', uniqueLocations);

        // await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount', []).toPromise();

        // update strategy:
        // 1. Find ALL related gmbBiz having this account, update last status if not same!
        //    a. if NOT found, attach a 'Removed' status;
        //    b. otherwise attach latest status
        // 2. For Suspended or Published, and NOT finding any matching GMB Biz, create a GMB biz and attach this status

        const updatedGmbBizList = [];
        const noMatchingLocations = [];

        // find those gmbBiz that used to have this account history but now don't, we attached a history with an artificial status 'Removed'

        gmbBizList.map(biz => (biz.accounts || []).map(acct => {
          if (acct.email === account.email && !uniqueLocations.some(loc => (loc.cid && loc.cid === biz.cid) || (loc.appealId && loc.appealId === biz.appealId))) {
            acct.history = acct.history || [];
            if (acct.history.length === 0 || acct.history[acct.history.length - 1].status !== 'Removed') {
              acct.history.push({
                time: new Date(),
                status: 'Removed'
              });
              updatedGmbBizList.push(biz);
              console.log(biz.name + ' was removed');
            }
          }
        }));

        uniqueLocations.map(loc => {
          const matchedBizList = gmbBizList.filter(biz => (loc.cid && biz.cid === loc.cid) || (loc.appealId && biz.appealId === loc.appealId));
          if (matchedBizList.length === 0) {
            // only we hav cid
            if (loc.cid) {
              noMatchingLocations.push(loc);
            }
          } else {
            // found matching locations! let's test if they need update
            matchedBizList.map(biz => {
              let acct = (biz.accounts || []).filter(a => a.email === account.email)[0];
              let updated = false;
              if (!acct) {
                biz.accounts = biz.accounts || [];
                acct = {
                  email: account.email,
                  id: account._id,
                  history: [] // empty is OK because the following will fill it up
                };
                biz.accounts.push(acct);
                updated = true;
              }
              acct.history = acct.history || [];

              // case last status was changed, we push a new status to it!
              if (acct.history.length === 0 || acct.history[acct.history.length - 1].status !== loc.status) {
                acct.history.push({
                  time: new Date(),
                  status: loc.status
                });
                updated = true;
              }

              ['cid', 'name', 'address', "apppealId"].map(field => {
                if (loc[field] && biz[field] !== loc[field]) {
                  // we MUST have matched by appealId

                  biz[field] = loc[field];
                  updated = true;
                }
              });

              if (updated) {
                updatedGmbBizList.push(biz);
                console.log(biz);
              }
            });
          } // end else block

        }); // end unique locations iteration

        if (noMatchingLocations.length > 0) {
          const newGmbBizList = noMatchingLocations.map(loc => ({
            accounts: [{
              email: account.email,
              id: account._id,
              history: [{
                time: new Date(),
                status: loc.status
              }]
            }],

            address: loc.address,
            appealId: loc.appealId,
            cid: loc.cid,
            gmbWebsite: loc.homepage,
            name: loc.name,
            place_id: loc.place_id,
          }));

          const newIds = await this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', newGmbBizList).toPromise();
          // inject Ids to
          newIds.map((id, index) => newGmbBizList[index]['_id'] = id);
          gmbBizList.push(...newGmbBizList);

          // also findout newly published
          newPublishedList.push(...newGmbBizList.filter(biz => biz.accounts[0].history[0].status === 'Published').map(biz => ({
            gmbBiz: biz,
            gmbAccount: account
          })));

        }

        console.log('not matched locations (new): ', noMatchingLocations)

        if (updatedGmbBizList.length > 0) {
          await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbBiz', updatedGmbBizList.map(biz => ({
            old: { _id: biz._id },
            new: {
              _id: biz._id,
              accounts: biz.accounts,
              cid: biz.cid,
              name: biz.name, // keep account's version other than publish listing scan version, to reduce scan
              address: biz.address, // keep account's version other than publish listing scan version
              appealId: biz.appealId  // keep account's version other than publish listing scan version
            } // because cid might have been changed back to account assigned cid. We used to have main cid scanned into account's cid
          }))).toPromise();

          // also findout newly lost
          const newlyLostBizList = updatedGmbBizList
            .filter(biz => {
              const acct = biz.accounts.filter(a => a.email === account.email)[0];
              const historyLength = acct.history.length;
              return historyLength > 1 && acct.history[historyLength - 2] === 'Published' && acct.history[historyLength - 1] !== 'Published';
            });
          lostList.push(...newlyLostBizList.map(biz => ({
            gmbBiz: biz,
            gmbAccount: account
          })))
        }

        console.log('updated biz: ', updatedGmbBizList);

        await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount', [
          {
            old: { _id: account._id },
            new: { _id: account._id, migrated: true, gmbScannedAt: { $date: new Date() }, pagerSize: scanResult.pagerSize, allLocations: scanResult.allLocations, published: scanResult.published, suspended: scanResult.suspended }
          }
        ]).toPromise();
        console.log('updated gmbScannedAt for ' + account.email);

        succeededAccounts.push(account);
      } catch (error) {
        failedAccounts.push(account);
      } // end catch


    } // end gmbAccounts iteration

    return {
      succeeded: succeededAccounts,
      failed: failedAccounts,
      new: newPublishedList,
      lost: lostList
    };

  } // end scanGmbAccounts

  /** scalable upto 6000 gmbBiz list */
  async scanEmailsForRequests() {
    console.log('emails');

    let gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        emailScannedAt: 1,
        password: 1,
        email: 1
      },
      limit: 6000
    }).toPromise();

    gmbAccounts.sort((a1, a2) => new Date(a1.emailScannedAt || 0).valueOf() - new Date(a2.emailScannedAt || 0).valueOf());

    console.log(gmbAccounts);
    // debug
    // gmbAccounts = gmbAccounts.filter(a => a.email.startsWith('weborders88'));

    // let's only scan emails within 15 days (ignore 15 days or earlier ones)
    const daysAgo15 = new Date();
    daysAgo15.setDate(daysAgo15.getDate() - 15);
    const existingRequests = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbRequest',
      query: {
        createdAt: { $gte: { $date: daysAgo15 } }
      },
      projection: {
        gmbBizId: 1,
        gmbAccountId: 1,
        date: 1,
        business: 1,
        email: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 100000
    }).toPromise();
    existingRequests.sort((r1, r2) => new Date(r1.date).valueOf() - new Date(r2.date).valueOf());

    console.log('queried existing requests within 15 days: ', existingRequests.length);
    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        accounts: 1,
        cid: 1,
        qmenuId: 1
      },
      limit: 6000
    }).toPromise();

    const succeededAccounts = [];
    const failedAccounts = [];
    const newRequests = [];

    for (let i = 0; i < gmbAccounts.length; i++) {
      const account = gmbAccounts[i];
      console.log(`${i + 1}/${gmbAccounts.length} ${account.email}...`);
      let password = account.password;


      try {
        if (password.length > 20) {
          password = await this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: account.email, phrase: password }).toPromise();
        }

        // scan locations
        const scanResult = await this._api.post(environment.autoGmbUrl + 'retrieveGmbRequests', { email: account.email, password: password, stayAfterScan: false }).toPromise();
        console.log('scanned ', scanResult);

        // convert date to $date
        scanResult.map(sr => sr.date = new Date(sr.date));

        // remove those that are more than 15 days old!
        const scanResultWithin15Days = scanResult.filter(item => new Date(item.date).valueOf() > daysAgo15.valueOf());
        console.log('within 15 days ', scanResultWithin15Days);
        // SAME email, business, and date --> same request!
        const newItems = scanResultWithin15Days.filter(item => !existingRequests.some(r => r.business === item.business && r.email === item.email && new Date(r.date).valueOf() === new Date(item.date).valueOf()));
        console.log('new items: ', newItems);
        // match gmbBizId: (by name under account??? what if duplicate?)
        // if we didn't find a match, skip it. This may due to outdated account scan (gmbBiz doesn't register yet)


        newItems.map(item => {
          // biz match strategy: same name, same account email, and first encounter of status before this item's date is Published!
          const matchedBiz = gmbBizList.map(biz => {
            const exactNameMatched = biz.name.toLowerCase() === item.business.toLowerCase();
            const skippedKeywords = ['the', 'restaurant', '&', 'and'];
            const fuzzyNameMatched = biz.name.toLowerCase().split(' ').filter(t => t && skippedKeywords.indexOf(t) < 0).join(',') === item.business.toLowerCase().split(' ').filter(t => t && skippedKeywords.indexOf(t) < 0).join(',');

            const matchedAccount = (biz.accounts || []).filter(acct => acct.email === account.email)[0];
            const matchedAccountHistory = (matchedAccount || {}).history || [];
            const lastIsPublished = (matchedAccountHistory[matchedAccountHistory.length - 1] || {}).status === 'Published';

            const holdingAccountHistoryBefore = matchedAccountHistory.filter(h => new Date(h.time).valueOf() < new Date(item.date).valueOf());
            const wasPublished = (holdingAccountHistoryBefore[holdingAccountHistoryBefore.length - 1] || {}).status === 'Published';

            const matchScore = 0;
            const matchScoreMap = {
              exactNameMatched: 10,
              fuzzyNameMatched: 8,
              matchedAccount: 8,
              lastIsPublished: 5,
              wasPublished: 5
            };

            const nameScore = exactNameMatched ? 10 : (fuzzyNameMatched ? 8 : 0);
            const accountScore = matchedAccount ? (wasPublished || lastIsPublished ? 13 : 8) : 0;

            return {
              score: nameScore + accountScore,
              biz: biz
            };
          }).sort((r1, r2) => r2.score - r1.score)[0];

          if (!matchedBiz) {
            console.log('NO MATCH');
            console.log(account.email);
            console.log(gmbBizList);
            console.log(item);
            throw 'NOT MATCHED ANYTHING'
          }

          item.gmbBizId = matchedBiz.biz._id;
          item.cid = matchedBiz.biz.cid;
          item.gmbAccountId = account._id;
          item.gmbAccountEmail = account.email;

        });

        // now let's save ALL to gmbRequest table!
        if (newItems.length > 0) {
          await this._api.post(environment.adminApiUrl + 'generic?resource=gmbRequest', newItems).toPromise();
          console.log('found new requests: ' + newItems.length);
          newRequests.push(...newItems);
        } else {
          console.log('no new request found');
        }

        await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount', [
          {
            old: { _id: account._id },
            new: { _id: account._id, emailScannedAt: { $date: new Date() } }
          }
        ]).toPromise();
        console.log('updated emailScannedAt for ' + account.email);

        succeededAccounts.push(account);
      } catch (error) {

        failedAccounts.push(account);
      } // end catch

    } // end gmbAccounts iteration

    return {
      succeeded: succeededAccounts,
      failed: failedAccounts,
      newRequests: newRequests
    };

  } // scan emails




  async scanForTransferTask() {
    const gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        score: 1,
        accounts: 1,
        qmenuId: 1,
        ignoreGmbOwnershipRequest: 1
      },
      limit: 6000
    }).toPromise();

    const myEmails = new Set(gmbAccounts.map(acct => acct.email));
    const gmbBizIdMap = gmbBizList.reduce((result, biz) => (result[biz._id] = biz, result), {});
    const gmbAccountIdMap = gmbAccounts.reduce((result, acct) => (result[acct._id] = acct, result), {});

    const recentRequests = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbRequest',
      sort: {
        createdAt: -1
      },
      limit: 1400
    }).toPromise();

    const outstandingTransferTasks = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'task',
      query: {
        name: 'Transfer GMB Ownership',
        result: null,
        // 'transfer.code': { $exists: true }
      },
      projection: {
        relatedMap: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 6000
    }).toPromise();


    // tracking hostile requests
    const bizAccountRequestsMap = {};

    recentRequests.map(request => {
      const gmbAccount = gmbAccountIdMap[request.gmbAccountId];
      const gmbBiz = gmbBizIdMap[request.gmbBizId];
      if (gmbBiz && gmbAccount) {
        // valid attacker:
        // 1. account must be currently published
        // 2. request time is after published time
        // 3. NOT self
        const isSelf = myEmails.has(request.email);
        const lastHistory = (gmbBiz.accounts || []).filter(acct => acct.email === gmbAccount.email && acct.history).map(acct => acct.history.slice(-1)[0])[0];
        const isPublished = lastHistory && lastHistory.status === 'Published';
        const requestAfterPublished = lastHistory && new Date(request.date).valueOf() > new Date(lastHistory.time).valueOf();

        if (!isSelf && isPublished && requestAfterPublished) {
          const compositeId = gmbBiz._id + gmbAccount._id;
          bizAccountRequestsMap[compositeId] = bizAccountRequestsMap[compositeId] || [];
          bizAccountRequestsMap[compositeId].push({
            gmbBiz: gmbBiz,
            gmbAccount: gmbAccount,
            gmbRequest: request
          });
        }

      }
    });

    const newTransferTasks = [];

    Object.keys(bizAccountRequestsMap).map(key => {

      const gmbBiz = bizAccountRequestsMap[key][0].gmbBiz;
      const gmbAccount = bizAccountRequestsMap[key][0].gmbAccount;
      // calculate the *ealiest(smalleest)* deadline to transfer (normal -> +7, reminder -> +4)
      let deadline = new Date('2099-1-1'); // long enough

      // gorup by request email to make figure out first, second, and third reminder!
      const requests = bizAccountRequestsMap[key].map(row => row.gmbRequest);
      // sort requests DESC
      requests.sort((r1, r2) => new Date(r2.date).valueOf() - new Date(r1.date).valueOf());
      for (let i = 0; i < requests.length - 1; i++) {
        if (requests[i].isReminder) {
          for (let j = i + 1; j < requests.length; j++) {
            if (requests[j].email === requests[i].email && new Date(requests[i].date).valueOf() - new Date(requests[j].date).valueOf() < 8 * 24 * 3600000) {
              if (requests[j].isReminder) {
                requests[i].previousReminders = requests[i].previousReminders || 0;
                requests[i].previousReminders = requests[i].previousReminders + 1;
                requests[i].foundOriginal = true;
              } else {
                requests[i].foundOriginal = true;
              }
            }
          }
        }
      }

      const dueDays = bizAccountRequestsMap[key].map(row => {
        const dueDate = new Date(row.gmbRequest.date);
        dueDate.setDate(dueDate.getDate() + (row.gmbRequest.isReminder ? (row.gmbRequest.foundOriginal ? (4 - 2 * (row.gmbRequest.previousReminders || 0)) : 0) : 7));
        return { dueDate: dueDate, gmbAccount: gmbAccount, gmbBiz: gmbBiz, gmbRequest: row.gmbRequest };
      });

      dueDays.sort((d1, d2) => d1.dueDate.valueOf() - d2.dueDate.valueOf());
      // console.log(dueDays);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 21);

      const dueDate = dueDays[dueDays.length - 1].dueDate;

      if (dueDate.valueOf() < threshold.valueOf()) {
        console.log('SKIP OLD ONES' + ' ' + gmbBiz.name + ' @ ' + gmbAccount.email);
      } else {
        console.log(dueDate + ' ' + gmbBiz.name + ' @ ' + gmbAccount.email);

        const existingTasks = outstandingTransferTasks.filter(t => t.relatedMap.gmbAccountId === gmbAccount._id && t.relatedMap.gmbBizId === gmbBiz._id);
        console.log(existingTasks);
        if (existingTasks.length === 0) {
          console.log('DANGER!');
          newTransferTasks.push({
            dueDate: dueDays[dueDays.length - 1].dueDate,
            gmbBiz: gmbBiz,
            gmbAccount: gmbAccount,
            gmbRequest: dueDays[dueDays.length - 1].gmbRequest
          });
        }
      }

    }); // end each biz + account

    console.log(newTransferTasks);

    if (newTransferTasks.length === 0) {
      return [];
    }

    const relatedRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $in: newTransferTasks.map(t => t.gmbBiz.qmenuId).filter(id => id).map(id => ({ $oid: id })) } },
      projection: {
        disabled: 1
      },
      limit: newTransferTasks.length
    }).toPromise();

    console.log(relatedRestaurants);

    const validTransferTasks = newTransferTasks.filter(t => !t.gmbBiz.ignoreGmbOwnershipRequest && !(relatedRestaurants.filter(r => r._id === t.gmbBiz.qmenuId).map(r => r.disabled)[0]));

    const tasks = validTransferTasks
      .map(t => ({
        name: 'Transfer GMB Ownership',
        scheduledAt: new Date(t.dueDate.valueOf() - 2 * 24 * 3600000), // we'd like to have immediate attention!
        description: t.gmbBiz.name,
        roles: ['GMB', 'ADMIN'],
        score: t.gmbBiz.score,
        relatedMap: { gmbBizId: t.gmbBiz._id, gmbAccountId: t.gmbAccount._id, gmbRequestId: t.gmbRequest._id },
        transfer: {
          fromEmail: t.gmbAccount.email,
          againstEmail: t.gmbRequest.email,
          appealValidateDate: t.dueDate
        }
      }));

    const taskIds = await this._api.post(environment.adminApiUrl + 'generic?resource=task', tasks);
    console.log(tasks);
    return tasks;
  } // end scan


  /** Apply for MAIN listing only */
  async scanForApplyTask() {
    // 1. no main listing ownership
    // 2. not disabled
    // 3. not already an apply task existed
    // 4. skip sale's agent flagged (unless more than xx days created)

  } // end scan

  async injectModifiedWebsites() {

  }

  async autoSuggest() {

  }

  async appealSuspended() {

  }

  async purgeInvalidGmbTransferTasks() {
    this._task.purgeTransferTasks();


    // const t = ["5c40c6bcdd9078a346c4f3b0", "5c40c8a3dd9078a346c4f93d", "5c424aa3dd9078a346c8606d", "5c4239cedd9078a346c8399c", "5c42465cdd9078a346c856e2", "5c424aa3dd9078a346c86070", "5c4318badd9078a346ca4cc1", "5c431903dd9078a346ca4d7d", "5c43191add9078a346ca4dde", "5c431932dd9078a346ca4e4d", "5c4319e6dd9078a346ca5036", "5c431a45dd9078a346ca5130", "5c431c2bdd9078a346ca561f", "5c431c9ddd9078a346ca5730", "5c467899dd9078a346d2b44c", "5c423fa9dd9078a346c84625", "5c4240b3dd9078a346c8488f", "5c42411edd9078a346c849a6", "5c42645cdd9078a346c89a72", "5c4317badd9078a346ca4a33", "5c4317e8dd9078a346ca4aa2", "5c431851dd9078a346ca4ba6", "5c433e5add9078a346cae15c", "5c433e71dd9078a346cae1b3", "5c433e71dd9078a346cae1b6", "5c433fa8dd9078a346cae4e4", "5c43459bdd9078a346caf47a", "5c1237c1dd9078a3460201c8", "5c35d94cdd9078a346a21668", "5c406e1add9078a346c38b31", "5c406ee2dd9078a346c38d6d", "5c40700edd9078a346c39075", "5c407124dd9078a346c39373", "5c4094c9dd9078a346c42a49", "5c40c02ddd9078a346c4e0c7", "5c40c133dd9078a346c4e398", "5c40c2b2dd9078a346c4e7d2", "5c40c496dd9078a346c4ed7a", "5c41ec4add9078a346c781ce", "5c423eb0dd9078a346c843ca", "5c424068dd9078a346c847e2", "5c4245c1dd9078a346c8554c", "5c42465cdd9078a346c856e5", "5c424bbfdd9078a346c86301", "5c4313fadd9078a346ca4048", "5c4314cbdd9078a346ca4255", "5c4314e3dd9078a346ca42a8", "5c431530dd9078a346ca4374", "5c43157ddd9078a346ca444c", "5c43157ddd9078a346ca4450", "5c4315f5dd9078a346ca4585", "5c431643dd9078a346ca4666", "5c43168ddd9078a346ca471b", "5c4316addd9078a346ca476f", "5c4316dddd9078a346ca4809", "5c43189edd9078a346ca4c76", "5c453de5dd9078a346cf599a", "5c3dcacedd9078a346bb3fc8", "5c467898dd9078a346d2b40f", "5c467898dd9078a346d2b412", "5c467898dd9078a346d2b416", "5c467898dd9078a346d2b419", "5c467898dd9078a346d2b429", "5c467898dd9078a346d2b430", "5c467898dd9078a346d2b435", "5c467898dd9078a346d2b438", "5c467898dd9078a346d2b441", "5c467898dd9078a346d2b445", "5c467899dd9078a346d2b44f", "5c467899dd9078a346d2b456", "5c467899dd9078a346d2b45e", "5c467899dd9078a346d2b461", "5c467899dd9078a346d2b464", "5c467899dd9078a346d2b468", "5c467899dd9078a346d2b46b", "5c467899dd9078a346d2b471", "5c467899dd9078a346d2b478", "5c467899dd9078a346d2b47b", "5c467898dd9078a346d2b41c", "5c406e1add9078a346c38b2e", "5c469820dd9078a346d2ffe8", "5c469820dd9078a346d2ffeb", "5c469820dd9078a346d2ffee", "5c469820dd9078a346d2fff1", "5c469820dd9078a346d2fff4", "5c469820dd9078a346d2fff8", "5c469820dd9078a346d2fffb", "5c469820dd9078a346d2ffff", "5c469820dd9078a346d30002", "5c469820dd9078a346d3000a", "5c469820dd9078a346d30010", "5c469820dd9078a346d30013", "5c469820dd9078a346d30017", "5c469820dd9078a346d3001a", "5c469820dd9078a346d3000d", "5c469820dd9078a346d30005"];

    // await this._api.patch(environment.adminApiUrl + 'generic?resource=task', t.map(task => ({
    //   old: {_id: task, result: 1, resultAt: 1},
    //   new: {_id: task}
    // }))).toPromise();

  }

  async purgeInvalidGmbApplyTasks() {
    this._task.purgeApplyTasks();
  }

}
