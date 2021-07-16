import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { LanguageType } from './../../../classes/language-type';
import { Component, OnInit, Input, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant, Address } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { RestaurantProfileComponent } from '../restaurant-profile/restaurant-profile.component';
import { SendTextReplyComponent } from '../../utilities/send-text-reply/send-text-reply.component';
import {Helper} from '../../../classes/helper';

declare var $: any;

@Component({
  selector: 'app-restaurant-details',
  templateUrl: './restaurant-details.component.html',
  styleUrls: ['./restaurant-details.component.css']
})
export class RestaurantDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('restaurantProfile')restaurantProfile:RestaurantProfileComponent;
  @ViewChild('textReplyModal')textReplyModal:ModalComponent;
  @ViewChild('textReplyComponent')textReplyComponent: SendTextReplyComponent;
  languageTypes = [LanguageType.ENGLISH,LanguageType.CHINESE];
  languageType = this._global.languageType;
  restaurant: Restaurant;
  displayGooglePIN = false;
  @Input() id;

  tabs = [];
  activeTab = 'Settings';
  apiRequesting = false;

  readonly = true;

  sectionVisibilityRolesMap = {
    profile: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
    contacts: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
    rateSchedules: ['ADMIN', 'RATE_EDITOR'], // rateSchedule should be migrated to fee schedule, no need to show for normal roles
    feeSchedules: ['ADMIN', 'RATE_EDITOR', 'MARKETER', 'CSR'],
    paymentMeans: ['ACCOUNTANT', 'CSR', 'MARKETER'],
    serviceSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    promotions: [],
    qrSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    closedHours: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    cloudPrinting: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    faxSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    phones: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    deliverySettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
    webSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER', 'GMB'],
    restaurantManagedWebSettings: ['ADMIN', 'GMB_SPECIALIST', 'MENU_EDITOR'],
    restaurantChains: ['ADMIN', 'CSR'],
  };

  projections = {
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
    providers: 1,
    'qrSettings.viewOnly': 1,
    'qrSettings.agent': 1,
    'qrSettings.agentAt': 1,
    rateSchedules: 1,
    requireBillingAddress: 1,
    requireZipcode: 1,
    restaurantId: 1,
    salesAgent: 1,
    score: 1,
    serviceSettings: 1,
    skipImageInjection: 1,
    skipOrderConfirmation: 1,
    "selfSignup.registered": 1,
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
    translations: 1,
    web: 1,
    yelpListing: 1,
    phones: 1,
    muteFirstNotifications: 1,
    muteSecondNotifications: 1,
    printSettings: 1,
    useNewSettings: 1,
    ccHandler: 1,
    comebackDate: 1,
    ccMinimumCharge: 1,
    hideOrderReadyEstimate: 1
  };

  showExplanations = false; // a flag to decide whether show English/Chinese translations,and the switch is closed by default.
  googleSearchText; // using redirect google search.
  knownUsers = [];

  constructor(private _route: ActivatedRoute, private _router: Router, private _api: ApiService, private _global: GlobalService) {
    const tabVisibilityRolesMap = {
      "Settings": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
      "GMB": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "Menus": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "Menu Options": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "Coupons": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "Orders": ['ADMIN', 'CSR'],
      "Invoices": ['ADMIN', 'ACCOUNTANT', 'CSR'],
      "Logs": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'],
      "Tasks": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER', 'GMB'],
      "Diagnostics": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER', 'GMB'],
      "Others":['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'MARKETER'] // make a superset and reorder authority in restaurant other page.
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

  async reload(callback: (rt: Restaurant) => any) {
    const query = {_id: { $oid: this.id }};
    this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: query,
      projection: this.projections,
      limit: 1
    }).subscribe(
      results => {
        const rt = results[0];
        (rt.gmbOwnerHistory || []).reverse();
        (rt.menus || []).map(menu => (menu.mcs || []).map(mc => mc.mis = (mc.mis || []).filter(mi => mi && mi.name)));
        this.restaurant = rt ? new Restaurant(rt) : undefined;
        if (!this.restaurant) {
          return this._global.publishAlert(AlertType.Danger, 'Not found or not accessible');
        }
        if(callback){
          callback(this.restaurant);
        }
      }, error => {
        this._global.publishAlert(AlertType.Danger, error);
      }
    );
  }
  // select html element change invoke it , and its function is change restaurant profile field into Chinese or English
  changeLanguage(){
    if(this.languageType === LanguageType.ENGLISH){
      this.restaurantProfile.changeLanguageFlag = this._global.languageType = LanguageType.ENGLISH;
    }else if(this.languageType === LanguageType.CHINESE){
      this.restaurantProfile.changeLanguageFlag = this._global.languageType = LanguageType.CHINESE;
    }
  }

  // if the switch is open,we show i button and show Chinese and English explanations
  toggleShowExplanations(){
    if(this.showExplanations){
      this.restaurantProfile.showExplanationsIcon = this._global.showExplanationsIcon = true;
    }else{
      this.restaurantProfile.showExplanationsIcon = this._global.showExplanationsIcon = false;
    }
  }

  async loadDetails() {
    this.readonly = true;
    if (this.id) {
      this.apiRequesting = true;
      const query = {_id: { $oid: this.id }};

      this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: query,
        projection: this.projections,
        limit: 1
      }).subscribe(
        results => {
          this.apiRequesting = false;
          const rt = results[0];

        (rt.gmbOwnerHistory || []).reverse();

        (rt.menus || []).map(menu => (menu.mcs || []).map(mc => mc.mis = (mc.mis || []).filter(mi => mi && mi.name)));
        this.restaurant = rt ? new Restaurant(rt) : undefined;
        if (!this.restaurant) {
          return this._global.publishAlert(AlertType.Danger, 'Not found or not accessible');
        }

        const canEdit = this._global.user.roles.some(r =>
          ['ADMIN', 'MENU_EDITOR', 'CSR', 'ACCOUNTANT'].indexOf(r) >= 0) ||
          (rt.rateSchedules).some(rs => rs.agent === 'invalid') ||
          (rt.rateSchedules || []).some(rs => rs.agent === this._global.user.username);
        this.readonly = !canEdit;
        // use encodeURLComponment to reformat the href of a link.
        // https://www.google.com/search?q={{restaurant.name}} {{restaurant.googleAddress.formatted_address}}
          let formatted_address = this.restaurant.googleAddress.formatted_address||'';
          let name = this.restaurant.name || '';
          this.googleSearchText = "https://www.google.com/search?q="+encodeURIComponent(name+" "+formatted_address);
        },
        error => {
          this.apiRequesting = false;
          this._global.publishAlert(AlertType.Danger, error);
          return Promise.reject();
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

  // show a modal to do the send SMS function
  toggleTextReply() {
    this.textReplyComponent.phoneNumber = '';
    this.textReplyComponent.message = '';
    this.textReplyComponent.textedPhoneNumber = '';
    this.textReplyComponent.sendToType = 'All';
    this.textReplyComponent.sendWhatType = 'Custom';
    this.textReplyModal.show();
  }

  closeTextReply(){
    this.textReplyModal.hide();
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
    let hasFullPrivilege = this.sectionVisibilityRolesMap[sectionName].filter(r => roles.indexOf(r) >= 0).length > 0;

    if (hasFullPrivilege) {
      return true;
    }
    if (roles.includes('MARKETER')) {
      const username = this._global.user.username;
      let salesAgent = Helper.getSalesAgent(this.restaurant.rateSchedules, this.knownUsers);
      return salesAgent === username;
    }
    return false;
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
