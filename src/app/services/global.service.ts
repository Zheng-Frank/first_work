import { Injectable } from '@angular/core';
import * as jwtDecode from 'jwt-decode';
declare var store: any;

@Injectable()
export class GlobalService {
  // token management
  private _token;
  private _user;

  get token() {
    return this._token;
  }

  get user() {
    return this._user;
  }

  constructor() {
    this.storeRetrieve();
  }

  storeRetrieve() {
    this._token = store.get('token');
    try {
      this._user = JSON.parse(jwtDecode(this._token)['user']);
    } catch {
    }
  }
  /** reset persisted values, except username (for next login) */
  logout() {
    const username = store.get('username');
    store.clearAll();
    store.set('username', username);
    this._token = undefined;
    this._user = undefined;
  }

  storeGetUsername() {
    return store.get('username');
  }

  storeSetUsernameAndToken(username, token) {
    store.set('token', token);
    store.set('username', username);
    this.storeRetrieve();
  }
}
