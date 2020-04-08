/**
 * a global service to track and share some variables
 */
import { Injectable, EventEmitter } from '@angular/core';
@Injectable()
export class AmazonConnectService {
  onContactConnected: EventEmitter<any> = new EventEmitter();
  onContactEnded: EventEmitter<any> = new EventEmitter();
  onEnabled: EventEmitter<any> = new EventEmitter();
  onConfigurationChanged: EventEmitter<any> = new EventEmitter();

  config = {} as any;
  connectedContacts = [];

  setConfig(config) {
    this.config = config;
    this.onConfigurationChanged.emit(config);
  }

  setEnabeld(enabled) {
    this.onEnabled.emit(enabled);
  }
  
  constructor() {
  }

}
