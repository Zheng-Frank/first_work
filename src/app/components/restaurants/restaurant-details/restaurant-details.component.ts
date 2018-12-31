import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Restaurant, Address } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { zip } from "rxjs";
import { Invoice } from '../../../classes/invoice';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
declare var $: any;

@Component({
  selector: 'app-restaurant-details',
  templateUrl: './restaurant-details.component.html',
  styleUrls: ['./restaurant-details.component.css']
})
export class RestaurantDetailsComponent implements OnInit, OnChanges, OnDestroy {
  restaurant: Restaurant;
  gmbBiz: GmbBiz;
  displayTextReply = false;
  phoneNumber;
  message = '';
  textedPhoneNumber;
  @Input() id;

  tabs = [];
  activeTab = 'Settings';
  apiRequesting = false;

  sectionVisibilityRolesMap = {
    profile: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
    contacts: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
    rateSchedules: ['RATE_EDITOR', 'MARKETER'],
    paymentMeans: ['ACCOUNTANT', 'CSR'],
    serviceSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    promotions: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    closedHours: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    cloudPrinting: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    phones: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    deliveryeSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER']
  }

  constructor(private _router: Router, private _api: ApiService, private _global: GlobalService) {
    const tabVisibilityRolesMap = {
      "Settings": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
      "GMB": ['ADMIN', 'MENU_EDITOR', 'CSR'],
      "Menus": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "Menu Options": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "Orders": ['ADMIN', 'CSR'],
      "Invoices": ['ADMIN', 'ACCOUNTANT', 'CSR'],
      "Logs": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER']
    }

    this.tabs = Object.keys(tabVisibilityRolesMap).filter(k => tabVisibilityRolesMap[k].some(r => this._global.user.roles.indexOf(r) >= 0));

  }

  ngOnInit() {
    this.activeTab = this._global.storeGet('restaurantDetailsTab') || 'Settings';
  }

