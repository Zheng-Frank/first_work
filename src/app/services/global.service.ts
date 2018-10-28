import { Injectable, EventEmitter } from "@angular/core";
import * as jwtDecode from "jwt-decode";
import { Alert } from "../classes/alert";
import { ApiService } from "./api.service";
import { AlertType } from "../classes/alert-type";
import { User } from "../classes/user";
import { ModalType } from "../classes/modal-type";
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

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

  constructor(private _api: ApiService) {
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
          accessibleRoles: ["ADMIN", "MENU_EDITOR", "CSR","ACCOUNTANT"]
        },
        {
          name: "Logs",
          href: "#/logs",
          fa: "fas fa-history",
          accessibleRoles: ["ADMIN", "CSR", "ACCOUNTANT"]
        },
        {
          name: "Payments",
          href: "#/payments",
          fa: "fas fa-hand-holding-usd",
          accessibleRoles: ["ADMIN","ACCOUNTANT", "CSR"]
        },
        {
          name: "Invoices",
          href: "#/invoices",
          fa: "fas fa-dollar-sign",
          accessibleRoles: ["ADMIN", "ACCOUNTANT"]
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
          accessibleRoles: ["ADMIN", "MARKETING_DIRECTOR", "MARKETER", "GMB", "CSR", "ACCOUNTANT", "MENU_EDITOR", "DRIVER", "RATE_EDITOR"]
        },
        {
          name: "GMBs",
          href: "#/gmbs",
          fa: "fab fa-google",
          accessibleRoles: ["ADMIN", "GMB"]
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
          name: "System",
          href: "#/system",
          fa: "fas fa-heartbeat",
          accessibleRoles: ["ADMIN"]
        },
        {
          name: "Users",
          href: "#/users",
          fa: "fas fa-users",
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
    return this._user.roles.some(role => roles.indexOf(role) >= 0);
  }

  static serviceProviderMap = {
    beyondmenu: "beyondmenu.png",
    chownow: "chownow.png",
    chinesemenuonline: "chinesemenuonline.png",
    doordash: "doordash.png",
    eat24: "eat24.png",
    eatstreet: "eatstreet.png",
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
}
