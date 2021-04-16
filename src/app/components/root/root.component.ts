import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { AmazonConnectService } from 'src/app/services/amazon-connect.service';

declare function require(moduleName: string): any;
const { version: appVersion } = require('../../../../package.json');

declare var $: any;

@Component({
  selector: 'app-root',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './root.component.html',
  styleUrls: ['./root.component.scss']
})
export class RootComponent implements OnInit {

  @ViewChild('hotItemModal') hotItemModal: ModalComponent;

  appVersion;
  now = new Date();
  ivrEnabled = false;
  apiRequesting = false;
  constructor(private _api: ApiService, private _global: GlobalService, private ref: ChangeDetectorRef, private _router: Router, private _connect: AmazonConnectService) {
    _api.onApiError.subscribe(error => {
      if (error && error.error && error.error.status === 401) {
        this._global.logout();
      }
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