  ngOnDestroy() {
    this._global.storeSet('restaurantDetailsTab', this.activeTab);
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (this.id) {
      const query = {
        _id: { $oid: this.id }
      };
      if (!this._global.user.roles.some(r => ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"].indexOf(r) >= 0)) {
        query["rateSchedules.agent"] = this._global.user.username
      }

      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: query,
        projection: {
          name: 1,
          createdAt: 1,
          alias: 1,
          images: 1,
          channels: 1,
          people: 1,
          rateSchedules: 1,
          paymentMeans: 1,
          serviceSettings: 1,
          promotions: 1,
          googleAddress: 1,
          closedDays: 1,
          restaurantId: 1,

          autoPrintOnNewOrder: 1,
          printCopies: 1,
          autoPrintVersion: 1,
          customizedRenderingStyles: 1,
          printerSN: 1,
          printerKey: 1,
          printers: 1,

          // profile needed fields

          email: 1,
          taxRate: 1,
          surchargeAmount: 1,
          surchargeName: 1,
          pickupTimeEstimate: 1,
          deliveryTimeEstimate: 1,
          logo: 1,
          excludeAmex: 1,
          excludeDiscover: 1,
          taxBeforePromotion: 1,
          requireZipcode: 1,
          requireBillingAddress: 1,
          allowScheduling: 1,
          timeZone: 1,
          notification: 1,
          ccProcessingRate: 1,
          ccProcessingFlatFee: 1,
          stripeSecretKey: 1,
          stripePublishableKey: 1,
          preferredLanguage: 1,
          deliveryByTme: 1,
          phones: 1,
          menus: 1,
          menuOptions: 1,
          notes: 1,
          logs: 1,
          deliverySettings: 1,
          pickupMinimum: 1,
          taxOnDelivery: 1,
          blockedCities: 1,
          blockedZipCodes: 1,
          deliveryFromTime: 1,
          deliveryEndMinutesBeforeClosing: 1,
          offsetToEST: 1,
          disableScheduling: 1,
          domain: 1,
          websiteTemplateName: 1,
          closedHours: 1,
          disabled: 1
        },
        limit: 1
      })
        .subscribe(
          results => {
            this.restaurant = results[0] ? new Restaurant(results[0]) : undefined;
            if (!this.restaurant) {
              this._global.publishAlert(AlertType.Danger, 'Not found or not accessible');
            }
          },
          error => {
            this._global.publishAlert(AlertType.Danger, error);
          }
        );

      // temp: also get gmbBiz to digg more info
      this.gmbBiz = (await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          qmenuId: this.id
        },
        limit: 1
      }).toPromise())[0];
    }

  }

  computeRestaurantStatus(restaurant: Restaurant) {
    return {
      menusOk: restaurant.menus && restaurant.menus.length > 0 && restaurant.menus.some(menu => !menu.disabled),
      hoursOk: (restaurant.menus || []).every(menu => menu.hours && menu.hours.length > 0),
      serviceSettingsOk: restaurant.serviceSettings && restaurant.serviceSettings.some(settings => settings.paymentMethods && settings.paymentMethods.length > 0),
      emailOk: (restaurant.email || '').split(',').map(email => (email || '').trim()).filter(email => email).length > 0,
      voiceOk: (restaurant.phones || []).some(phone => phone.callable),
      smsOk: (restaurant.phones || []).some(phone => phone.textable),
      faxOk: (restaurant.phones || []).some(phone => phone.faxable),
      paymentMeansOk: restaurant.paymentMeans && restaurant.paymentMeans.length > 0,
      rateScheduleOk: restaurant.rateSchedules && restaurant.rateSchedules.length > 0,
      taxRateOk: !!restaurant.taxRate,
      ownerInfoOk: restaurant.people && restaurant.people.some(person => person.roles && person.roles.indexOf('Owner') >= 0),
      salesAgentOk: restaurant.rateSchedules && restaurant.rateSchedules.some(rs => !!rs.agent)
    };
  }

  setActiveTab(tab) {
    this.activeTab = tab;
  }

  isValid() {
    return this.isPhoneValid(this.phoneNumber);
  }

  isPhoneValid(text) {
    if (!text) {
      return false;
    }

    let digits = text.replace(/\D/g, '');
    if (digits) {
      let phoneRe = /^[2-9]\d{2}[2-9]\d{2}\d{4}$/;
      if (digits.match(phoneRe)) {
        return true;
      }
    }
    return false;
  }

  sendText() {
    this.textedPhoneNumber = this.phoneNumber;

    this._api.put(environment.legacyApiUrl + "twilio/sendTextAndCreateCustomer/", {
      phoneNumber: this.phoneNumber,
      message: this.message,
      source: this.restaurant.id
    })
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            "Text Message Sent successfully"
          );

        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Failed to send successfully");
        }
      );
  }

  toggleTextReply() {
    this.displayTextReply = !this.displayTextReply;
    // focus on the phone number!
    setTimeout(() => { $('#profile-phone-number').focus(); }, 500);
  }


  getAddress() {
    return (this.restaurant.address || {});
  }

  goto(route: string) {
    route = route.replace(' ', '-');
    this._router.navigate(['restaurant/' + this.id + '/' + route.toLowerCase()]);
  }

  isSectionVisible(sectionName) {
    const roles = this._global.user.roles || [];
    return this.sectionVisibilityRolesMap[sectionName].filter(r => roles.indexOf(r) >= 0).length > 0;
  }

  isMarketerAndCreatedLessThan14Days() {
    const createdAt = new Date((this.restaurant || {})['createdAt'] || 0);

    return this._global.user.roles.indexOf('MARKETER') >= 0 && new Date().valueOf() - createdAt.valueOf() < 14 * 24 * 3600000;
  }

  getVisibleRoutes() {
    const roles = this._global.user.roles || [];
    const routeVisibilityRolesMap = [
      {
        title: 'Menus',
        route: '/restaurants/' + this.restaurant['_id'] + '/menus',
        roles: ['ADMIN', 'MENU_EDITOR', 'MARKETER']
      },
      {
        title: 'Menu Options',
        route: '/restaurants/' + this.restaurant['_id'] + '/menu-options',
        roles: ['ADMIN', 'MENU_EDITOR', 'MARKETER']
      },
      {
        title: 'Orders',
        route: '/restaurants/' + this.restaurant['_id'] + '/orders',
        roles: ['ADMIN', 'CSR']
      },
      {
        title: 'Invoices',
        route: '/restaurants/' + this.restaurant['_id'] + '/invoices',
        roles: ['ADMIN', 'ACCOUNTANT']
      }
    ];
    return routeVisibilityRolesMap.filter(r => r.roles.some(role => roles.indexOf(role) >= 0));
  }

  getLine1(address: Address) {
    if (!address) {
      return 'Address Missing';
    }
    return (address.street_number ? address.street_number : '') + ' '
      + (address.route ? ' ' + address.route : '') +
      (address.apt ? ', ' + address.apt : '');
  }
  getLine2(address: Address) {
    if (!address) {
      return '';
    }
    return (address.locality ? address.locality + ', ' : (address.sublocality ? address.sublocality + ', ' : ''))
      + (address.administrative_area_level_1 ? address.administrative_area_level_1 : '')
      + ' ' + address.postal_code;
  }

}
