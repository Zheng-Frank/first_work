import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { mergeMap } from 'rxjs/operators';
import { FormEvent } from '@qmenu/ui';
import { zip, of } from 'rxjs';
import { GmbRequest } from '../../../classes/gmb/gmb-request';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { Task } from '../../../classes/tasks/task';

@Component({
  selector: 'app-gmb-account-list',
  templateUrl: './gmb-account-list.component.html',
  styleUrls: ['./gmb-account-list.component.css']
})
export class GmbAccountListComponent implements OnInit {
  @ViewChild('gmbEditingModal') gmbEditingModal;
  gmbAccounts: GmbAccount[] = [];

  searchFilter;
  filteredGmbAccounts = [];

  gmbInEditing: GmbAccount = new GmbAccount();
  apiError = undefined;

  scanningAll = false;

  processingGmbAccountSet = new Set<any>();

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.retrieveGmbAccounts();
  }

  ngOnInit() {
  }

  retrieveGmbAccounts() {
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "gmbAccount",
      // projection: {
      //   email: 1,
      //   password: 1
      // },
      limit: 5000
    })
      .subscribe(
        gmbAccounts => {
          this.gmbAccounts = gmbAccounts.map(g => new GmbAccount(g)).sort((g1, g2) => g1.email > g2.email ? 1 : -1);
          this.filterGmbAccounts();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, error);
        }
      );
  }

  debounce(value) {
    this.filterGmbAccounts();
  }

  filterGmbAccounts() {
    this.filteredGmbAccounts = this.gmbAccounts;
    if (this.searchFilter) {
      this.filteredGmbAccounts = this.filteredGmbAccounts.filter(a => (a.email || '').toLowerCase().indexOf(this.searchFilter.toLowerCase()) >= 0);
    }
  }

  addNew() {
    this.apiError = undefined;
    this.gmbInEditing = {} as GmbAccount;
    this.gmbEditingModal.show();
  }

  edit(gmb) {
    this.apiError = undefined;
    this.gmbInEditing = new GmbAccount(gmb);
    this.gmbInEditing.password = '';
    this.gmbEditingModal.show();
  }

  cancel() {
    this.gmbEditingModal.hide();
  }

  done(event: FormEvent) {
    const gmb = event.object as GmbAccount;
    this.apiError = undefined;
    this._api.post(environment.autoGmbUrl + 'encrypt', gmb).pipe(mergeMap(result => {
      const oldGmb = JSON.parse(JSON.stringify(gmb));
      const updatedGmb = JSON.parse(JSON.stringify(gmb));
      updatedGmb.password = result;
      updatedGmb.email = updatedGmb.email.toLowerCase().trim();

      if (gmb._id) {
        return this._api.patch(environment.adminApiUrl + "generic?resource=gmbAccount", [{ old: oldGmb, new: updatedGmb }]);
      } else {
        return this._api.post(environment.adminApiUrl + 'generic?resource=gmbAccount', [updatedGmb]);
      }

    })).subscribe(
      result => {
        event.acknowledge(null);
        // hard refresh
        this.retrieveGmbAccounts();
        this.gmbEditingModal.hide();
      },
      error => {
        this.apiError = 'Possible: no Auto-GMB server running';
        event.acknowledge(error.message || 'API Error.');
        console.log(error);
      }
    );
  }

  remove(event: FormEvent) {
    const gmb = event.object;
    this._api.delete(environment.adminApiUrl + 'generic', {
      resource: 'gmbAccount',
      ids: [gmb._id]
    }).subscribe(
      result => {
        event.acknowledge(null);
        this.gmbAccounts = this.gmbAccounts.filter(g => g.email !== gmb.email);
        this.gmbEditingModal.hide();
      },
      error => {
        event.acknowledge(error.message || 'API Error.');
        this.apiError = 'API Error. Status code: ' + error.statusText;
        console.log(error);
      }
    );
  }

  async scanBizList(event: FormEvent) {

    const gmb = event.object;
    try {
      const result = await this.scanOnePublishedLocations(gmb);
      this._global.publishAlert(AlertType.Success, "Success");
      event.acknowledge(null);
    }
    catch (error) {
      this._global.publishAlert(AlertType.Danger, error);
      event.acknowledge(error);
    }
  }

  patchGmb(gmb: GmbAccount, field, value) {
    const oldGmb = JSON.parse(JSON.stringify(gmb));
    const updatedGmb = JSON.parse(JSON.stringify(gmb));
    updatedGmb[field] = value;

    // update gmbScannedAt field
    this._api.patch(environment.adminApiUrl + "generic?resource=gmbAccount", [
      { old: gmb, new: updatedGmb }
    ]).subscribe(result => {
      if (value.$date) {
        this.gmbAccounts.map(g => {
          if (g._id === gmb._id) {
            g[field] = value.$date;
          }
        });
      }
      this._global.publishAlert(AlertType.Success, "Updated " + gmb.email);
    }, error => {
      this._global.publishAlert(AlertType.Danger, "Error updating " + gmb.email);
    });
  }

  async scanAllPublishedLocations() {
    this.scanningAll = true;
    for (let gmbAccount of this.gmbAccounts) {
      try {
        this._global.publishAlert(AlertType.Info, 'Scanning ' + gmbAccount.email + '...');
        await this.scanOnePublishedLocations(gmbAccount);
      }
      catch (error) { }
    }
    this.scanningAll = false;
  }

  async scanOnePublishedLocations(gmb: GmbAccount) {
    return new Promise((resolve, reject) => {
      zip(

        // we need to get currently ALL managed gmbBiz
        this._api.get(environment.adminApiUrl + "generic", {
          resource: "gmbBiz",
          projection: {
            phone: 1,
            gmbOwnerships: 1
          },
          limit: 10000
        }),
        this._api.post('http://localhost:3000/retrieveGmbLocations', { email: gmb.email, password: gmb.password })
      ).pipe(mergeMap(results => {

        const bizList = results[0];
        const publishedLocations = results[1].filter(pl => pl.status.indexOf('Published') === 0);

        // new gmbBiz
        const newBizList = publishedLocations.filter(location => !bizList.some(biz => biz.phone === location.phone));
        newBizList.map(biz => biz.gmbOwnerships = [{
          email: gmb.email,
          // no other info available so only mark the date possessedAt
          possessedAt: { $date: new Date() }
        }]);
        console.log('new', newBizList);
        // lost ownership: biz  last ownership.email is this gmb.email but the biz is not in the published location anymore!
        const lostOwnershipBizList = bizList
          .filter(biz =>
            biz.gmbOwnerships &&
            biz.gmbOwnerships.length > 0 &&
            biz.gmbOwnerships[biz.gmbOwnerships.length - 1].email === gmb.email &&
            !publishedLocations.some(location => location.phone === biz.phone));
        console.log('lost', lostOwnershipBizList);

        // gained new ownership:
        const gainedOwnershipList = bizList
          .filter(biz =>
            publishedLocations.some(location => location.phone === biz.phone) &&
            (!biz.gmbOwnerships || (biz.gmbOwnerships[biz.gmbOwnerships.length - 1] || {}).email !== gmb.email)
          );
        console.log('gained', gainedOwnershipList);

        // making patch list:
        const patchList = [];
        lostOwnershipBizList.map(biz => {
          const oldBiz = JSON.parse(JSON.stringify(biz));
          const updatedBiz = JSON.parse(JSON.stringify(biz));
          updatedBiz.gmbOwnerships.push({
            // no other info available so only mark the date possessedAt
            possessedAt: { $date: new Date() }
          });
          patchList.push({
            old: oldBiz,
            new: updatedBiz
          });
        });

        gainedOwnershipList.map(biz => {
          const oldBiz = JSON.parse(JSON.stringify(biz));
          const updatedBiz = JSON.parse(JSON.stringify(biz));
          updatedBiz.gmbOwnerships = updatedBiz.gmbOwnerships || [];
          updatedBiz.gmbOwnerships.push({
            email: gmb.email,
            // no other info available so only mark the date possessedAt
            possessedAt: { $date: new Date() }
          });
          patchList.push({
            old: oldBiz,
            new: updatedBiz
          });
        });

        return zip(
          // add new gmbBiz
          this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', newBizList),
          // update existing biz's gmb ownership status
          this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz", patchList),
        );

      }))
        .subscribe(
          result => {
            resolve();
            this._global.publishAlert(AlertType.Success, "Scanned " + gmb.email);
            this.patchGmb(gmb, 'gmbScannedAt', { $date: new Date() });
          },
          error => {
            // highly rely on auto-gmb response!!!
            if (error.error === "not displayed") {
              resolve();
              this._global.publishAlert(AlertType.Success, "Nothing found");
              this.patchGmb(gmb, 'gmbScannedAt', { $date: new Date() });
            } else {
              reject('Error Scanning Published Locations');
              this._global.publishAlert(AlertType.Danger, error);
            }
          });
    });

  }

  async scanRequests(event: FormEvent) {
    try {
      let results: any = await this.scanAccountEmails(event.object);
      event.acknowledge(null);
      this._global.publishAlert(AlertType.Success, 'Scanned ' + event.object.email + ', found: ' + results.length);
    }
    catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error scanning ' + event.object.email);
      event.acknowledge(error);
    }
  }

  isProcessing(gmbAccount) {
    return this.processingGmbAccountSet.has(gmbAccount);
  }

  scanAccountEmails(gmbAccount: GmbAccount) {
    return new Promise((resolve, reject) => {
      let parsedRequests: GmbRequest[];
      const bizMap = {};

      this.processingGmbAccountSet.add(gmbAccount);
      zip(
        this._api.post('http://localhost:3000/retrieveGmbRequests', { email: gmbAccount.email, password: gmbAccount.password, stayAfterScan: true }),
        // get those gmbBiz with email as owner
        this._api.get(environment.adminApiUrl + "generic", {
          query: {
            "gmbAccountId": gmbAccount._id
          },
          resource: "gmbRequest",
          limit: 5000
        }),
        // get those gmbBiz with email as owner
        this._api.get(environment.adminApiUrl + "generic", {
          query: {
            "gmbOwnerships.email": gmbAccount.email
          },
          projection: {
            name: 1,
            gmbOwnerships: 1,
            ignoreGmbOwnershipRequest: 1
          },
          resource: "gmbBiz",
          limit: 5000
        })
      ).pipe(mergeMap(results => {

        this.processingGmbAccountSet.delete(gmbAccount);
        // convert to OwnershipRequest type and remove isReminder!
        // ingore: isReminder, or over 15 days (if it's still not handled, likely the requester didn't care)
        const now = new Date();

        const requests: GmbRequest[] = results[0].filter(r => !r.isReminder).map(r => new GmbRequest(r)).filter(r => now.valueOf() - r.date.valueOf() < 15 * 24 * 3600 * 1000);
        // remove isReminder
        requests.map(r => delete r["isReminder"]);

        const gmbRequests: GmbRequest[] = results[1].map(r => new GmbRequest(r));
        const gmbBizList: GmbBiz[] = results[2].map(b => new GmbBiz(b)).filter(biz => biz.hasOwnership([gmbAccount.email]));

        // make the bizMap
        gmbBizList.map(b => bizMap[b._id] = b);

        // new requests: same gmbAccount and same date and 
        const newRequests = requests.filter(r => !gmbRequests.some(r2 => r2.business.toLowerCase() === r.business.toLowerCase() && r2.gmbAccountId === gmbAccount._id && r2.date.valueOf() === r.date.valueOf()));

        console.log('new requests: ');
        console.log(newRequests);

        const matchedNewRequests = newRequests.filter(r => {
          r.gmbAccountId = gmbAccount._id;
          const bizMatch = gmbBizList.filter(b => b.name.toLowerCase() === r.business.toLowerCase())[0];
          if (bizMatch) {
            r.gmbBizId = bizMatch._id;
            return true;
          } else {
            console.log('non matched: ', r.business);
            return false;
          }
        });

        console.log('matched: ');
        console.log(matchedNewRequests);
        parsedRequests = matchedNewRequests;

        // lets convert date but not ids because mongo id doesn't seem to provide benifits for Ids
        (matchedNewRequests as any).map(r => {
          r.date = { $date: r.date };
        });
        this.patchGmb(gmbAccount, 'emailScannedAt', { $date: new Date() });

        // we'd like to create task for some requests automatically. we need to see what's already been there first
        return zip(
          this._api.post(environment.adminApiUrl + 'generic?resource=gmbRequest', matchedNewRequests),
          // also find those tasks with requestId
          this._api.get(environment.adminApiUrl + "generic", {
            resource: "task",
            query: {
              "relatedMap.gmbAccountId": gmbAccount._id,
              result: null    // null is the same as either non-exists or actually null in mongodb
            },
            sort: {
              createdAt: -1
            },
            limit: 1000
          })
        );

      })).pipe(mergeMap(idsAndTasks => {

        // let's insert the id for parsed requests;
        const ids = idsAndTasks[0];
        ids.map((id, index) => parsedRequests[index]._id = id);

        // conditions to create a account transfer  task:
        // 1. requester is not qmenu;
        // 2. and no outstanding similar task pending (not closed)
        // 3. and restaurant is not qmenu partner (ignoreGmbRequest = true)


        const myAccountEmails = this.gmbAccounts.map(a => a.email);
        const nonQmenuRequest = parsedRequests.filter(r => myAccountEmails.indexOf(r.email.toLowerCase()) < 0);
        const afterIgnore = nonQmenuRequest.filter(r => bizMap[r.gmbBizId] && !bizMap[r.gmbBizId].ignoreGmbOwnershipRequest);

        const afterIgnoreDesc = afterIgnore.sort((r1, r2) => (r1.date['$date'] || r1.date).valueOf() - (r2.date['$date'] || r2.date).valueOf());

        // use gmbBizId && gmbAccount email as key to see if there is any outstanding task!
        const outstandingTaskMap = new Set();
        (idsAndTasks[1] as Task[]).filter(t => !t.result).map(t => {
          if (t.relatedMap && t.relatedMap['gmbBizId'] && t.relatedMap['gmbAccountId']) {
            outstandingTaskMap.add(t.relatedMap['gmbBizId'] + t.relatedMap['gmbAccountId']);
          }
        });

        // we have to consider same task in this batch too, so use a loop instead of map to handle this
        const finalLeftUnhandledRequests: GmbRequest[] = [];

        for (let i = 0; i < afterIgnoreDesc.length; i++) {
          let request = afterIgnoreDesc[i];
          if (!outstandingTaskMap.has(request.gmbBizId + request.gmbAccountId)) {
            finalLeftUnhandledRequests.push(request);
            outstandingTaskMap.add(request.gmbBizId + request.gmbAccountId)
          }
        }

        const tasks = finalLeftUnhandledRequests
          .map(r => ({
            name: 'Transfer GMB Ownership',
            scheduledAt: (date => {
              const d = new Date(date.getTime());
              d.setDate(d.getDate() + 7);
              return {
                $date: d
              };
            })(r.date['$date']), // r.date is alreay in {$date: xxx} format 
            description: r.business,
            roles: ['GMB', 'ADMIN'],
            score: bizMap[r.gmbBizId].score,
            relatedMap: { 'gmbBizId': r.gmbBizId, 'gmbAccountId': r.gmbAccountId, 'gmbRequestId': r._id },
            transfer: {
              fromEmail: gmbAccount.email
            }
          }));

        return this._api.post(environment.adminApiUrl + 'generic?resource=task', tasks);
      }))
        .subscribe(
          results => {
            this.processingGmbAccountSet.delete(gmbAccount);
            resolve(parsedRequests);
          },
          error => {
            this.processingGmbAccountSet.delete(gmbAccount);
            reject(error);
            console.log(error);
          });
    });
  }

  async scanAllEmails() {
    this.scanningAll = true;
    for (let gmbAccount of this.gmbAccounts) {
      try {
        this._global.publishAlert(AlertType.Info, 'Scanning ' + gmbAccount.email + '...');
        await this.scanAccountEmails(gmbAccount);
      }
      catch (error) { }
    }
    this.scanningAll = false;
  }
}
