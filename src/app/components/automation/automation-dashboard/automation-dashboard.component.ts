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
      // retrieve all accounts:
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
          if (gmbAccount.email !== '2redpassion8797@gmail.com') {
            continue;
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

              // find which gmbBiz needs update website: linked by place_id
              const locationsNeedingUpdateWebsite = publishedLocations.filter(loc => {
                const biz = gmbBizList.filter(b => b.place_id === loc.place_id)[0];

                if (loc.homepage && biz && (biz.bizManagedWebsite || biz.qmenuWebsite)) {
                  let bizUrl = biz.qmenuWebsite || biz.bizManagedWebsite;
                  if (biz.useBizWebsite && biz.bizManagedWebsite) {
                    bizUrl = biz.bizManagedWebsite;
                  }
                  // same domain name \?
                  const u1 = new URL(loc.homepage);
                  const u2 = new URL(bizUrl);

                  const parts1 = u1.host.split('.');
                  const parts2 = u2.host.split('.');
                  return parts1[parts1.length - 2] !== parts2[parts2.length - 2];
                } else {
                  return false;
                }
              });

              for (let loc of locationsNeedingUpdateWebsite) {
                try {
                  const gmbBiz = new GmbBiz(gmbBizList.filter(b => b.place_id === loc.place_id)[0]);
                  this.addRunningMessage(`update website: ${gmbBiz.name}`);
                  await this._gmb.updateGmbWebsite(gmbBiz, false);
                  this.executedTasks++;
                } catch (error) {
                  this.addErrorMessage('ERROR ---> injecting ' + loc.name);
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
            console.log('due appeal takss');
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
            gmbOwnerships: 1,
            name: 1,
            score: 1
          },
          limit: 10000
        }).toPromise()).map(biz => new GmbBiz(biz));


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
            //name: 'Apply GMB Ownership',
            result: null
          },
          projection: {
            relatedMap: 1
          },
          limit: 5000
        }).toPromise();


        const shouldApplyList = notOwnedList.filter(biz => !outstandingApplyTasks.some(t => t.relatedMap && t.relatedMap.gmbBizId === biz._id));

        console.log('should apply gmb', shouldApplyList);
        // if (shouldApplyList.length > 0) {
        //   this.addRunningMessage('add new gmb task, ' + shouldApplyList.map(biz => biz.name).join(', '));
        //   await this.createApplyTasks(shouldApplyList);
        // }

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
