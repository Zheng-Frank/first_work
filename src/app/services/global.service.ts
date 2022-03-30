import { LanguageType } from 'src/app/classes/language-type';
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
declare var store: any;

@Injectable()
export class GlobalService {

  // a place for propagting changes of resources
  resourceUpdated = new EventEmitter<any>();
  // token management
  private _token;
  private _user;
  private _menus = [];
  private _superset = [
    // customer document full object model
    {
      dbName: 'customer',
      fullSchema: {},
      example: {}
    },
    // order document full object model
    {
      dbName: 'order',
      fullSchema: {},
      example: {}
    },
    // restaurant document full object model
    {
      dbName: 'restaurant',
      fullSchema: {},
      example: {}
    },
    // address document full object model
    {
      dbName: 'address',
      fullSchema: {},
      example: {}
    },
    // address_customers__customer_addresses document full object model
    {
      dbName: 'address_customers__customer_addresses',
      fullSchema: {},
      example: {}
    },
    // amazon-connect-ctr document full object model
    {
      dbName: 'amazon-connect-ctr',
      fullSchema: {},
      example: {}
    },
    // aanalytic-event document full object model
    {
      dbName: 'analytic-event',
      fullSchema: {},
      example: {}
    },
    // apilog document full object model
    {
      dbName: 'apilog',
      fullSchema: {},
      example: {}
    },
    // bk_event document full object model
    {
      dbName: 'bk_event',
      fullSchema: {},
      example: {}
    },
    // bk_invoice document full object model
    {
      dbName: 'bk_invoice',
      fullSchema: {},
      example: {}
    },
    // bk_job document full object model
    {
      dbName: 'bk_job',
      fullSchema: {},
      example: {}
    },
    // broadcast document full object model
    {
      dbName: 'broadcast',
      fullSchema: {},
      example: {}
    },
    // bug document full object model
    {
      dbName: 'bug',
      fullSchema: {},
      example: {}
    },
    // bugReport document full object model
    {
      dbName: 'bugReport',
      fullSchema: {},
      example: {}
    },
    // chain document full object model
    {
      dbName: 'chain',
      fullSchema: {},
      example: {}
    },
    // courier document full object model
    {
      dbName: 'courier',
      fullSchema: {},
      example: {}
    },
    // creaditcard document full object model
    {
      dbName: 'creaditcard',
      fullSchema: {},
      example: {}
    },
    // csruser document full object model
    {
      dbName: 'csruser',
      fullSchema: {}
    },
    // cycle document full object model
    {
      dbName: 'cycle',
      fullSchema: {},
      example: {}
    },
    // diagnostics-log document full object model
    {
      dbName: 'diagnostics-log',
      fullSchema: {},
      example: {}
    },
    // dine-in-session document full object model
    {
      dbName: 'dine-in-session',
      fullSchema: {},
      example: {}
    },
    // distance document full object model
    {
      dbName: 'distance',
      fullSchema: {},
      example: {}
    },
    // domain document full object model
    {
      dbName: 'domain',
      fullSchema: {},
      example: {}
    },
    // event_bk document full object model
    {
      dbName: 'event_bk',
      fullSchema: {},
      example: {}
    },
    // event_bk document full object model
    {
      dbName: 'event_bk',
      fullSchema: {},
      example: {}
    },
    // event_copy document full object model
    {
      dbName: 'event_copy',
      fullSchema: {},
      example: {}
    },
    // event_listener document full object model
    {
      dbName: 'event_listener',
      fullSchema: {},
      example: {}
    },
    // event document full object model
    {
      dbName: 'event',
      fullSchema: {},
      example: {}
    },
    // execution document full object model
    {
      dbName: 'execution',
      fullSchema: {},
      example: {}
    },
    // executor-event document full object model
    {
      dbName: 'executor-event',
      fullSchema: {},
      example: {}
    },
    // executor-event document full object model
    {
      dbName: 'executor-event',
      fullSchema: {},
      example: {}
    },
    // executor-event document full object model
    {
      dbName: 'executor-event',
      fullSchema: {},
      example: {}
    },
    // fail-order document full object model
    {
      dbName: 'fail-order',
      fullSchema: {},
      example: {}
    },
    // fail-postmates document full object model
    {
      dbName: 'fail-postmates',
      fullSchema: {},
      example: {}
    },
    // fraud document full object model
    {
      dbName: 'fraud',
      fullSchema: {},
      example: {}
    },
    // gmb-pin-request document full object model
    {
      dbName: 'gmb-pin-request',
      fullSchema: {},
      example: {}
    },
    // gmb document full object model
    {
      dbName: 'gmb',
      fullSchema: {},
      example: {}
    },
    // gmbAccount-bad document full object model
    {
      dbName: 'gmbAccount-bad',
      fullSchema: {},
      example: {}
    },
    // gmbAccount document full object model
    {
      dbName: 'gmbAccount',
      fullSchema: {},
      example: {}
    },
    // gmbBiz document full object model
    {
      dbName: 'gmbBiz',
      fullSchema: {},
      example: {}
    },
    // gmbRequest document full object model
    {
      dbName: 'gmbRequest',
      fullSchema: {},
      example: {}
    },
    // google-distance document full object model
    {
      dbName: 'google-distance',
      fullSchema: {},
      example: {}
    },
    // googleAddress document full object model
    {
      dbName: 'googleAddress',
      fullSchema: {},
      example: {}
    },
    // image document full object model
    {
      dbName: 'image',
      fullSchema: {},
      example: {}
    },
    // imagelookup document full object model
    {
      dbName: 'imagelookup',
      fullSchema: {},
      example: {}
    },
    // invoice document full object model
    {
      dbName: 'invoice',
      fullSchema: {},
      example: {}
    },
    // job document full object model
    {
      dbName: 'job',
      fullSchema: {},
      example: {}
    },
    // key document full object model
    {
      dbName: 'key',
      fullSchema: {},
      example: {}
    },
    // log document full object model
    {
      dbName: 'log',
      fullSchema: {},
      example: {}
    },
    // menuoption document full object model
    {
      dbName: 'menuoption',
      fullSchema: {},
      example: {}
    },
    // my-queue document full object model
    {
      dbName: 'my-queue',
      fullSchema: {},
      example: {}
    },
    // objectlabs-system.admin.collections document full object model
    {
      dbName: 'objectlabs-system.admin.collections',
      fullSchema: {},
      example: {}
    },
    // objectlabs-system document full object model
    {
      dbName: 'objectlabs-system',
      fullSchema: {},
      example: {}
    },
    // order-delivery document full object model
    {
      dbName: 'order-delivery',
      fullSchema: {},
      example: {}
    },
    // orderstatus document full object model
    {
      dbName: 'orderstatus',
      fullSchema: {},
      example: {}
    },
    // payment-gateway document full object model
    {
      dbName: 'payment-gateway',
      fullSchema: {},
      example: {}
    },
    // payment document full object model
    {
      dbName: 'payment',
      fullSchema: {},
      example: {}
    },
    // postmates document full object model
    {
      dbName: 'postmates',
      fullSchema: {},
      example: {}
    },
    // print-client document full object model
    {
      dbName: 'print-client',
      fullSchema: {},
      example: {}
    },
    // product-for-test document full object model
    {
      dbName: 'product-for-test',
      fullSchema: {},
      example: {}
    },
    // pubsub-event document full object model
    {
      dbName: 'pubsub-event',
      fullSchema: {},
      example: {}
    },
    // pubsub-subscription document full object model
    {
      dbName: 'pubsub-subscription',
      fullSchema: {},
      example: {}
    },
    // resource-listener document full object model
    {
      dbName: 'resource-listener',
      fullSchema: {},
      example: {}
    },
    // restaurant-cycle document full object model
    {
      dbName: 'restaurant-cycle',
      fullSchema: {},
      example: {}
    },
    // routine-script full object model
    {
      dbName: 'routine-script',
      fullSchema: {},
      example: {}
    },
    // sename-login full object model
    {
      dbName: 'sename-login',
      fullSchema: {},
      example: {}
    },
    // shorturl full object model
    {
      dbName: 'shorturl',
      fullSchema: {},
      example: {}
    },
    // smart-restaurant-api-log full object model
    {
      dbName: 'smart-restaurant-api-log',
      fullSchema: {},
      example: {}
    },
    // sms-login full object model
    {
      dbName: 'sms-login',
      fullSchema: {},
      example: {}
    },
    // sms full object model
    {
      dbName: 'sms',
      fullSchema: {},
      example: {}
    },
    // sop-instance full object model
    {
      dbName: 'sop-instance',
      fullSchema: {},
      example: {}
    },
    // sop full object model
    {
      dbName: 'sop',
      fullSchema: {},
      example: {}
    },
    // subscriber-log full object model
    {
      dbName: 'subscriber-log',
      fullSchema: {},
      example: {}
    },
    // system full object model
    {
      dbName: 'system',
      fullSchema: {},
      example: {}
    },
    // task full object model
    {
      dbName: 'task',
      fullSchema: {},
      example: {}
    },
    // test full object model
    {
      dbName: 'test',
      fullSchema: {},
      example: {}
    },
    // user full object model
    {
      dbName: 'user',
      fullSchema: {},
      example: {}
    },
    // workflow-event full object model
    {
      dbName: 'workflow-event',
      fullSchema: {},
      example: {}
    },
    // workflow full object model
    {
      dbName: 'workflow',
      fullSchema: {},
      example: {}
    },
    // ws-connection full object model
    {
      dbName: 'ws-connection',
      fullSchema: {},
      example: {}
    },
    // yelp-location full object model
    {
      dbName: 'yelp-location',
      fullSchema: {},
      example: {}
    },
    // yelp-request full object model
    {
      dbName: 'yelp-request',
      fullSchema: {},
      example: {}
    },
  ];
  // this superset is the model of every mongodb document in a super status
  get superset() {
    return this._superset;
  }
  // a flag to decide whether show English/Chinese translations,and the switch is closed by default.
  showExplanationsIcon = false;
  // a flag to decide whether change restaurant profile into Chinese.
  languageType = 'English';
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
          name: "Routines",
          href: "#/routines",
          fa: "fas fa-hourglass",
          accessibleRoles: ['ADMIN', 'MARKETER_MANAGER', 'MARKETER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'DRIVER', 'RATE_EDITOR']
        },
        {
          name: "IVR",
          href: "#/ivr/agent",
          fa: "fas fa-user",
          accessibleRoles: ['ADMIN', 'MARKETER_MANAGER', 'MARKETER', 'INVOICE_VIEWER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'RATE_EDITOR']
        },
        {
          name: "ONBOARDING",
          href: "#/onboarding",
          fa: "fas fa-utensils",
          accessibleRoles: ['ADMIN', 'MARKETER_MANAGER', 'MARKETER', 'INVOICE_VIEWER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'RATE_EDITOR']
        },
        {
          name: "Restaurants",
          href: "#/restaurants",
          fa: "fas fa-utensils",
          accessibleRoles: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MARKETER']
        },
        {
          name: "Logs",
          href: "#/logs",
          fa: "fas fa-history",
          accessibleRoles: ["ADMIN", "MARKETER_MANAGER", "MARKETER", "GMB", "CSR", 'CSR_MANAGER', "ACCOUNTANT", "MENU_EDITOR", "DRIVER", "RATE_EDITOR"]
        },
        {
          name: "Invoices",
          href: "#/invoices",
          fa: "fas fa-dollar-sign",
          accessibleRoles: ["ADMIN", "ACCOUNTANT", "CSR", 'CSR_MANAGER']
        },
        // {
        //   name: "Orders",
        //   href: "#/orders",
        //   fa: "fas fa-shopping-bag",
        //   accessibleRoles: ["ADMIN", "ORDER_MANAGER"]
        // },
        {
          name: "Tasks",
          href: "#/tasks",
          fa: "fas fa-tasks",
          accessibleRoles: ['ADMIN', 'MARKETER_MANAGER', 'MARKETER', 'GMB', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT', 'MENU_EDITOR', 'DRIVER', 'RATE_EDITOR']
        },
        {
          name: "Yelp",
          href: "#/yelp",
          fa: "fab fa-yelp",
          accessibleRoles: ["ADMIN", "GMB"]
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
          accessibleRoles: ['ADMIN', 'GMB', 'GMB_SPECIALIST', 'GMB_ADMIN', 'MARKETER_INTERNAL']
        },
        // {
        //   name: "Leads",
        //   href: "#/leads",
        //   fa: "fas fa-lightbulb",
        //   accessibleRoles: ['ADMIN', 'MARKETER', 'MARKETER_MANAGER', 'GMB']
        // },
        {
          name: "My Leads",
          href: "#/my-leads",
          fa: "fas fa-tasks",
          accessibleRoles: ['ADMIN', 'MARKETER', 'MARKETER_MANAGER']
        },
        // {
        //   name: "Users",
        //   href: "#/users",
        //   fa: "fas fa-users",
        //   accessibleRoles: ["ADMIN"]
        // },
        {
          name: "Workflows",
          href: "#/workflows",
          fa: "fas fa-project-diagram",
          accessibleRoles: ["ADMIN", "MENU_EDITOR"]
        },
        {
          name: "SOPs",
          href: "#/sops",
          fa: "fas fa-project-diagram",
          accessibleRoles: ['ADMIN', 'ACCOUNT', 'CRM', 'CSR', 'CSR_MANAGER', 'DRIVER', 'GMB_SPECIALIST', 'GMB', 'INVOICE_VIEWER', 'IVR_CSR_MANAGER', 'IVR_GMB_MANAGER', 'IVR_INTERNAL_MANAGER',
            'IVR_SALES_MANAGER', 'MARKETER_EXTERNAL', 'MARKETER_INTERNAL', 'MARKETER', 'MARKETER_MANAGER', 'MENU_EDITOR', 'PAYER', 'RATE_EDITOR',
            'SIGNUP_AGENT']
        },
        {
          name: "Monitoring",
          href: "#/monitoring",
          fa: "fas fa-heartbeat",
          accessibleRoles: ["CSR", 'CSR_MANAGER', "ADMIN", "MARKETER_MANAGER"]
        },
        {
          name: "System",
          href: "#/system",
          fa: "fas fa-cog",
          accessibleRoles: ['CSR_MANAGER', 'ADMIN']
        },
        // {
        //   name: "Transactions",
        //   href: "#/transaction",
        //   fa: "fas fa-dollar-sign",
        //   accessibleRoles: ["ADMIN"]
        // },
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

  async getCachedRestaurantListForPicker(forceRefresh?: boolean) {
    if (forceRefresh || !this._cache.get('restaurantListForPicker')) {
      const restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {},
        projection: {
          name: 1,
          alias: 1,
          logo: 1,
          "channels.value": 1,
          "channels.type": 1,
          "googleAddress.formatted_address": 1,
          "googleListing.place_id": 1,
          "googleListing.cid": 1,
          "rateSchedules": 1,
          preferredLanguage: 1,
          disabled: 1
        }
      }, 5000);
      this._cache.set('restaurantListForPicker', restaurants, 60 * 60);
    }

    const restaurants = this._cache.get('restaurantListForPicker');
    // const isCsr = this.user.roles.some(r => ["ADMIN", "MENU_EDITOR", "CSR", 'CSR_MANAGER', "ACCOUNTANT"].indexOf(r) >= 0);
    // const visibleRestaurants = restaurants.filter(rt => isCsr || (rt.rateSchedules || []).some(rs => (rs.agent || "").toLowerCase() === this.user.username));
    return restaurants;
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
      const nonExpiredDomains = myDomains.filter(d => new Date(d.expiry) > new Date());
      nonExpiredDomains.push({ name: 'qmenu.us' }); // in case it's not there
      const qmenuDomains = new Set();
      nonExpiredDomains.map(d => qmenuDomains.add(d.name));
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
