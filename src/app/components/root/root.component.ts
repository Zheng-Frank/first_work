import { Component, OnInit, ChangeDetectorRef, ViewChild, OnDestroy } from '@angular/core';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { AmazonConnectService } from 'src/app/services/amazon-connect.service';
import {interval} from 'rxjs';
import {TimezoneHelper} from '@qmenu/ui';
import {Helper} from '../../classes/helper';

declare function require(moduleName: string): any;
const { version: appVersion } = require('../../../../package.json');

declare var $: any;

const FraudDetectInterval = 30 * 1000;
const FraudDetectionStorageKey = 'fraud-detection';

@Component({
  selector: 'app-root',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './root.component.html',
  styleUrls: ['./root.component.scss']
})
export class RootComponent implements OnInit, OnDestroy {

  @ViewChild('hotItemModal') hotItemModal: ModalComponent;

  appVersion;
  now = new Date();
  ivrEnabled = false;
  apiRequesting = false;
  fraudOrderCount = 0;
  fraudDetectionSubscription = null;
  constructor(private _api: ApiService, private _global: GlobalService, private ref: ChangeDetectorRef,
              private _router: Router, private _connect: AmazonConnectService) {
    _api.onApiError.subscribe(error => {
      if (error && error.error && error.error.status === 401) {
        this._global.logout();
      }
      setTimeout(() => this.apiRequesting = false, 0);
    });
    _connect.onEnabled.subscribe(enabled => this.ivrEnabled = enabled);
    this._api.onApiRequesting.subscribe((url) => { setTimeout(() => this.apiRequesting = true, 0); });
    this._api.onApiDone.subscribe((url) => { setTimeout(() => this.apiRequesting = false, 0); });
  }

  ngOnInit() {
    this._global.registerModal(this.hotItemModal);
    // refreshing 'now'
    setInterval(() => {
      this.now = new Date();
      this.ref.detectChanges();
    }, 5 * 60 * 1000);
    this.appVersion = appVersion + ' ' + environment.env;
    // dismiss modal if trying to navigate away
    window.addEventListener('popstate', function (event) {
      const modals = $('.modal');
      if (modals && modals.hasClass('show')) {
        modals.modal('hide');
        setTimeout(() => {
          history.forward();
        });
      }
    });
    // auto check fraud order for user xxx, temporaly solution
    if (this._global.user && this._global.user.username === 'june') {
      // when storage changed, check the new detected order count and update fraud notice state
      window.addEventListener('storage',  ({key, newValue}) => {
        try {
          if (key === FraudDetectionStorageKey) {
            let data = JSON.parse(newValue);
            this.fraudOrderCount += data.count;
          }
        } catch (e) {
          console.log('storage data parsing error...', e);
        }
      });
      const timer = interval(FraudDetectInterval);
      this.fraudDetectionSubscription = timer.subscribe(n => this.checkFraudOrder(n));
    }
  }

  ngOnDestroy() {
    if (this.fraudDetectionSubscription) {
      this.fraudDetectionSubscription.unsubscribe();
    }
  }

  async getOrderedCustomersToday() {
    let start = Helper.getNewYorkDate('start');
    const customers = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      aggregate: [
        {$match: {createdAt: {$gte: {$date: start}}}},
        {$project: {customerObj: 1}}
      ]
    }).toPromise();
    let customerOrderCount = {};
    customers.forEach(({customerObj: {_id}}) => {
      customerOrderCount[_id] = (customerOrderCount[_id] || 0) + 1;
    });
    return Object.entries(customerOrderCount).filter(([, count]) => count > 1).map(([customerId]) => customerId);
  }

  async queryFraudOrder() {
    let now = new Date(), time = now.valueOf();
    let end = TimezoneHelper.getTimezoneDateFromBrowserDate(now, 'America/New_York');
    now.setMinutes(now.getMinutes() - 2);
    let start = TimezoneHelper.getTimezoneDateFromBrowserDate(now, 'America/New_York');
    const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      aggregate: [
        {
          $match: {
            'paymentObj.method': {$nin: ['KEY_IN', 'IN_PERSON']},
            $and: [
              {createdAt: {$gte: {$date: start}}},
              {createdAt: {$lte: {$date: end}}}
            ],
          }
        },
        {$project: {logs: 0}},
        {
          $match: {
            'ccAddress.distanceToStore': {$gt: 200},
            'computed.total': {$gte: 400},
            'customerObj._id': {$in: (await this.getOrderedCustomersToday())}
          }
        },
        {$sort: {_id: -1}},
      ]
    }).toPromise();
    let result  = {time, count: orders.length};
    window.localStorage.setItem(FraudDetectionStorageKey, JSON.stringify(result));
  }

  async checkFraudOrder(n) {
    try {
      let prev = window.localStorage.getItem(FraudDetectionStorageKey);
      if (prev) {
        prev = JSON.parse(prev);
        // @ts-ignore
        let ts = Number(prev.time);
        if ((Date.now().valueOf() - ts) < FraudDetectInterval) {
          return;
        }
      }
      await this.queryFraudOrder();
    } catch (e) {
      console.log('check fraud order error...', e);
    }
  }

  getFullYear() {
    return this.now.getFullYear();
  }

  getMenus() {
    return this._global.menus;
  }

  getUser() {
    return this._global.user;
  }

  logout() {
    this._router.navigate(['login']);
  }

  getAlerts() {
    return this._global.alerts;
  }

  dismissAlert(alert) {
    this._global.dismissAlert(alert);
  }

}
