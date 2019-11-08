import { Injectable, EventEmitter } from "@angular/core";
import * as jwtDecode from "jwt-decode";
import { Alert } from "../classes/alert";
import { ApiService } from "./api.service";
import { AlertType } from "../classes/alert-type";
import { User } from "../classes/user";
import { ModalType } from "../classes/modal-type";
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { CacheService } from "./cache.service";
import { environment } from "../../environments/environment";
import { Restaurant } from "@qmenu/ui";
declare var store: any;

@Injectable()
export class GlobalService {

  // a place for propagting changes of resources
  resourceUpdated = new EventEmitter<any>();
  // token management
  private _token;
  private _user;
  private _menus = [];

  get token() {
    return this._token;
  }

  get user(): User {
    return this._user;
  }

  get menus() {
    return this._menus;
  }

  private _alerts: Alert[] = [];
  get alerts() {
    return this._alerts;
  }

  constructor(private _api: ApiService, private _cache: CacheService) {
    this.storeRetrieve();
  }

  storeRetrieve() {
    this._token = store.get("token");
    if (this._token) {
      this._api.addHeader("Authorization", "Bearer " + this.token);
    }
    this._menus = [];
    try {
      this._user = new User(JSON.parse(jwtDecode(this._token)["user"]));
      const roles = this._user.roles || [];
      const menuMappings = [
        {
          name: "Restaurants",
          href: "#/restaurants",
          fa: "fas fa-utensils",
          accessibleRoles: ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT", "MARKETER"]
        },
        {
          name: "Logs",
          href: "#/logs",
          fa: "fas fa-history",
          accessibleRoles: ["ADMIN", "MARKETING_DIRECTOR", "GMB", "CSR", "ACCOUNTANT", "MENU_EDITOR", "DRIVER", "RATE_EDITOR"]
        },
        {
          name: "Payments",
          href: "#/payments",
          fa: "fas fa-hand-holding-usd",
          accessibleRoles: ["ADMIN", "ACCOUNTANT", "CSR"]
        },
        {
          name: "Invoices",
          href: "#/invoices",
          fa: "fas fa-dollar-sign",
          accessibleRoles: ["ADMIN", "ACCOUNTANT", "CSR"]
        },
        {
          name: "Orders",
          href: "#/orders",
          fa: "fas fa-shopping-bag",
          accessibleRoles: ["ADMIN", "ORDER_MANAGER"]
        },
        {
          name: "Tasks",
          href: "#/tasks",
          fa: "fas fa-tasks",
          accessibleRoles: ["ADMIN", "MARKETING_DIRECTOR", "MARKETER", "INVOICE_VIEWER", "GMB", "CSR", "ACCOUNTANT", "MENU_EDITOR", "DRIVER", "RATE_EDITOR"]
        },
        {
          name: "GMBs",
          href: "#/gmbs",
          fa: "fab fa-google",
          accessibleRoles: ["ADMIN", "GMB"]
        },
        {
          name: "GMB Tasks",
          href: "#/gmb-tasks",
          fa: "fab fa-google",
          accessibleRoles: ["ADMIN", "GMB", "GMB_SPECIALIST", "GMB_ADMIN"]
        },
        {
          name: "Leads",
          href: "#/leads",
          fa: "fas fa-lightbulb",
          accessibleRoles: ["ADMIN", "MARKETING_DIRECTOR", "MARKETER", "GMB"]
        },
        {
          name: "My Leads",
          href: "#/my-leads",
          fa: "fas fa-tasks",
          accessibleRoles: ["ADMIN", "MARKETING_DIRECTOR", "MARKETER"]
        },
        {
          name: "Users",
          href: "#/users",
          fa: "fas fa-users",
          accessibleRoles: ["ADMIN"]
        },
        {
          name: "Automation",
          href: "#/automation",
          fa: "fas fa-magic",
          accessibleRoles: ["ADMIN"]
        },
        {
          name: "Monitoring",
          href: "#/monitoring",
          fa: "fas fa-heartbeat",
          accessibleRoles: ["CSR", "ADMIN"]
        },
        {
          name: "System",
          href: "#/system",
          fa: "fas fa-cog",
          accessibleRoles: ["ADMIN"]
        },
        {
          name: "Transactions",
          href: "#/transaction",
          fa: "fas fa-dollar-sign",
          accessibleRoles: ["ADMIN"]
        },
        { name: "Me", href: "#/profile", fa: "fas fa-user" }
      ];

      this._menus = menuMappings.filter(
        menu =>
          !menu["accessibleRoles"] ||
          this.isUserInRoles(menu["accessibleRoles"])
      );
    } catch { }
  }
  /** reset persisted values, except username (for next login) */
  logout() {
    const username = store.get("username");
    store.clearAll();
    store.set("username", username);
    this._cache.clearAll();
    this._token = undefined;
    this._user = undefined;
    this._menus = [];
  }

  storeSetUsernameAndToken(username, token) {
    store.set("token", token);
    store.set("username", username);
    this.storeRetrieve();
  }

