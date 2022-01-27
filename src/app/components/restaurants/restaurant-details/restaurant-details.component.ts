/**
 * visibility and editability hierarchy:
 * tabs => sections
 * compbination of role and ownership (agent itself) and timing (eg, +14 days? agent can't see payment means anymore)
 *
 * ADMIN, CSR, CSR_MANAGER => everything
 * agent itself => mostly everything (except sensitive order info)
 * MARKETER => basic profile
 * MARKETER_INTERNAL => basic profile + contacts + logs
 */
import { LanguageType } from '../../../classes/language-type';
import { Component, OnInit, Input, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant, Address, Hour, TimezoneHelper } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { RestaurantProfileComponent } from '../restaurant-profile/restaurant-profile.component';
import { Helper } from '../../../classes/helper';
import { SendMessageComponent } from '../../utilities/send-message/send-message.component';
import {RevisedOnlineServicesAgreement, FirstDelinquentNotice, SecondDelinquentNotice} from './html-message-templates';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { RestaurantSetupEntryComponent } from '../restaurant-setup/restaurant-setup-entry/restaurant-setup-entry.component';
declare var $: any;

@Component({
  selector: 'app-restaurant-details',
  templateUrl: './restaurant-details.component.html',
  styleUrls: ['./restaurant-details.component.css']
})
export class RestaurantDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('restaurantProfile') restaurantProfile: RestaurantProfileComponent;
  @ViewChild('restaurantSetupEntry') restaurantSetupEntry: RestaurantSetupEntryComponent;
  @ViewChild('sendMsgModal') sendMsgModal: ModalComponent;
  @ViewChild('sendMessageComponent') sendMessageComponent: SendMessageComponent;
  languageTypes = [
    { value: LanguageType.ENGLISH, text: "Show English" },
    { value: LanguageType.CHINESE, text: "显示中文" }
  ];
  languageType = this._global.languageType;
  restaurant;

  @Input() id;

  tabs = [];
  activeTab = 'Settings';
  apiRequesting = false;

  readonly = true;

  sectionVisibilityRolesMap = {
    profile: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'MARKETER'],
    contacts: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'MARKETER_INTERNAL'],
    rateSchedules: ['ADMIN', 'RATE_EDITOR'],
    feeSchedules: ['ADMIN', 'RATE_EDITOR', 'MARKETER', 'CSR', 'CSR_MANAGER'],
    paymentMeans: ['ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'MARKETER'],
    serviceSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
    promotions: [],
    qrSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
    closedHours: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
    cloudPrinting: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
    faxSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
    phones: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
    deliverySettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
    webSettings: ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER', 'GMB'],
    restaurantManagedWebSettings: ['ADMIN', 'GMB_SPECIALIST', 'MENU_EDITOR'],
    restaurantChains: ['ADMIN', 'CSR', 'CSR_MANAGER'],
    orderNotifications: ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'MARKETER']
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
    disabledAt: 1,
    disableScheduling: 1,
    diagnostics: 1,
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
    orderNotifications: 1,
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
    hideOrderReadyEstimate: 1,
    disableOrderCancelation: 1, // add a new prperty and it will control whether the restaurant can cancel order.
    notificationExpiry: 1, // this value is needed to decide when shows the broadcast on customer pwa.
    doNotHideUselessMenuItems: 1,
    preventOrdersDuringNonOpenTime: 1,
    menuImages: 1,
    preventOnlineTipIfCash: 1

  };

  showExplanations = false; // a flag to decide whether show English/Chinese translations,and the switch is closed by default.
  googleSearchText; // using redirect google search.
  knownUsers = [];
  // use now time to compared with lastRefreshed to refresh time value
  now = new Date();
  timer;
  refreshDataInterval = 60 * 1000;
  openOrNot = false;
  // use map which is warning data, and the format of the warning data name.
  warningMap = {
    name: 'Name',
    formatted_address: 'Address',
    taxRate: 'Tax Rate',
    serviceSettings: 'Service Settings',
    paymentMeans: 'Payment Mean',
    feeSchedules: 'Fee Schedules',
    qmenuWebsite: 'qMenu Website',
    pickupTimeEstimate: 'Time Estimate for Pickup',
    deliveryTimeEstimate: 'Time Estimate for Delivery',
    deliverySettings: 'Delivery Settings',
    preferredLanguage: 'Preferred Language'
  };
  invoicesCount = 0;
  openDate;
  earliestInvoiceDueDate;

  constructor(private _route: ActivatedRoute, private _router: Router, private _api: ApiService, private _global: GlobalService) {
    const tabVisibilityRolesMap = {
      "Settings": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "GMB": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "Menus": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "Menu Options": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "Coupons": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "Orders": ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "Invoices": ['ADMIN', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER'],
      "Logs": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "IVR": ['ADMIN', 'CSR', 'CSR_MANAGER'],
      "Tasks": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'MARKETER', 'GMB'],
      "Diagnostics": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'MARKETER', 'GMB'],
      "Setup": ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "Others": ['ADMIN', 'MENU_EDITOR', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER', 'MARKETER'] // make a superset and reorder authority in restaurant other page.
    };

    this.tabs = Object.keys(tabVisibilityRolesMap).filter(k => tabVisibilityRolesMap[k].some(r => this._global.user.roles.indexOf(r) >= 0));

    this._route.params.subscribe(
      params => {
        this.id = params['id'];
        this.loadDetails();
      });

    this._global.getCachedUserList().then(users => this.knownUsers = users).catch(console.error);
  }

  getRtInfoMap() {
    let {
      name,
      googleAddress: {
        street_number, route, locality, administrative_area_level_1, postal_code
      }
    } = this.restaurant;
    return {
      "RT_NAME": name,
      "RT_STREET": street_number + " " + route,
      "RT_CITY": locality + ", " + administrative_area_level_1 +  " " + postal_code
    };
  }

  fillMessageTemplate(template, dataset, regex = /\{\{([A-Z_]+)}}/g) {
    return template.replace(regex, (_, p1) => dataset[p1]);
  }

  getOnlineServicesAgreement() {
    let {serviceSettings} = this.restaurant;
    let qMenuCollect = (serviceSettings || []).some(ss => (ss.paymentMethods || []).includes('QMENU'));
    let map = {
      ...this.getRtInfoMap(),
      'OPTION_ONE_CHECK': qMenuCollect ? '&#9744;' : '&#9745;',
      'OPTION_TWO_CHECK': qMenuCollect ? '&#9745;' : '&#9744;'
    };
    return this.fillMessageTemplate(RevisedOnlineServicesAgreement, map);
  }

  async getDelinquentDates() {
    let rtId = this.restaurant._id;
    const [firstOrder] = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      aggregate: [
        {$match: {"restaurant": {$oid: rtId}}},
        {$project: {'createdAt': 1}},
        {$sort: {_id: 1}},
        {$limit: 1},
      ],
    }).toPromise();
    let date = firstOrder ? firstOrder.createdAt : this.restaurant.createdAt;
    this.openDate = new Date(date).toLocaleString('en-US', {timeZone: this.restaurant.googleAddress.timezone});

    // 1. get latest completed invoice date
    const [latestCompleted] = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      aggregate: [
        {$match: {"restaurant.id": rtId, isPaymentCompleted: true}},
        {$project: {'createdAt': 1}}, // project stage go first to make dataset minimum for sorting.
        {$sort: {_id: -1}},
        {$limit: 1}
      ]
    }).toPromise();
    let latestCompletedDate = new Date(0);
    if (latestCompleted) {
      latestCompletedDate = latestCompleted.createdAt;
    }
    // get earliest unpaid invoice date
    const [unpaid] = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      aggregate: [
        {
          $match: {
            "restaurant.id": rtId, isCanceled: {$ne: true},
            createdAt: {$gt: {$date: latestCompletedDate}}
          }
        },
        {$project: {toDate: 1, createdAt: 1}},
        {$sort: {_id: 1}},
        {$limit: 1}
      ]
    }).toPromise();
    if (unpaid) {
      // 10 days from last day of invoice period
      date = new Date(Math.max(new Date(unpaid.toDate).valueOf(), new Date(unpaid.createdAt).valueOf()));
      date.setDate(date.getDate() + 10);
      this.earliestInvoiceDueDate = date.toLocaleString('en-US', {timeZone: this.restaurant.googleAddress.timezone});
    }
  }


  getDelinquentNotice(delinquent) {
    // 7 days from now
    let date = new Date();
    date.setDate(date.getDate() + 7);
    let dataset = {
      ...this.getRtInfoMap(),
      "RT_OPEN_DATE": this.openDate,
      "EARLIEST_UNPAID_INVOICE_DUE_DATE": this.earliestInvoiceDueDate,
      "NOTICE_DUE_DATE": date.toLocaleString('en-US', {timeZone: this.restaurant.googleAddress.timezone})
    };

    return this.fillMessageTemplate(delinquent, dataset);
  }

  get messageTemplates () {
    let templates = {
      'Owner APP': [
        {
          title: "Biz App (Android)",
          subject: "Biz App (Android)",
          smsContent: "https://play.google.com/store/apps/details?id=qmenu.Owner&hl=en_US&gl=US",
          emailContent: "https://play.google.com/store/apps/details?id=qmenu.Owner&hl=en_US&gl=US"
        },
        {
          title: "Biz App (iOS)",
          subject: "Biz App (iOS)",
          smsContent: "https://apps.apple.com/us/app/qmenu-owner/id1476098960",
          emailContent: "https://apps.apple.com/us/app/qmenu-owner/id1476098960"
        },
        {
          title: "Biz App (website)",
          subject: "Biz App (website)",
          smsContent: "https://biz.qmenu.us/#/",
          emailContent: "https://biz.qmenu.us/#/"
        },
        {
          title: "Biz App User Guide (Eng)",
          subject: "Biz App User Guide",
          smsContent: "https://drive.google.com/file/d/1SFsJDVLWP62g0-Sr6bNPwv7dHbG_HFJ6/view?usp=sharing",
          emailContent: "https://drive.google.com/file/d/1SFsJDVLWP62g0-Sr6bNPwv7dHbG_HFJ6/view?usp=sharing"
        },
        {
          title: "Biz App User Guide (中)",
          subject: "Biz App 用户指南",
          smsContent: "https://drive.google.com/file/d/1HbRUtZYEMKQD_lfi7XRRK7DQqhc06MkA/view?usp=sharing",
          emailContent: "https://drive.google.com/file/d/1HbRUtZYEMKQD_lfi7XRRK7DQqhc06MkA/view?usp=sharing"
        }
      ],
      'GMB Notices': [
        {
          title: 'First GMB Notice (中)',
          subject: '谷歌推广明信片',
          smsContent: '你好，这里是QMenu，为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到。在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信，发给我们这个5位数号码 (请注意，此短信不能接受照片)，或者给我们的客服打电话 404-382-9768。多谢！',
          emailContent: '你好，<br/>&nbsp;&nbsp;&nbsp;&nbsp;这里是QMenu，为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到。在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码，或者发短信到 <strong>855-759-2648</strong> 或者给我们的客服打电话 <strong>404-382-9768</strong>。多谢！'
        },
        {
          title: 'First GMB Notice (Eng)',
          subject: 'Google promote postcard',
          smsContent: 'This is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks.',
          emailContent: 'Hi, <br/>&nbsp;&nbsp;&nbsp;&nbsp;This is from QMenu, in order to promote your website on google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at <strong>855-759-2648</strong> or call us at <strong>404-382-9768</strong>.<br/>Thanks.'
        },
        {
          title: 'First GMB Notice (中/Eng)',
          subject: '谷歌推广明信片(Google promote postcard)',
          smsContent: '你好,这里是QMenu, 为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到. 在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片). 或者给我们的客服打电话 404-382-9768. 多谢!\nThis is from QMenu, in order to promote your website on Google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this text message with the 5 digit PIN on the postcard or call us at 404-382-9768. Thanks.',
          emailContent: '你好，<br/>&nbsp;&nbsp;&nbsp;&nbsp;这里是QMenu，为了在谷歌推广您的网站，今天我们申请谷歌给您店里寄去一个明信片，3-5天应该会寄到。在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码，或者发短信到 855-759-2648 或者给我们的客服打电话 404-382-9768。多谢！<br/><br/>&nbsp;&nbsp;&nbsp;&nbsp;Hi,<br/>This is from QMenu, in order to promote your website on google, we just requested a postcard mailed from Google, it may take 3-5 days to arrive. If you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at <strong>855-759-2648</strong> or call us at <strong>404-382-9768</strong>.<br/>Thanks.'
        },
        {
          title: 'Second GMB Notice (中)',
          subject: '谷歌推广明信片',
          smsContent: '你好,这里是QMenu, 为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信, 发给我们这个5位数号码 (请注意，此短信不能接受照片), 或者给我们的客服打电话 404-382-9768. 多谢!',
          emailContent: '你好，<br/>&nbsp;&nbsp;&nbsp;&nbsp;这里是QMenu，为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码，或者发短信到 <strong>855-759-2648</strong> 或者给我们的客服打电话 <strong>404-382-9768</strong>。<br/>多谢！'
        },
        {
          title: 'Second GMB Notice (Eng)',
          subject: 'Google promote postcard',
          smsContent: 'This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard(Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks.',
          emailContent: 'Hi,<br/>&nbsp;&nbsp;&nbsp;&nbsp;This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at <strong>855-759-2648</strong> or call us at <strong>404-382-9768</strong>.<br/>Thanks.'
        },
        {
          title: 'Second GMB Notice (中/Eng)',
          subject: '谷歌推广明信片(Google promote postcard)',
          smsContent: '你好，这里是QMenu，为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请直接回复这个短信，发给我们这个5位数号码 (请注意，此短信不能接受照片)或者给我们的客服打电话 404-382-9768。 多谢！\n          This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this text message with the 5 digit PIN on the postcard (Pls note, this number can not accept picture) or call us at 404-382-9768. Thanks.',
          emailContent: '你好，<br/>&nbsp;&nbsp;&nbsp;&nbsp;这里是QMenu，为了在谷歌推广您的网站，前几天，我们申请谷歌给您店里寄去一个明信片，在明信片上有一个5位数的号码，如果您收到了这个明信片，请回复这个邮件5位数的号码，或者发短信到 <strong>855-759-2648</strong> 或者给我们的客服打电话 <strong>404-382-9768</strong>。<br/>多谢！<br/><br/>Hi,<br/>&nbsp;&nbsp;&nbsp;&nbsp;This is from QMenu, in order to promote your website on google, we requested a postcard mailed from Google several days ago, if you receive this postcard, please reply this email with the 5 digit PIN on the postcard, text us at <strong>855-759-2648</strong>, or call us at <strong>404-382-9768</strong>.<br/>Thanks.'
        }
      ],
      'QR Dine-in': [
        {
          title: 'QR Biz link',
          subject: 'QR Biz link',
          smsContent: 'http://qrbiz.qmenu.com',
          emailContent: 'http://qrbiz.qmenu.com'
        },
        {
          title: 'QR promo vid (中)',
          subject: '堂吃扫码点餐优势展示',
          smsContent: '从qMenu堂吃扫码点餐过程互动性充分体验其中优势：https://www.youtube.com/watch?v=HosHBDOXKnw',
          emailContent: '从qMenu堂吃扫码点餐过程互动性充分体验其中优势：https://www.youtube.com/watch?v=HosHBDOXKnw'
        },
        {
          title: 'QR promo vid (Eng)',
          subject: 'QR dine-in benefit',
          smsContent: 'See how your restaurant would benefit from qMenu\'s interactive QR dine-in system: https://www.youtube.com/watch?v=_YL2LGE6joM',
          emailContent: 'See how your restaurant would benefit from qMenu\'s interactive QR dine-in system: https://www.youtube.com/watch?v=_YL2LGE6joM'
        },
        {
          title: 'QR tutorial vid (中)',
          subject: '堂吃扫码点餐教学视频',
          smsContent: '了解如何使用 qMenu 的交互式堂吃扫码点餐系统，包括初始设置：https://youtube.com/playlist?list=PLfftwXwWGQGayoLhjrj6Cocqq87eiBgAn',
          emailContent: '了解如何使用 qMenu 的交互式堂吃扫码点餐系统，包括初始设置：https://youtube.com/playlist?list=PLfftwXwWGQGayoLhjrj6Cocqq87eiBgAn'
        },
        {
          title: 'QR tutorial vid (Eng)',
          subject: 'QR dine-in tutorial video',
          smsContent: 'Learn how to use qMenu’s interactive QR dine-in system, including initial setup: https://youtube.com/playlist?list=PLfftwXwWGQGbTgG0g8L612iahVJN6ip7l',
          emailContent: 'Learn how to use qMenu’s interactive QR dine-in system, including initial setup: https://youtube.com/playlist?list=PLfftwXwWGQGbTgG0g8L612iahVJN6ip7l'
        },
        {
          title: '5x7 Signholder link',
          subject: '5x7 Signholder link',
          smsContent: 'https://www.amazon.com/Double-Sided-Picture-Frame-5x7/dp/B07MNXRM29',
          emailContent: 'https://www.amazon.com/Double-Sided-Picture-Frame-5x7/dp/B07MNXRM29'
        },
        {
          title: 'QR promo pamphlet (Eng)',
          subject: 'QR promo pamphlet',
          smsContent: 'Take a look at all qMenu\'s QR dine-in system has to offer: https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/5936605.html',
          emailContent: 'Take a look at all qMenu\'s QR dine-in system has to offer: https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/5936605.html'
        },
        {
          title: 'QR promo pamphlet (中)',
          subject: '扫码点餐宣传手册',
          smsContent: '看看 qMenu 的扫码点餐系统提供的所有好处：https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/6204156.html',
          emailContent: '看看 qMenu 的扫码点餐系统提供的所有好处：https://pro-bee-beepro-messages.s3.amazonaws.com/474626/454906/1210649/6204156.html'
        },
      ],
    };
    if (this.restaurant) {
      templates["Other"] = [];
      if (this.openDate) {
        templates["Other"].push({
          title: "qMenu Online Service Agreement",
          subject: "qMenu Online Service Agreement",
          inputs: [
            {
              label: "Signature", value: '',
              apply: (tpl, value) => this.fillMessageTemplate(tpl, {"SIGNATURE": value}, /%%(SIGNATURE)%%/g)
            },
            {
              label: "Full Name", value: '',
              apply: (tpl, value) => this.fillMessageTemplate(tpl, {"FULL_NAME": value}, /%%(FULL_NAME)%%/g)
            },
            {
              label: "Title", value: '',
              apply: (tpl, value) => this.fillMessageTemplate(tpl, {"POSITION": value}, /%%(POSITION)%%/g)
            }
          ],
          emailContent: this.getOnlineServicesAgreement()
        });
      }
      if (this.earliestInvoiceDueDate) {
        templates['Other'].push({
            title: "First Delinquent Notice",
            subject: "First Delinquent Notice",
            emailContent: this.getDelinquentNotice(FirstDelinquentNotice)
          },
          {
            title: "Second Delinquent Message",
            subject: "Second Delinquent Message",
            inputs: [
              {
                label: "First Delinquent Notice Sent on", type: 'date', value: '',
                apply: (tpl, value) => {
                  value = new Date(value).toLocaleString('en-US', {timeZone: this.restaurant.googleAddress.timezone});
                  return this.fillMessageTemplate(tpl, {"FIRST_DELINQUENT_NOTICE_SENT_ON": value}, /%%([A-Z_]+)%%/g);
                }
              },
            ],
            emailContent: this.getDelinquentNotice(SecondDelinquentNotice)
          });
      }
    }
    return templates;
  }

  ngOnInit() {
    this.activeTab = this._global.storeGet('restaurantDetailsTab') || 'Settings';
  }
  // show checkmark or x on gmb tab to indicate the restaurant has gmb or not
  hasGMBAtPresent() {
    if (this.restaurant.gmbOwnerHistory && this.restaurant.gmbOwnerHistory.length > 0) {
      this.restaurant.gmbOwnerHistory.sort((a, b) => new Date(b.time).valueOf() - new Date(a.time).valueOf());
      return this.restaurant.gmbOwnerHistory[0].gmbOwner === 'qmenu';
    } else {
      return false;
    }
  }
  // show count of invoices of invoices tab
  async getInvoicesCountOfRT() {
    const [count] = await this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "invoice",
        aggregate: [
          { $match: { "restaurant.id": this.restaurant._id } },
          { $count: "total" }
        ]
      }).toPromise();
    this.invoicesCount = count ? count.total : 0;
  }

  ngOnDestroy() {
    this._global.storeSet('restaurantDetailsTab', this.activeTab);
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  updateRestaurant(rt) {
    this.restaurant = new Restaurant(rt);
  }

  async diagnose() {
    try {
      await this._api.post(environment.appApiUrl + 'utils/diagnose-restaurant', { _id: this.restaurant._id }).toPromise();
      this.populateRTDiagnostics();
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error');
    }
  }

  async populateRTDiagnostics() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.restaurant.id || this.restaurant['_id'] }
      },
      projection: {
        diagnostics: 1
      },
      limit: 1
    }).toPromise();
    this.restaurant.diagnostics = (restaurants[0] || {}).diagnostics; // first restaurant
    this.getWarningData();
  }

  getWarningData() {
    if (this.restaurant.diagnostics && this.restaurant.diagnostics.length > 0) {
      let missing = [];
      this.restaurant.diagnostics.sort((a, b) => new Date(b.time).valueOf() - new Date(a.time).valueOf());
      let lastDiagnostic = this.restaurant.diagnostics[0] || {};
      lastDiagnostic.result.filter(r => r.name === 'restaurant' || r.name === 'web').forEach(r => {
        (r.errors || []).forEach(error => {
          Object.keys(this.warningMap).forEach(key => {
            if (error.indexOf(key) !== -1 && this.isMissingError(error) && missing.indexOf(this.warningMap[key]) === -1) {
              missing.push(this.warningMap[key]);
            }
          });
        });
      });
      if (missing.length > 0) {
        return 'MISSING: ' + missing.join(', ');
      }
    }
  }

  isMissingError(error) {
    return ['should NOT have fewer than 1 items',
      'should have required property',
      'it is missing',
      'should NOT be shorter than 1 characters'].some(errMsg => error.indexOf(errMsg) >= 0);
  }

  // filter the biz of restaurant's contacts to show on rt portal
  getBizContacts() {
    return (this.restaurant.channels || []).filter(channel => channel.type === 'Phone' && (channel.notifications || []).includes('Business')).map(c => c.value).join(', ');
  }

  async reload(callback: (rt: Restaurant) => any) {
    const query = { _id: { $oid: this.id } };
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
        if (callback) {
          callback(this.restaurant);
        }
      }, error => {
        this._global.publishAlert(AlertType.Danger, error);
      }
    );
  }

  valueVisible() {
    return ['CSR', 'CSR_MANAGER', 'ADMIN', 'GMB_SPECIALIST'].some(role => this._global.user.roles.includes(role));
  }

  displayValue(rt) {
    if (['GMB_SPECIALIST', 'ADMIN'].some(role => this._global.user.roles.includes(role))) {
      return (rt.score || 0).toFixed(1);
    }
    if (!rt.score) {
      return 'No Score';
    } else if (rt.score >= 0 && rt.score < 3) {
      return 'Low';
    } else if (rt.score >= 3 && rt.score < 6) {
      return 'Medium';
    } else {
      return 'High';
    }
  }

  // select html element change invoke it , and its function is change restaurant profile field into Chinese or English
  changeLanguage() {
    if (this.languageType === LanguageType.ENGLISH) {
      this._global.languageType = LanguageType.ENGLISH;
    } else if (this.languageType === LanguageType.CHINESE) {
      this._global.languageType = LanguageType.CHINESE;
    }
    // restaurantProfile may be hided
    if(this.restaurantProfile){
      this.restaurantProfile.changeLanguageFlag = this._global.languageType;
    }
    // restaurantSetupEntry may be hided
    if(this.restaurantSetupEntry){
      this.restaurantSetupEntry.changeLanguageFlag = this._global.languageType;
      [this.restaurantSetupEntry.basicPanel, this.restaurantSetupEntry.menuPanel, this.restaurantSetupEntry.hoursPanel, this.restaurantSetupEntry.contactPanel, this.restaurantSetupEntry.deliveryPanel, this.restaurantSetupEntry.paymentPanel, this.restaurantSetupEntry.invoicingPanel].forEach(panel=>{
        if(panel){
          panel.changeLanguageFlag = this.restaurantSetupEntry.changeLanguageFlag;
        }
      });
    }
  }

  // if the switch is open,we show i button and show Chinese and English explanations
  toggleShowExplanations() {
    if (this.showExplanations) {
      this.restaurantProfile.showExplanationsIcon = this._global.showExplanationsIcon = true;
    } else {
      this.restaurantProfile.showExplanationsIcon = this._global.showExplanationsIcon = false;
    }
  }

  refreshTime() {
    // judge whether open
    // 1. by menu hours
    let flag = false;
    for (let i = 0; i < (this.restaurant.menus || []).length; i++) {
      const menu = (this.restaurant.menus || [])[i];
      if ((menu.hours || []).some(hour => hour.isOpenAtTime(this.now, this.restaurant.googleAddress.timezone))) {
        flag = true;
        break;
      }
    }
    // 2. by restaurant closed hours
    let closedHours = (this.restaurant.closedHours || []).filter(hour => !(hour.toTime && this.now > hour.toTime));

    if (closedHours.some(hour => {
      let nowTime = TimezoneHelper.getTimezoneDateFromBrowserDate(this.now, this.restaurant.googleAddress.timezone);
      return nowTime >= hour.fromTime && nowTime <= hour.toTime;
    })) {
      flag = false;
    }

    if (flag) {
      this.openOrNot = true;
    }
    this.now = new Date();
  }

  async loadDetails() {
    this.readonly = true;

    if (this.id) {
      this.apiRequesting = true;
      const query = { _id: { $oid: this.id } };

      this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: query,
        projection: this.projections,
        limit: 1
      }).subscribe(
        results => {
          this.apiRequesting = false;
          const rt = results[0];
          this.restaurant = rt ? new Restaurant(rt) : undefined;
          if (!this.restaurant) {
            return this._global.publishAlert(AlertType.Danger, 'Not found or not accessible');
          }
          (rt.gmbOwnerHistory || []).reverse();
          (rt.menus || []).map(menu => (menu.mcs || []).map(mc => mc.mis = (mc.mis || []).filter(mi => mi && mi.name)));
          const canEdit = this._global.user.roles.some(r =>
            ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'ACCOUNTANT'].indexOf(r) >= 0) ||
            (rt.rateSchedules).some(rs => rs.agent === 'invalid') ||
            (rt.rateSchedules || []).some(rs => rs.agent === this._global.user.username);
          this.readonly = !canEdit;
          // use encodeURLComponment to reformat the href of a link.
          // https://www.google.com/search?q={{restaurant.name}} {{restaurant.googleAddress.formatted_address}}
          let formatted_address = this.restaurant.googleAddress.formatted_address || '';
          let name = this.restaurant.name || '';
          this.googleSearchText = "https://www.google.com/search?q=" + encodeURIComponent(name + " " + formatted_address);
          // set timer of rt portal
          this.refreshTime();
          this.timer = setInterval(() => this.refreshTime(), this.refreshDataInterval);
          // count of invoices of restaurant if user can see invoice tab
          if (this.tabs.includes('Invoices')) {
            this.getInvoicesCountOfRT();
          }
          this.getDelinquentDates();
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

  get channels(): any[] {
    if (this.restaurant && this.restaurant.channels) {
      return this.restaurant.channels.filter(ch => ['SMS', 'Email'].includes(ch.type));
    }
    return [];
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
    // TEMP emergent fix: MARKETER can see their own contacts! THIS IS TEMP AND SHOULD BE REMOVED once main logic is fixed
    if (sectionName === 'contacts' && roles.includes('MARKETER')) {
      return true;
    }
    // marketer should can view rateSchedules in rts under his agent
    if (sectionName === 'rateSchedules' && roles.includes('MARKETER')) {
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
        roles: ['ADMIN', 'CSR', 'CSR_MANAGER']
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
