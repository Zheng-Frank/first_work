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

      this.addRunningMessage('Scan accounts for GMB locations...');
      const accountsScanResult = await this.scanAccountsForLocations();
      this.addRunningMessage('Succeeded ' + accountsScanResult.succeeded.length + ', failed ' + accountsScanResult.failed.length);


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

  // we have request against a location (gmbBiz?)
  async scanForTransferTask() {
    const gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        email: 1,
        locations: 1
      },
      limit: 6000
    }).toPromise();

    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        name: 1,
        score: 1,
        qmenuId: 1,
        cid: 1,
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
        const isPublished = gmbAccount.locations.some(loc => request.cid && loc.cid === request.cid && loc.status === 'Published');

        if (!isSelf && isPublished) {
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
    // this._task.purgeTransferTasks();

    // // inject, one time, statusHistory from appealId of gmbBiz (using cid && appealId)
    const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        cid: 1,
        appealId: 1,
        accounts: 1
      },
      limit: 6000
    }).toPromise();

    const gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection:
      {
        locations: 1,
        email: 1
      },
      limit: 5000
    }).toPromise();

    // appealId + cid + email matched -> 

    let updatedAccounts = [];
    gmbAccounts.map(account => (account.locations || []).map(loc => {
      const matchedBiz = gmbBizList.filter(biz => loc.cid && loc.cid === biz.cid && loc.appealId === biz.appealId)[0];
      console.log(account.email)

      const matchedBizAccount = ((matchedBiz || {}).accounts || []).filter(acct => acct.email === account.email)[0];
      const matchedBizAccountHistory = (matchedBizAccount || {}).history || [];
      if (matchedBizAccountHistory.length > 0) {
        console.log('before', JSON.stringify(loc.statusHistory));
        updatedAccounts.push(account);
        matchedBizAccountHistory.map(h => {
          loc.statusHistory.push(h);
        });

        // remove Lost, Removed since it will be generated
        loc.statusHistory = loc.statusHistory.filter(h => h.status !== 'Lost' && h.status !== 'Removed');
        loc.statusHistory.sort((h1, h2) => new Date(h1.time).valueOf() - new Date(h2.time).valueOf());

        for (let i = loc.statusHistory.length - 1; i >= 1; i--) {
          if (loc.statusHistory[i].status === loc.statusHistory[i - 1].status) {
            loc.statusHistory.splice(i, 1);
          }
        }
        // sort DESC
        loc.statusHistory.sort((h1, h2) => new Date(h2.time).valueOf() - new Date(h1.time).valueOf());
        // assign latest status back to loc itself
        loc.status = loc.statusHistory[0].status;
      }

    }));

    updatedAccounts = [...new Set(updatedAccounts)];

    for (let account of updatedAccounts) {
      await this._api.patch(environment.adminApiUrl + 'generic?resource=gmbAccount', [{
        old: {
          _id: account._id
        },
        new: {
          _id: account._id, locations: account.locations
        }
      }]).toPromise();
    }


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

    gmbAccounts = gmbAccounts.filter(g => g.email.startsWith('g'));

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


  async generateMissingGmbBizListings() {
    await this._gmb3.generateMissingGmbBizListings();
  }

}
