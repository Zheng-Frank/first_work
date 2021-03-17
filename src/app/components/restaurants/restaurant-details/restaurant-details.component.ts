import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant, Address } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';

declare var $: any;

@Component({
  selector: 'app-restaurant-details',
  templateUrl: './restaurant-details.component.html',
  styleUrls: ['./restaurant-details.component.css']
})
export class RestaurantDetailsComponent implements OnInit, OnDestroy {
  restaurant: Restaurant;
  displayTextReply = false;
  displayGooglePIN = false;
  phoneNumber;
  message = '';
  textedPhoneNumber;
  @Input() id;

  tabs = [];
  activeTab = 'Settings';
  apiRequesting = false;

  readonly = true;

  sectionVisibilityRolesMap = {
    profile: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
    contacts: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
    rateSchedules: ['RATE_EDITOR', 'MARKETER'],
    paymentMeans: ['ACCOUNTANT', 'CSR', 'MARKETER'],
    serviceSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    qrSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    promotions: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    closedHours: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    cloudPrinting: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    faxSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    phones: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    deliverySettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    webSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER', 'GMB'],
    restaurantManagedWebSettings: ['ADMIN', 'GMB_SPECIALIST', 'MENU_EDITOR'],
    restaurantChains: ['ADMIN', 'CSR'],
  }

  knownUsers = [];

  constructor(private _route: ActivatedRoute, private _router: Router, private _api: ApiService, private _global: GlobalService) {
    const tabVisibilityRolesMap = {
      "Settings": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
      "GMB": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "Menus": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "Menu Options": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "Orders": ['ADMIN', 'CSR'],
      "Invoices": ['ADMIN', 'ACCOUNTANT', 'CSR'],
      "1099K": ['ADMIN', 'ACCOUNTANT', 'CSR'],
      "Logs": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
      "Tasks": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER', 'GMB'],
      "Diagnostics": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER', 'GMB'],
      "GMB Posts": ['ADMIN', 'MENU_EDITOR', 'CSR'],
      "Web Template": ['ADMIN', 'MENU_EDITOR', 'CSR'],
      "Yelp": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "API Logs": ['ADMIN'],
    }

    this.tabs = Object.keys(tabVisibilityRolesMap).filter(k => tabVisibilityRolesMap[k].some(r => this._global.user.roles.indexOf(r) >= 0));

    this._route.params.subscribe(
      params => {
        this.id = params['id'];
        this.loadDetails();
      });

    this._global.getCachedUserList().then(users => this.knownUsers = users).catch(console.error);
  }

  ngOnInit() {
    this.activeTab = this._global.storeGet('restaurantDetailsTab') || 'Settings';
  }

  ngOnDestroy() {
    this._global.storeSet('restaurantDetailsTab', this.activeTab);
  }

