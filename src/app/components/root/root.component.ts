import { Component, OnInit } from '@angular/core';
import {environment} from '../../../environments/environment';
declare function require(moduleName: string): any;

const { version: appVersion } = require('../../../../package.json');

@Component({
  selector: 'app-root',
  templateUrl: './root.component.html',
  styleUrls: ['./root.component.scss']
})
export class RootComponent implements OnInit {

  appVersion;
  now = new Date();
  constructor() { }

  ngOnInit() {
    // refreshing 'now'
    setInterval(() => {
      this.now = new Date();
    }, 60 * 5 * 1000);
    this.appVersion = appVersion + ' ' + environment.env;
  }

  getFullYear() {
    return this.now.getFullYear();
  }

  isApiRequesting() {
    return false;
  }

}
