import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

declare function require(moduleName: string): any;

const { version: appVersion } = require('../../../../package.json');

@Component({
  selector: 'app-root',
  // changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './root.component.html',
  styleUrls: ['./root.component.scss']
})
export class RootComponent implements OnInit {

  appVersion;
  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService, private ref: ChangeDetectorRef, private _router: Router) { }

  ngOnInit() {
    // refreshing 'now'
    setInterval(() => {
      this.now = new Date();
      this.ref.detectChanges();
    }, 5 * 60 * 1000);
    this.appVersion = appVersion + ' ' + environment.env;
  }

  getFullYear() {
    return this.now.getFullYear();
  }

  isApiRequesting() {
    return this._api.urlsInRequesting.length > 0;
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