  async loadDetails() {
    this.readonly = true;
    if (this.id) {
      this.apiRequesting = true;
      const query = {
        _id: { $oid: this.id }
      };

      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: query,
        projection: {
          // profile needed fields
          alias: 1,
          allowedCities: 1,
          allowedZipCodes: 1,
          allowScheduling: 1,
          autoPrintOnNewOrder: 1,
          autoPrintVersion: 1,
          blockedCities: 1,
          blockedZipCodes: 1,
          ccProcessingFlatFee: 1,
          ccProcessingRate: 1,
          ccProcessor: 1,
          channels: 1,
          closedDays: 1,
          closedHours: 1,
          courier: 1,
          createdAt: 1,
          crm: 1,
          customizedRenderingStyles: 1,
          deliveryArea: 1,
          deliveryClosedHours: 1,
          deliveryEndMinutesBeforeClosing: 1,
          deliveryFromTime: 1,
          deliveryHours: 1,
          deliverySettings: 1,
          deliveryTimeEstimate: 1,
          disabled: 1,
          disableScheduling: 1,
          excludeAmex: 1,
          excludeDiscover: 1,
          feeSchedules: 1,
          form1099ks: 1,
          gmbOrigin: 1,
          gmbOwnerHistory: 1,
          gmbSettings: 1,
          googleAddress: 1,
          googleListing: 1,
          hideOrderStatus: 1,
          hideTipInput: 1,
          hidePrintingCCInfo: 1,
          images: 1,
          logo: 1,
          logs: 1,
          menuOptions: 1,
          menus: 1,
          name: 1,
          notes: 1,
          notification: 1,
          paymentMeans: 1,
          people: 1,
          pickupMinimum: 1,
          pickupTimeEstimate: 1,
          preferredLanguage: 1,
          printCopies: 1,
          printerKey: 1,
          printers: 1,
          printerSN: 1,
          promotions: 1,
          'qrSettings.viewOnly': 1,
          rateSchedules: 1,
          requireBillingAddress: 1,
          requireZipcode: 1,
          restaurantId: 1,
          salesAgent: 1,
          score: 1,
          serviceSettings: 1,
          skipImageInjection: 1,
          skipOrderConfirmation: 1,
          skipAutoInvoicing: 1,
          skipShowTax: 1,
          menuHoursExtended: 1,
          stripePublishableKey: 1,
          stripeSecretKey: 1,
          surchargeAmount: 1,
          surchargeName: 1,
          surchargeRate: 1,
          taxBeforePromotion: 1,
          taxOnDelivery: 1,
          taxRate: 1,
          templateName: 1,
          timeZone: 1,
          web: 1,
          yelpListing: 1,
          phones: 1,
          muteFirstNotifications: 1,
          muteSecondNotifications: 1,
          printSettings: 1,
          useNewSettings: 1,
          ccHandler: 1,
          comebackDate: 1,
          ccMinimumCharge: 1

        },
        limit: 1
      })
        .subscribe(
          results => {
            this.apiRequesting = false;
            const rt = results[0];

            (rt.gmbOwnerHistory || []).reverse();

            (rt.menus || []).map(menu => (menu.mcs || []).map(mc => mc.mis = (mc.mis || []).filter(mi => mi && mi.name)));
            this.restaurant = rt ? new Restaurant(rt) : undefined;
            if (!this.restaurant) {
              return this._global.publishAlert(AlertType.Danger, 'Not found or not accessible');
            }

            const canEdit = this._global.user.roles.some(r => ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"].indexOf(r) >= 0) || (rt.rateSchedules).some(rs => rs.agent === 'invalid') || (rt.rateSchedules || []).some(rs => rs.agent === this._global.user.username);
            this.readonly = !canEdit;

          },
          error => {
            this.apiRequesting = false;
            this._global.publishAlert(AlertType.Danger, error);
          }
        );
    }
  }

  computeRestaurantStatus(restaurant: Restaurant) {
    return {
      menusOk: restaurant.menus && restaurant.menus.length > 0 && restaurant.menus.some(menu => !menu.disabled),
      hoursOk: (restaurant.menus || []).every(menu => menu.hours && menu.hours.length > 0),
      serviceSettingsOk: restaurant.serviceSettings && restaurant.serviceSettings.some(settings => settings.paymentMethods && settings.paymentMethods.length > 0),
      emailOk: (restaurant.channels || []).some(c => c.type === 'Email' && (c.notifications || []).some(n => n === 'Order')),
      voiceOk: (restaurant.channels || []).some(c => c.type === 'Phone' && (c.notifications || []).some(n => n === 'Order')),
      smsOk: (restaurant.channels || []).some(c => c.type === 'SMS' && (c.notifications || []).some(n => n === 'Order')),
      faxOk: (restaurant.channels || []).some(c => c.type === 'Fax' && (c.notifications || []).some(n => n === 'Order')),
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

  toggleGooglePIN() {
    this.displayGooglePIN = !this.displayGooglePIN;
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

  isDate(dateToParse) {
    return !isNaN(Date.parse(dateToParse));
  }

}
