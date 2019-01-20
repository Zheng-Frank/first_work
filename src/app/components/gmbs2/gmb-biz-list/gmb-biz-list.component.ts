import { Component, OnInit, Input, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { zip } from 'rxjs';
import { FormEvent } from '@qmenu/ui';
import { mergeMap, ignoreElements } from 'rxjs/operators';
import { GmbService } from '../../../services/gmb.service';
import { Task } from '../../../classes/tasks/task';

interface myBiz {
  gmbBiz: GmbBiz;
  published?: boolean;
  suspended?: boolean;
  ownershipPercentage?: number;
  lostDate?: Date;
  transfers?: string; // A <- B <- C
  restaurant: any
}

@Component({
  selector: 'app-gmb-biz-list',
  templateUrl: './gmb-biz-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./gmb-biz-list.component.css']
})
export class GmbBizListComponent implements OnInit {
  @ViewChild('bizEditingModal') bizEditingModal;

  bizList: GmbBiz[] = [];
  myEmails: string[] = [];

  myBizList: myBiz[] = [];

  agents = [];

  agent; // selected agent

  searchFilter;
  gmbOwnership;
  googleListingOwner;
  outstandingTask;
  qMenuManagedWebsite;
  onlyGmbOpen = false;
  inQmenu;

  filteredMyBizList: myBiz[] = [];

  refreshing = false;
  crawling = false;
  injecting = false;

  now = new Date();

  processingBizSet = new Set<any>();

  bizInEditing: GmbBiz;
  apiError;

  bizTaskMap = {};