  storeSet(itemName, itemValue) {
    store.set(itemName, itemValue);
  }

  storeGet(itemName) {
    return store.get(itemName);
  }

  publishAlert(type: AlertType, message: string, timeout = 5000) {
    const alert = { type: type, message: message, timeout: timeout };
    this._alerts.unshift(alert);
    setTimeout(() => {
      this.dismissAlert(alert);
    }, alert.timeout);
  }

  dismissAlert(alert: Alert) {
    this._alerts = this._alerts.filter(a => a !== alert);
  }


  modal: ModalComponent;

  registerModal(modal: ModalComponent) {
    this.modal = modal;
  }
  publishModal(type: ModalType, _id: string) {
    this.modal.show();
  }

  isUserInRoles(roles) {
    return (this._user.roles || []).some(role => roles.indexOf(role) >= 0);
  }

  static serviceProviderMap = {
    beyondmenu: "beyondmenu.png",
    chownow: "chownow.png",
    chinesemenuonline: "chinesemenuonline.png",
    chinesemenu: "chinesemenu.png",
    doordash: "doordash.png",
    eat24: "eat24.png",
    eatstreet: "eatstreet.png",
    facebook: "facebook.png",
    grubhub: "grubhub.png",
    hanyi: "hanyi.png",
    menufy: "menufy.png",
    qmenu: "qmenu.png",
    "qmenu-gray": "qmenu-gray.png",
    redpassion: "redpassion.png",
    slicelife: "slicelife.png",
    seamless: "seamless.png",
    ubereats: "ubereats.png"
  }

  async getCachedVisibleRestaurantList(forceRefresh?: boolean) {

    if (this._cache.get('restaurants') && !forceRefresh) {
      return this._cache.get('restaurants');
    } else {
      const query = {};
      if (!this.user.roles.some(r => ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"].indexOf(r) >= 0)) {
        query["rateSchedules.agent"] = this.user.username
      }
      const result = [];
      const restaurantBatchSize = 800;
      let restaurantSkip = 0;

      while (true) {
        const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant',
          projection: {
            name: 1,
            alias: 1,
            logo: 1,
            restaurantId: 1,
            "phones.phoneNumber": 1,
            "channels": 1,
            disabled: 1,
            logs: {
              $slice: -3
            },
            "rateSchedules.agent": 1,
            "googleAddress.formatted_address": 1,
            "googleAddress.timezone": 1,
            "googleListing.gmbOwner": 1,
            "googleListing.phone": 1,
            score: 1,
            "web.qmenuWebsite": 1, // for qmenu domains
            web: 1
          },
          skip: restaurantSkip,
          limit: restaurantBatchSize
        }).toPromise();

        result.push(...batch);

        if (batch.length === 0) {
          break;
        }
        restaurantSkip += restaurantBatchSize;
      }

      const restaurants = result.map(r => new Restaurant(r));
      restaurants.sort((r1, r2) => r1.name > r2.name ? 1 : -1);

      console.log(`loaded ${restaurants.length} restaurants`);

      this._cache.set('restaurants', restaurants, 30 * 60);
      return restaurants;
    }
  }

  async getCachedUserList(forceRefresh?: boolean) {

    if (this._cache.get('users') && !forceRefresh) {
      return this._cache.get('users');
    } else {
      const users = await this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "user",
          limit: 1000
        }).toPromise();

      const userList = users.map(r => new User(r));
      userList.sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
      this._cache.set('users', userList, 30 * 60);

      console.log(`loaded ${users.length} users`);
      return userList;
    }
  }

  async getCachedDomains(forceRefresh?: boolean) {

    if (this._cache.get('qmDomains') && !forceRefresh) {
      return this._cache.get('qmDomains');
    } else {
      // retrieve ALL qmenu domains
      const myDomains = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "domain",
        query: {},
        limit: 10000000,
        projection: { expiry: 1, name: 1 }
      }).toPromise();
      console.log(`loaded ${myDomains.length} domains`);
      const nonExpiredDomains = myDomains.filter(d => new Date(d.expiry) > new Date());
      nonExpiredDomains.push({ name: 'qmenu.us' }); // in case it's not there
      const qmenuDomains = new Set();
      nonExpiredDomains.map(d => qmenuDomains.add(d.name));
      console.log(`loaded ${nonExpiredDomains.length} non expired domains`);
      this._cache.set('qmDomains', qmenuDomains, 30 * 60);

      return qmenuDomains;
    }
  }

  async getCachedGmbAccountsNoLocations(forceRefresh?: boolean) {

    if (this._cache.get('gmbAccounts') && !forceRefresh) {
      return this._cache.get('gmbAccounts');
    } else {
      // retrieve ALL gmb accounts w/o location data
      const accounts = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmbAccount",
        query: {},
        limit: 2000,
        projection: { locations: 0 }
      }).toPromise();

      console.log(`loaded ${accounts.length} gmbAccounts`);
      this._cache.set('gmbAccounts', accounts, 24 * 60 * 60);
      return accounts;
    }
  }
  
}
