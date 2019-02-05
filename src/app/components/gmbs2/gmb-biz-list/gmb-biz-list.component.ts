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
import { Task } from '../../../classes/tasks/task';
import { Gmb3Service } from 'src/app/services/gmb3.service';

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
      label: "Website"
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

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service, private _ref: ChangeDetectorRef) {
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
          gmbOwnerships: 0,
          accounts: 0          
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


          this.myEmails = results[1].map(account => account.email);

          const restaurantIdDict = {};
          results[2].map(r => restaurantIdDict[r._id] = r);

          // make myBizList:
          this.myBizList = this.bizList.map(biz => ({
            gmbBiz: biz,
            qmenuIdDays: biz.qmenuId ? Math.floor((this.now.valueOf() - parseInt(biz.qmenuId.substring(0, 8), 16) * 1000) / (24 * 3600000)) : undefined,
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


  isProcessing(biz) {
    return this.processingBizSet.has(biz);
  }

  getLogo(gmbBiz: GmbBiz) {
    if (gmbBiz.bizManagedWebsite && gmbBiz.gmbOwner === 'qmenu') {
      return GlobalService.serviceProviderMap['qmenu-gray'];
    }
    return GlobalService.serviceProviderMap[gmbBiz.gmbOwner];
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

}