  myColumnDescriptors = [
    {
      label: "#",
    },
    {
      label: "Name",
      paths: ['gmbBiz', 'name'],
      sort: (a, b) => a.toLowerCase() > b.toLowerCase() ? 1 : (a.toLowerCase() < b.toLowerCase() ? -1 : 0)
    },
    {
      label: "In Qmenu"
    },
    {
      label: "Score",
      paths: ['gmbBiz', 'score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Accounts",
      paths: ['transfers'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "GMB Owner"
    },
    {
      label: "Website",
      paths: ['gmbBiz', 'gmbOwner'],
      sort: (a, b) => (GlobalService.serviceProviderMap[a] || '') > (GlobalService.serviceProviderMap[b] || '') ? 1 : ((GlobalService.serviceProviderMap[a] || '') < (GlobalService.serviceProviderMap[b] || '') ? -1 : 0)
    },
    {
      label: "qMenu Website"
    },
    {
      label: "Crawled",
      paths: ['gmbBiz', 'crawledAt'],
      sort: (a1, a2) => (a1 || new Date(0)).valueOf() - (a2 || new Date(0)).valueOf()
    },
    {
      label: "Tasks"
    },
    {
      label: "Comments"
    },
    {
      label: "Actions"
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb: GmbService, private _ref: ChangeDetectorRef) {
    this.refresh();
  }
  ngOnInit() {
  }

  async refresh() {
    this.now = new Date();
    this.refreshing = true;
    zip(
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        projection: {
          gmbOwnerships: { $slice: -4 }
        },
        limit: 5000
      }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
        },
        limit: 5000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          "disabled": 1,
          "serviceSettings.name": 1,
          "serviceSettings.paymentMethods": 1,
          "deliverySettings.charge": 1,
          "deliverySettings": { $slice: -1 },
          "menus.hours": 1,
          "menus.disabled": 1,
          "rateSchedules.rate": 1,
          "rateSchedules.fixed": 1,
          "rateSchedules.agent": 1
        },
        limit: 5000
      })
    )
      .subscribe(
        results => {
          this.refreshing = false;
          this.bizList = results[0].map(b => new GmbBiz(b)).sort((g1, g2) => g1.name > g2.name ? 1 : -1);
          // let's keep ONLY 6 transfer history
          this.bizList.map(biz => {
            if (biz.gmbOwnerships && biz.gmbOwnerships.length > 6) {
              biz.gmbOwnerships = biz.gmbOwnerships.slice(biz.gmbOwnerships.length - 6, biz.gmbOwnerships.length)
            }
          });

          this.myEmails = results[1].map(account => account.email);

          const restaurantIdDict = {};
          results[2].map(r => restaurantIdDict[r._id] = r);

          // make myBizList:
          this.myBizList = this.bizList.map(biz => ({
            gmbBiz: biz,
            transfers: (biz.gmbOwnerships || []).map(o => (o.email || 'N/A').split('@')[0]).join('→ '),
            published: biz.publishedIn(this.myEmails),
            suspended: biz.suspendedIn(this.myEmails),
            qmenuIdDays: biz.qmenuId ? Math.floor((this.now.valueOf() - parseInt(biz.qmenuId.substring(0, 8), 16) * 1000) / (24 * 3600000)) : undefined,
            ownershipPercentage: ((biz) => {
              let possesedTime = 1;
              let nonPossesedTime = 1000;
              for (let i = 0; i < (biz.gmbOwnerships || []).length; i++) {
                const owned = this.myEmails.indexOf(biz.gmbOwnerships[i].email) >= 0;
                const nextStart = i < biz.gmbOwnerships.length - 1 ? biz.gmbOwnerships[i + 1].possessedAt : new Date();
                const span = nextStart.valueOf() - biz.gmbOwnerships[i].possessedAt.valueOf();
                possesedTime += owned ? span : 0;
                nonPossesedTime += owned ? 0 : span;
              }
              return Math.round(possesedTime * 100 / (possesedTime + nonPossesedTime));
            })(biz),
            lostDate: biz.getLastGmbOwnership() && (biz.getLastGmbOwnership().status === 'Suspended' || !biz.getAccountEmail) ? biz.getLastGmbOwnership().possessedAt : undefined,
            restaurant: restaurantIdDict[biz.qmenuId]
          }));

          this.agents = results[2].map(r => ((r.rateSchedules || [])[0] || {}).agent).filter(agent => agent);
          this.agents = [... new Set(this.agents)];
          this.agents.sort();

          this.filterBizList();
        },
        error => {
          this.refreshing = false;
          this._global.publishAlert(AlertType.Danger, error);
        }
      );

    this.bizTaskMap = {};
    const outstandingTasks: Task[] = await this._api.get(environment.adminApiUrl + "generic", {
      resource: "task",
      query: {
        result: null    // null is the same as either non-exists or actually null in mongodb
      },
      projection: {
        name: 1,
        relatedMap: 1
      },
      limit: 5000
    }).toPromise();

    outstandingTasks.map(t => {
      if (t.relatedMap && t.relatedMap['gmbBizId']) {
        if (!this.bizTaskMap[t.relatedMap['gmbBizId']]) {
          this.bizTaskMap[t.relatedMap['gmbBizId']] = [];
        }
        this.bizTaskMap[t.relatedMap['gmbBizId']].push(t.name);
      }
    });
  }

  getEncodedGoogleSearchString(gmbBiz: GmbBiz) {
    // keep ONLY alpha numberical + space characters
    // return encodeURI(gmbBiz.name.replace('&', '') + ' ' + gmbBiz.address);
    return encodeURI((gmbBiz.name + ' ' + gmbBiz.address).replace(/[^a-zA-Z 0-9\-]+/g, ""));
  }

  debounce(event) {
    this.filterBizList();
  }

  filterBizList() {
    const start = new Date();
    this.filteredMyBizList = this.myBizList
    if (this.searchFilter) {

      this.filteredMyBizList = this.filteredMyBizList
        .filter(mybiz => (
          // search name
          mybiz.gmbBiz.name.toLowerCase().indexOf(this.searchFilter.toLowerCase()) >= 0)

          // search phone
          || (mybiz.gmbBiz.phone || '').indexOf(this.searchFilter) === 0

          // search account
          || (mybiz.gmbBiz.gmbOwnerships || []).some(o => (o.email || '').indexOf(this.searchFilter) === 0)

          // search by qmenuId
          || (mybiz.gmbBiz.qmenuId === this.searchFilter)
        );
    }

    //
    switch (this.gmbOwnership) {
      case 'qmenu: published':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.published);
        break;
      case 'qmenu: suspended':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.suspended);
        break;
      case 'NOT qmenu':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => !b.published && !b.suspended);
        break;

      case 'problematic ownerships':
        // keep switching account in short time
        this.filteredMyBizList = this.filteredMyBizList.filter(b => {
          if (b.gmbBiz.gmbOwnerships && b.gmbBiz.gmbOwnerships.length > 3) {
            // last 3 gmbownerships is very close and all being published or suspended, and the last scan was no more than 4 hours ago!
            const ownerships = b.gmbBiz.gmbOwnerships.slice(-3);
            if (new Date().valueOf() - new Date(ownerships[0].possessedAt).valueOf() < 14400000 && new Date(ownerships[2].possessedAt).valueOf() - new Date(ownerships[0].possessedAt).valueOf() < 3600000) {
              return ownerships.every(ownership => ownership.status === 'Suspended' || ownership.status === 'Published');
            }
          }
          // if suspended LONG time (> 30 days?)
          if (b.gmbBiz.gmbOwnerships && b.gmbBiz.gmbOwnerships.length > 0) {
            const lastOwnership = b.gmbBiz.gmbOwnerships[b.gmbBiz.gmbOwnerships.length - 1];
            return lastOwnership.status === 'Suspended' && new Date().valueOf() - new Date(lastOwnership.possessedAt).valueOf() > 30 * 24 * 3600000;
          }

          return false;
        });
        break;

      case 'recently lost':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.lostDate && this.now.valueOf() - b.lostDate.valueOf() < 24 * 3600000);
        break;


      default:
        break;
    }

    switch (this.googleListingOwner) {
      case 'qmenu':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.gmbBiz.gmbOwner === 'qmenu');
        break;

      case 'NOT qmenu':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.gmbBiz.gmbOwner !== 'qmenu');
        break;

      default:
        break;
    }

    if (this.onlyGmbOpen) {
      this.filteredMyBizList = this.filteredMyBizList.filter(b => b.gmbBiz.gmbOpen);
    }

    switch (this.qMenuManagedWebsite) {
      case 'exist':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.gmbBiz.qmenuWebsite);
        break;
      case 'non-exist':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => !b.gmbBiz.qmenuWebsite);
        break;
      default:
        break;
    }

    switch (this.inQmenu) {
      case 'in qMenu DB':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.gmbBiz.qmenuId);
        break;
      case 'not in qMenu DB':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => !b.gmbBiz.qmenuId);
        break;

      case 'bad service settings':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.restaurant && (!b.restaurant.serviceSettings || !b.restaurant.serviceSettings.some(setting => setting.paymentMethods && setting.paymentMethods.length > 0)));
        break;
      case 'bad delivery settings':
        // has delivery in service settings, but no deliverySettings found!
        this.filteredMyBizList = this.filteredMyBizList.filter(
          b => b.restaurant && b.restaurant.serviceSettings && b.restaurant.serviceSettings.some(ss => ss.name === 'Delivery' && ss.paymentMethods.length > 0) && (!b.restaurant.deliverySettings || b.restaurant.deliverySettings.length === 0));
        break;
      case 'bad menus':
        // bad: 1. no menu at all
        // 2. menus are ALL disabled
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.restaurant && (!b.restaurant.menus || b.restaurant.menus.filter(menu => !menu.disabled).length === 0));
        break;
      case 'bad rate schedules':
        // bad: 1. no rateSchedules
        // 2. rateSchedules have no value for rate or fixed
        this.filteredMyBizList = this.filteredMyBizList.filter(b => b.restaurant && (!b.restaurant.rateSchedules || b.restaurant.rateSchedules.filter(rs => !isNaN(rs.fixed) || !isNaN(rs.rate)).length === 0));
        break;
      default:
        break;
    }

    switch (this.outstandingTask) {
      case 'exist':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => this.bizTaskMap[b.gmbBiz._id] && this.bizTaskMap[b.gmbBiz._id].length > 0);
        break;
      case 'non-exist':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => !this.bizTaskMap[b.gmbBiz._id] || this.bizTaskMap[b.gmbBiz._id].length === 0);
        break;
      case 'appeal':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => this.bizTaskMap[b.gmbBiz._id] && this.bizTaskMap[b.gmbBiz._id].some(task => task === 'Appeal Suspended GMB'));
        break;
      case 'apply':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => this.bizTaskMap[b.gmbBiz._id] && this.bizTaskMap[b.gmbBiz._id].some(task => task === 'Apply GMB Ownership'));
        break;
      case 'transfer':
        this.filteredMyBizList = this.filteredMyBizList.filter(b => this.bizTaskMap[b.gmbBiz._id] && this.bizTaskMap[b.gmbBiz._id].some(task => task === 'Transfer GMB Ownership'));

        break;
      default:
        break;
    }

    if (this.agent) {
      this.filteredMyBizList = this.filteredMyBizList.filter(b => b.restaurant && b.restaurant.rateSchedules && b.restaurant.rateSchedules.length > 0 && b.restaurant.rateSchedules[0].agent === this.agent);
    }

    console.log('filter time: ', new Date().valueOf() - start.valueOf());

    this._ref.detectChanges();
  }

  getOutstandingTasks(gmbBiz: GmbBiz) {
    return this.bizTaskMap[gmbBiz._id] || [];
  }

  async crawlAll() {
    this.crawling = true;

    // we'd like to crawl from most outdate ones
    const sortedBizList = this.filteredMyBizList.sort((a1, a2) => (a1.gmbBiz.crawledAt || new Date(0)).valueOf() - (a2.gmbBiz.crawledAt || new Date(0)).valueOf());

    for (let b of sortedBizList) {

      try {
        let result = await this.crawl(b.gmbBiz);

      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, 'Error crawling ' + b.gmbBiz.name);
      }
    }
    this._ref.detectChanges();
    this.crawling = false;
  }

  async crawl(biz) {
    try {
      this.processingBizSet.add(biz);
      let result = await this._gmb.crawlOneGoogleListing(biz);
      this.now = new Date();
      this.processingBizSet.delete(biz);
      this._global.publishAlert(AlertType.Success, 'Updated ' + biz.name);
      this._ref.detectChanges();
    } catch (error) {
      console.log(error);
      this.processingBizSet.delete(biz);
      this._global.publishAlert(AlertType.Danger, 'Error crawling ' + biz.name);
    }
  }

  isProcessing(biz) {
    return this.processingBizSet.has(biz);
  }

  getLogo(gmbBiz: GmbBiz) {
    if (gmbBiz.bizManagedWebsite && gmbBiz.gmbOwner === 'qmenu') {
      return GlobalService.serviceProviderMap['qmenu-gray'];
    }
    return GlobalService.serviceProviderMap[gmbBiz.gmbOwner];
  }

  edit(biz) {

    this.apiError = undefined;
    // make a copy of biz instead to avoid mutation
    this.bizInEditing = new GmbBiz(biz);
    // we need to remove pop3 password
    delete this.bizInEditing.qmenuPop3Password;

    this.bizEditingModal.show();
  }

  cancel() {
    this.bizEditingModal.hide();
  }

  done(event: FormEvent) {
    const biz = event.object as GmbBiz;
    // if for ALL, let's also set useBizWebsite === true
    if (biz.useBizWebsiteForAll) {
      biz.useBizWebsite = true;
    }
    this.apiError = undefined;
    this._api.post(environment.adminApiUrl + 'utils/crypto', { salt: biz.qmenuPop3Email || 'n/a', phrase: biz.qmenuPop3Password || 'n/a' }).pipe(mergeMap(result => {
      const oldBiz = JSON.parse(JSON.stringify(this.bizList.filter(b => b._id === biz._id)[0]));
      const updatedBiz = JSON.parse(JSON.stringify(biz));
      // depends on if we are updating password
      delete oldBiz.qmenuPop3Password;
      delete updatedBiz.qmenuPop3Password;

      if (biz.qmenuPop3Password) {
        updatedBiz.qmenuPop3Password = result;
      }

      if (biz._id) {
        return this._api.patch(environment.adminApiUrl + "generic?resource=gmbBiz", [{ old: oldBiz, new: updatedBiz }]);
      } else {
        return this._api.post(environment.adminApiUrl + 'generic?resource=gmbBiz', [updatedBiz]);
      }

    })).subscribe(
      result => {
        event.acknowledge(null);
        this.refresh();
        this.bizEditingModal.hide();
      },
      error => {
        this.apiError = 'Possible: no Auto-GMB server running';
        event.acknowledge(error.message || 'API Error.');
        console.log(error);
      }
    );
  }

  remove(event: FormEvent) {
    const gmbBiz = event.object;
    this._api.delete(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      ids: [gmbBiz._id]
    }).subscribe(
      result => {
        event.acknowledge(null);
        this.bizList = this.bizList.filter(b => b._id !== gmbBiz._id);
        this.filterBizList();
        this.bizEditingModal.hide();
      },
      error => {
        event.acknowledge(error.message || 'API Error.');
        this.apiError = 'API Error. Status code: ' + error.statusText;
        console.log(error);
      }
    );
  }

  async inject(biz) {
    try {
      await this._gmb.updateGmbWebsite(biz, true);
      this._global.publishAlert(AlertType.Success, 'Updated ' + biz.name);
      this._ref.detectChanges();
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Erro Updating ' + biz.name + ', ' + error);
    }
  }

  async injectScore(gmbBiz) {
    const score = await this._gmb.injectOneScore(gmbBiz);
    gmbBiz.score = score;
    this._ref.detectChanges();
  }

  async createApplyTask(gmbBiz: GmbBiz) {
    // first make sure there is no outstanding 
    const outstandingTasks = await this._api.get(environment.adminApiUrl + "generic", {
      resource: "task",
      query: {
        "relatedMap.gmbBizId": gmbBiz._id,
        name: 'Apply GMB Ownership',
        result: null    // null is the same as either non-exists or actually null in mongodb
      },
      sort: {
        createdAt: -1
      },
      limit: 1
    }).toPromise();

    if (outstandingTasks.length > 0) {
      this._global.publishAlert(AlertType.Danger, 'Same task already exists!');
      return;
    }

    // auto assign to me
    const task = {
      name: 'Apply GMB Ownership',
      scheduledAt: { $date: new Date() },
      description: gmbBiz.name,
      roles: ['GMB', 'ADMIN'],
      assignee: this._global.user.username,
      score: gmbBiz.score,
      relatedMap: { 'gmbBizId': gmbBiz._id },
      transfer: {}
    };

    await this._api.post(environment.adminApiUrl + 'generic?resource=task', [task]).toPromise();

    // also update bizTaskMap!
    this.bizTaskMap[gmbBiz._id] = this.bizTaskMap[gmbBiz._id] || [];
    this.bizTaskMap[gmbBiz._id].push(task.name);
    this._ref.detectChanges();
  }

  async injectAll() {
    this.injecting = true;

    // updated ALL locations first
    const uniqueEmails = [...new Set(this.filteredMyBizList.map(b => b.gmbBiz.getAccountEmail()).filter(email => email))];

    console.log(uniqueEmails);

    const gmbAccounts = await this._api.get(environment.adminApiUrl + 'generic',
      {
        resource: 'gmbAccount',
        query: {
          email: { $in: uniqueEmails }
        },
        limit: 1000
      }).toPromise();

    console.log(gmbAccounts);

    const batchSize = 4;
    const batchedAccounts = Array(Math.ceil(gmbAccounts.length / batchSize)).fill(0).map((i, index) => gmbAccounts.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedAccounts) {
      try {
        await Promise.all(batch.map(account =>
          new Promise((resolve, reject) => {
            this._gmb.scanOneGmbAccountLocations(account).then(ok => {
              resolve();
              this._global.publishAlert(AlertType.Success, '✓ ' + account.email, 2000);
            }).catch(error => {
              this._global.publishAlert(AlertType.Danger, '✗ ' + account.email);
              resolve();
            }
            );
          })
        ));
      }
      catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, '✗ ' + batch.map(account => account.email).join(', '), 2000);
      }
    }

    this.refresh();
    this.filterBizList();
    this._ref.detectChanges();

    const batchedFilteredMyBizList = Array(Math.ceil(this.filteredMyBizList.length / batchSize)).fill(0).map((i, index) => this.filteredMyBizList.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedFilteredMyBizList) {
      try {
        await Promise.all(batch.map(b =>
          new Promise((resolve, reject) => {
            this._gmb.updateGmbWebsite(b.gmbBiz, false).then(ok => {
              resolve();
              this._global.publishAlert(AlertType.Success, '✓ ' + b.gmbBiz.name, 2000);
            }).catch(error => {
              this._global.publishAlert(AlertType.Danger, '✗ ' + b.gmbBiz.name);
              resolve();
            }
            );
          })
        ));
      }
      catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, '✗ ' + batch.map(b => b.gmbBiz.name).join(', '), 2000);
      }
    }

    this._ref.detectChanges();
    this.injecting = false;
  }

  async suggest(biz) {
    try {
      await this._gmb.suggestQmenu(biz);
      this._global.publishAlert(AlertType.Success, 'Suggested ' + biz.name);
      this._ref.detectChanges();
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Erro Suggesting Edit ' + biz.name + ', ' + error);
    }
  }


}
