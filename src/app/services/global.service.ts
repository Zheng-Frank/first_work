import { Injectable } from '@angular/core';
import * as jwtDecode from 'jwt-decode';
declare var store: any;

@Injectable()
export class GlobalService {
  // token management
  private _token;
  private _user;
  private _menus = [];

  get token() {
    return this._token;
  }

  get user() {
    return this._user;
  }

  get menus() {
    return this._menus;
  }

  private _alerts = [];
  get alerts() {
    return this._alerts;
  }

  constructor() {
    this.storeRetrieve();
  }

  storeRetrieve() {
    this._token = store.get('token');
    this._menus = [];
    try {
      this._user = JSON.parse(jwtDecode(this._token)['user']);
      const roles = this._user.roles || [];
console.log(roles);
      const menuMappings = [
        { name: 'Restaurants', href: '#/restaurants', fa: 'cutlery', accessibleRoles: ['ADMIN', 'MENU_EDITOR'] },
        { name: 'Invoices', href: '#/invoices', fa: 'dollar', accessibleRoles: ['ADMIN', 'ACCOUNTANT'] },
        { name: 'Orders', href: '#/orders', fa: 'shopping-bag', accessibleRoles: ['ADMIN', 'ORDER_MANAGER'] },
        { name: 'Leads', href: '#/leads', fa: 'lightbulb-o', accessibleRoles: ['ADMIN', 'MARKETING_DIRECTOR'] },
        { name: 'System', href: '#/system', fa: 'heartbeat', accessibleRoles: ['ADMIN'] },
        { name: 'Users', href: '#/users', fa: 'users', accessibleRoles: ['ADMIN'] },
        { name: 'Bootstrap4', href: '#/bs4', fa: 'twitter', accessibleRoles: ['ADMIN'] },
        { name: 'Me', href: '#/profile', fa: 'user' }
      ];

      this._menus = menuMappings.filter(
        menu => (!menu['accessibleRoles']
          || this._user.roles.some(role => menu['accessibleRoles'].indexOf(role) >= 0)));

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
    this._menus = [];
  }

  storeGetUsername() {
    return store.get('username');
  }

  storeSetUsernameAndToken(username, token) {
    store.set('token', token);
    store.set('username', username);
    this.storeRetrieve();
  }

  publishAlert(alert) {
    this._alerts.unshift(alert);
    setTimeout(() => {
      this.dismissAlert(alert);
    }, alert.timeout || 5000);
  }

  dismissAlert(alert) {
    this._alerts = this._alerts.filter(a => a !== alert);
  }

}
