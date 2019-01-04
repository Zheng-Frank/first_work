import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { mergeMap } from 'rxjs/operators';
import { GmbRequest } from '../../../classes/gmb/gmb-request';
import { GmbService } from '../../../services/gmb.service';
import { Helper } from '../../../classes/helper';

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
  waitBetweenScan = 60000;

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb: GmbService) { }

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

      // rescheduledBySystem:

      await this._gmb.computeToBeRescheduledTasks();

      //  retrieve all accounts:
      try {
        this.addRunningMessage('retrieve all accounts')
        const gmbAccounts = await this._api.get(environment.adminApiUrl + "generic", {
          resource: "gmbAccount",
          projection: {
            email: 1,
            password: 1,
            gmbScannedAt: 1
          },
          limit: 5000
        }).toPromise();
        this.addRunningMessage(`total: ${gmbAccounts.length}`);
        for (let gmbAccount of gmbAccounts) {
          if (!this.startTime) {
            break;
          }
          try {
            // 1. scan gmb locations
            this.addRunningMessage(`scan: ${gmbAccount.email}`);
            const locations = await this._gmb.scanOneGmbAccountLocations(gmbAccount);
            this.addRunningMessage(`locations: ${locations.length}`);

            const gmbBizList = await this._api.get(environment.adminApiUrl + 'generic', {
              resource: 'gmbBiz',
              query: {
                place_id: { $in: locations.map(loc => loc.place_id) }
              },
              projection: {
                bizManagedWebsite: 1,
                useBizWebsite: 1,
                useBizWebsiteForAll: 1,
                qmenuWebsite: 1,
                place_id: 1,
                name: 1,
                address: 1,
                phone: 1,
                appealId: 1
              },
              limit: 200
            }).toPromise();


            // 2. inject modified websites: qMenu managed, has website, but websites are modified
            const publishedLocations = locations.filter(loc => loc.status === 'Published');
            if (publishedLocations.length > 0) {

              const bizListToBeUpdated = [];
              // find which gmbBiz needs update website: linked by place_id
              publishedLocations.map(loc => {
                const biz = gmbBizList.filter(b => b.place_id && b.place_id === loc.place_id)[0];
                if (loc.homepage && biz && (biz.bizManagedWebsite || biz.qmenuWebsite)) {
                  const mainWebsite = (biz.useBizWebsite && biz.bizManagedWebsite) || biz.qmenuWebsite;
                  if (!Helper.areDomainsSame(loc.homepage, mainWebsite)) {
                    bizListToBeUpdated.push(biz);
                  }
                }
              });

              // crawl published locations!
              const publishedBizList = publishedLocations.map(loc => gmbBizList.filter(b => b.place_id && b.place_id === loc.place_id)[0]).filter(b => b) as GmbBiz[];

              for (let biz of publishedBizList) {
                try {
                  const crawlResult = await this._gmb.crawlOneGoogleListing(biz);
                  const mainWebsite = (biz.useBizWebsite && biz.bizManagedWebsite) || biz.qmenuWebsite;
                  const qmenuWebsite = biz.qmenuWebsite || biz.bizManagedWebsite;

                  if (!mainWebsite) {
                    continue;
                  }


                  if (
                    !Helper.areDomainsSame(crawlResult.gmbWebsite, mainWebsite)
                    || (crawlResult.menuUrls && !crawlResult.menuUrls.some(url => Helper.areDomainsSame(qmenuWebsite, url))) // we insist qmenu website here
                    || (crawlResult.reservations && !crawlResult.reservations.some(url => Helper.areDomainsSame(qmenuWebsite, url))) // we insist qmenu website here
                    // || (crawlResult.serviceProviders && !crawlResult.serviceProviders.some(url => Helper.areDomainsSame(qmenuWebsite, url)))
                  ) {

                    bizListToBeUpdated.push(biz);
                  }

                  // if main website is NOT mainWebsite or one of reservation URL, menu URL etc is not qmenu website, we need to update!
                } catch (error) {
                  console.log(error);
                  this.addErrorMessage(`Error crawling ${biz.name}`);
                }
              }

              const uniqueBizList = [...new Set(bizListToBeUpdated)];
              console.log('need update website list,', uniqueBizList);

              for (let gmbBiz of uniqueBizList) {
                try {
                  this.addRunningMessage(`update website: ${gmbBiz.name}`);
                  await this._gmb.updateGmbWebsite(gmbBiz, false);
                  this.executedTasks++;
                } catch (error) {
                  this.addErrorMessage('ERROR ---> injecting ' + gmbBiz.name);
                }
              }
            } // end publishedLocations.length > 0

            // 3. appeal due suspended tasks
            const appealTasks = await this._api.get(environment.adminApiUrl + "generic", {
              resource: "task",
              query: {
                name: 'Appeal Suspended GMB',
                "relatedMap.gmbBizId": { $in: gmbBizList.map(gmbBiz => gmbBiz._id) },
                "relatedMap.gmbAccountId": gmbAccount._id,
                result: null
              },
              limit: 5000
            }).toPromise();

            const dueAppealTasks = appealTasks.filter(t => new Date(t.scheduledAt || 0) < this.now);
            console.log('due appeal tasks');
            console.log(dueAppealTasks)

            for (let task of dueAppealTasks) {
              // find gmbBiz
              if (task.relatedMap && task.relatedMap.gmbBizId) {
                const gmbBiz = gmbBizList.filter(biz => biz._id === task.relatedMap.gmbBizId)[0];
                try {
                  this.addRunningMessage(`appeal ${gmbBiz.name}`);
                  await this._gmb.appeal(gmbAccount, gmbBiz, task);
                  this.executedTasks++;
                } catch (error) {
                  this.addErrorMessage(`ERROR ---> appeal suspended ${gmbBiz && gmbBiz.name}`);
                }
              }
            } // end 3

            // others go below in future...

          } catch (error) {
            this.addErrorMessage('ERROR ---> ' + gmbAccount.email);
          }
          this.scannedAccounts++;
        } // end each gmbAccount
      } catch (error) {
        this.addErrorMessage('ERROR ---> ' + error);
        console.log(error);
      } // end one BIG loop


      // find the newly LOST gmb!
      try {
        const gmbBizList = (await this._api.get(environment.adminApiUrl + 'generic', {
          resource: 'gmbBiz',
          projection: {
            gmbOwnerships: { $slice: -4 },
            name: 1,
            score: 1,
            place_id: 1
          },
          limit: 10000
        }).toPromise()).map(biz => new GmbBiz(biz));

        const disabledRestaurants = (await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant',
          query: {
            disabled: true
          },
          projection: {
            name: 1
          },
          limit: 10000
        }).toPromise());

        const notOwnedList = gmbBizList.filter(biz => !biz.gmbOwnerships || biz.gmbOwnerships.length === 0 || !biz.gmbOwnerships[biz.gmbOwnerships.length - 1].email);

        console.log('Not owned: ', notOwnedList.length);
        // further filter
        const minScore = 1;
        const minHistoryLength = 1;

        const filteredList = notOwnedList.filter(biz => (biz.score || 0) >= minScore && biz.gmbOwnerships && biz.gmbOwnerships.length >= minHistoryLength);
        console.log('Filtered list: ', filteredList.length);

        const outstandingApplyTasks = await this._api.get(environment.adminApiUrl + 'generic', {
          resource: "task",
          query: {
            name: 'Apply GMB Ownership',
            result: null
          },
          projection: {
            relatedMap: 1
          },
          limit: 5000
        }).toPromise();


        // should apply GMB:
        // 1. restaurant is not closed;
        // 2. gmbBiz has place_id;
        // 3. not already existed

        const shouldApplyList = filteredList
          .filter(biz => !biz.disableAutoTask)
          .filter(biz => !biz.closed && biz.place_id && !outstandingApplyTasks.some(t => t.relatedMap && t.relatedMap.gmbBizId === biz._id))
          .filter(gmbBiz => !disabledRestaurants.some(r => r._id === gmbBiz.qmenuId));

        console.log('should apply gmb', shouldApplyList);
        if (shouldApplyList.length > 0) {
          this.addRunningMessage('add new gmb task, ' + shouldApplyList.map(biz => biz.name).join(', '));
          await this.createApplyTasks(shouldApplyList);
          this.executedTasks++;
        }

      } catch (error) {
        console.log(error);
        this.addRunningMessage('ERROR --> create apply task');
      }

      this.addRunningMessage('-------FINISHED ONE ROUND!---------')

      await new Promise((resolve) => setTimeout(resolve, this.waitBetweenScan));
    }
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
}
