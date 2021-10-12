import { Component, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { Address, TimezoneHelper } from '@qmenu/ui';
import { Helper } from '../../../classes/helper';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { PrunedPatchService } from '../../../services/prunedPatch.service';
import { environment } from '../../../../environments/environment';
import { AlertType } from '../../../classes/alert-type';
import { HttpClient } from '@angular/common/http';
import { formatNumber } from '@angular/common';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

@Component({
  selector: 'app-restaurant-profile',
  templateUrl: './restaurant-profile.component.html',
  styleUrls: ['./restaurant-profile.component.css']
})
export class RestaurantProfileComponent implements OnInit, OnChanges {
  @Input() restaurant;
  @Input() editable;
  @Input() users = [];
  uploadImageError: string;
  editing: boolean = false;
  address: Address;
  apt: string;
  ifShowBasicInformation: boolean = true; //using stretching transformation at  the restaurant profile setting edit page
  ifShowPreferences: boolean = false;
  ifShowFee_MinimumSettings: boolean = false;
  isShowTipSettings: boolean = false;
  ifShowOtherPreferences: boolean = false;
  fields = [
    'name',
    'email',
    'taxRate',
    'surchargeAmount',
    'surchargeRate',
    'surchargeName',
    'pickupTimeEstimate',
    'deliveryTimeEstimate',
    'logo',
    'googleAddress',
    'restaurantId',
    'images',
    'stripeSecretKey',
    'stripePublishableKey',
    'preferredLanguage',
    'pickupMinimum',
    'ccMinimumCharge',
    'disableScheduling',
    'disabled',
    'disabledAt',
    'notification',
    'ccProcessingRate',
    'ccProcessingFlatFee',
    'deliveryBy',
    'domain',
    'skipOrderConfirmation',
    'skipAutoInvoicing',
    'skipImageInjection',
    'hideOrderStatus',
    'hidePrintingCCInfo',
    'disableOrderCancelation', //add a new prperty and it will control whether the restaurant can cancel order.
    'hideOrderReadyEstimate',
    'skipShowTax',
    'menuHoursExtended',
    'notes',
    'insistedPrintCCInfo',
    'comebackDate',
    'serviceSettings',
    "doNotHideUselessMenuItems",
    "notificationExpiry",
  ];
  controlExpiry = false; // a flag to contorl broadcast expiry date input showing or not.
  notificationExpiry: string; // this value is needed to decide when shows the broadcast on customer pwa.
  uploadError: string;

  tipSettings = {
    ['Dine-in']: {
      defaultPercentage: undefined,
      defaultAmount: undefined,
      minimumPercentage: undefined,
      minimumAmount: undefined,
      tipHide: false
    },
    'Pickup': {
      defaultPercentage: undefined,
      defaultAmount: undefined,
      minimumPercentage: undefined,
      minimumAmount: undefined,
      tipHide: false
    },
    'Delivery': {
      defaultPercentage: undefined,
      defaultAmount: undefined,
      minimumPercentage: undefined,
      minimumAmount: undefined,
      tipHide: false
    }
  };

  email: string;
  taxRate: number;
  surchargeName;
  surchargeAmount;
  pickupTimeEstimate: number;
  deliveryTimeEstimate: number;
  pickupMinimum: number;
  ccMinimumCharge: number;
  logo: string;
  images: string[] = [];

  ccProcessingRate: number;
  ccProcessingFlatFee: number;
  disableScheduling = false;
  disabled = false;
  googleAddress: Address;
  preferredLanguage;
  selfSignupRegistered;
  notification;
  showExplanationsIcon = this._global.showExplanationsIcon; //  a flag to decide whether show English/Chinese translations icon and the icon will toggle show explanations when focus in it.
  translating = '';
  Explanations = {
    ChineseExplanations:{
      "Name":"餐馆的名字",
      "Address":"餐厅地址（现在必须从经过Google验证的地址列表中选择）",
      "AddressExtra":"可以在此处记录主“地址”字段未捕获的任何额外地址信息，如公寓或套房号码",
      "ID":"餐馆的身份标识",
      "Alias":"",
      "TimeZone":"你必须记得查看餐厅的时区并正确设置！直接在Google上搜索 “[city], [state] time zone” 或 “[zip code] time zone”。",
      "TaxRate":"餐厅的当地税率。 如果餐厅不知道他们的税率，您可以在谷歌上查找它们。",
      "SalesAgent":"销售人员",
      "Disabled":"取消合作的餐馆。（选中此框将禁用客户为餐厅下达的任何未来订单）。当一家餐馆被禁用时，这也会告诉我们的系统即使在所有权受到攻击时也不会产生专线小组转移任务，因为我们的GMB小组团队努力维持一个不再与我们合作的餐馆的GMB列表是不值得的。",
      "TimeEstimateforPickup":"准备拿餐订单时间估算（分钟）",
      "TimeEstimateforDelivery":"准备外送订单时间估算（分钟）",
      "PreferredLanguage":"座机接受订单确认电话的语言。",
      "WebsiteBroadcast":"小喇叭广播。用于餐馆温馨提示客人与餐馆相关的一些重要信息。此广播将显示在餐馆的订购网站上。",
      "Surcharge":"在线订购的附加费（固定金额）",
      "SurchargeRate":"在线订购的附加费（百分比）",
      "CCProcessingRate":"一些餐馆收取信用卡金额的一定百分比作为处理付款的费用。",
      "CCProcessingFlatFee":"部分餐厅收取固定费用以处理信用卡交易，如1美元。 鼓励餐厅尽可能不收取此类费用，因为它可能会阻止客户。",
      "PickupMinimum":"拿餐最低subtotal的消费金额",
      "CCMinimumCharge":"信用卡最低消费金额",
      "DefaultPercentage":"小费默认百分比选项（如果小费默认金额更严格就金额优先）",
      "MinimumPercentage":"小费最低百分比（如果小费最低金额更严格就金额优先）",
      "DefaultAmount":"小费默认金额选项（如果小费默认百分比更严格就百分比优先）",
      "MinimumAmount":"小费最低金额（如果小费最低百分比更严格就百分比优先）",
      "ShowTip":"不显示小费（并且不允许客人在下单时给小费）",
      "RegisterSelfSignup":"自动加入餐厅如果点击此复选框后就表示已经完成加入，不会在https://csr.qmenu.us/#/seamless-integration 出现了",
      "Notes":"备注。有关餐厅的任何额外的非结构化数据，没有其他现有专用字段输入信息。",
      "HideOrderStatusonCustomerSide":"在客人页面隐藏订单实时跟进状态",
      "SkipOrderConfirmation":"跳过确认。如果选择此选项，此餐厅的未确认订单将不会出现在Qmenu CSR Portal主页上的“未确认订单”列表中（换句话说，餐厅不希望确认他们获得的每个订单，也不会 希望收到我们的提醒。）",
      "SkipAutoInvoicing":"我们默认给所有餐馆自动做账，但勾选这个选项就代表手动做账",
      "NotShowTaxOptiontoCustomer":"不显示税项",
      "SkipImageInject":"如果没有勾选此选项的话，我们将自动插入菜单图片",
      "Allowsubmittingorderatclosetime":"允许客人在餐馆关门之前任何时刻下订单，而不根据餐馆的预计准备时间限制在餐馆最后几十分钟不让下单",
      "HideprintingCC":"隐藏订单上的云打印或传真的信用卡信息",
      "PreventRTfromcancelingorders":"不允许餐馆自己取消订单",
      "Showorderreadyestimate":"给客人看订单预计预计准备时间信息",
      "Domain":"标注:“域”字段不再位于“配置文件”部分下，因为现在，所有与网站相关的信息都已移至此处。",
      "DisableOrderingAhead":"如果选中此复选框，就不能产生预订单。",
      "Logo":"（菜单编辑会处理这个问题，CSR+销售人员可以忽略）：这里上传的任何徽标都会出现在餐厅的qMenu订购网站的这两个地方。",
      "Photos":"(菜单编辑负责这一点，客服+销售可以忽略) 此处上传的图片将是餐厅qMenu订购网站上的网站背景图片。",
      "DoNotHideUselessMenuItems": "默认情况下，在客户APP上，在每个菜单类别中，我们将显示按订购频率排序的菜单项，并隐藏以前从未订购过的菜单项。 可以关闭此设置以简单地按原始顺序显示所有菜单项。",
      "TipSettings": "如果餐厅级别未指定小费设置，pickup和dine-in的系统小费默认值为 15%，delivery默认值为20%。 无论如何，小费不能超过 1000 美元或 100% 的最大值",
      "qMenuWebsite": "qMenu 网站"
    },
    EnglishExplanations:{
      "Name":"Name of restaurant",
      "Address":"Address of restaurant (this must now be selected from a list of Google-validated addresses).",
      "AddressExtra":"Any extra address information, like apartment or suite number, that isn’t captured by the main “Address” field can be recorded here.",
      "ID":"ID of restaurant",
      "Alias":"",
      "TimeZone":"You must remember to look up the time zone of the restaurant and set it properly! Simply search for “[city], [state] time zone” or “[zip code] time zone” on Google.",
      "TaxRate":"The restaurant’s local tax rate. If the restaurant doesn’t know their tax rate, you can look it up on Google for them.",
      "SalesAgent":"The name of the sales agent responsible for convincing the restaurant to join Qmenu.",
      "Disabled":"Checkbox to disable the restaurant and stop any further activities. Use with caution! (For instance, if the restaurant goes out of business or stops working with qMenu, checking this box will disable any future orders from being placed by customers for the restaurant). When a restaurant is disabled, this will also tell our system to not generate GMB transfer tasks even when the ownership is attacked, since it’s not worth our GMB team’s efforts to maintain a GMB listing of a restaurant that won’t work with us anymore anyway.",
      "TimeEstimateforPickup":"Estimated amount of time it takes the restaurant to prepare a pickup order (in minutes)",
      "TimeEstimateforDelivery":"Estimated amount of time it takes the restaurant to prepare and deliver a delivery order (in minutes):",
      "PreferredLanguage":"Determines the language to use for robo-calls to notify restaurant of new incoming orders (English or Chinese).",
      "WebsiteBroadcast":"This broadcast will be displayed on the restaurant’s ordering site. If the restaurant asks you to add a message to customers that will appear on the website, this is where you should add that content. For example, in the image below, the restaurant wants to warn customers that they must present a valid ID matching the credit card they intend to use to purchase the food.",
      "Surcharge":"Extra flat fee for ordering online. Encourage the restaurant not to charge such a fee if possible as it may deter customers. (Text to show customer: what to show customers to explain this fee, usually something like “Service Fee”).",
      "SurchargeRate":"Extra percentage fee for ordering online. Encourage the restaurant not to charge such a fee if possible as it may deter customers.",
      "CCProcessingRate":"Percentage fee charged by the restaurant on orders where customers pay with credit card. Not recommended, may deter customers.",
      "CCProcessingFlatFee":"Flat fee charged by the restaurant on orders where customers pay with credit card. Not recommended, may deter customers.",
      "PickupMinimum":"Minimum order amount for pickup orders",
      "CCMinimumCharge":"Minimum order amount for a customer to be allowed to pay by credit card",
      "DefaultPercentage":"Default tip percentage pre-selected on checkout page (the stricter of this attribute and the default tip amount attribute will take precedence)",
      "MinimumPercentage":"Minimum required tip percentage",
      "DefaultAmount":"Default tip amount pre-selected on checkout page (the stricter of this attribute and the default tip percentage attribute will take precedence)",
      "MinimumAmount":"Minimum required tip amount",
      "ShowTip":"On/off switch to show or hide tip section on checkout page. On by default, but some restaurants prefer customers to give cash tips separately and thus don't want to show tip option online.",
      "RegisterSelf-Signup":"For self-signup restaurants (those registering through signup.qmenu.com), checking this box takes them off the https://csr.qmenu.us/#/seamless-integration list.",
      "Notes":"Any extra unstructured data about the restaurant for which there is no other dedicated field to store that information.",
      "HideOrderStatusonCustomerSide":"",
      "SkipOrderConfirmation":"If this option is selected, unconfirmed orders for this restaurant will not appear in the “Unconfirmed Orders” dashboard on the Qmenu CSR Portal home page. This means the restaurant doesn’t want to have to confirm each order they get and does not want to receive reminders from us to do so.",
      "SkipAutoInvoicing":"",
      "NotShowTaxOptiontoCustomer":"",
      "SkipImageInject":"",
      "Allowsubmittingorderatclosetime":"If turned on, a customer will be allowed to submit an order right up until the moment the restaurant closes. Usually, if the restaurant closed at 4pm for example, and TimeEstimateforPickup was 20 minutes, the customer would only be able to sumbit an order at 3:40pm (20 mins before closing) at the latest.",
      "HideprintingCC":"",
      "PreventRTfromcancelingorders":"Hide the order cancellation button on the biz portal. Some restaurants from whom we are attempting to recoup cash due to unpaid invoices and for which we have set order payment collection method to Qmenu Collect, purposely cancel orders to avoid us recouping those unpaid funds.",
      "Showorderreadyestimate":"If turned on, the order ready time estimate will be shown to the customer",
      "Domain":" NOTE: The “Domain” field is no longer under the “Profile” section, because now, all website-related information has been moved here.", // Editable field.
      "DisableOrderingAhead":"If turned on, customers won't be able to schedule orders for future point in time ahead of time.",
      "Logo":" (Menu editors take care of this, CSR + sales can ignore): Any logo uploaded here will appear in these two places on the qMenu ordering site for the restaurant: 1. The qmenu.us/alias page of the restaurant, 2. ...",
      "Photos":" (Menu editors take care of this, CSR + sales can ignore): Image uploaded here will appear as the website background image on the qMenu ordering site for the restaurant.",
      "DoNotHideUselessMenuItems": "By default, on the customer app, in each menu category, we will show menu items sorted by ordering frequency, and hide menu items that have never been ordered before. This setting can be turned off to simply show all menu items in their original order.",
      "TipSettings": "If tip settings are not specified at restaurant level, system default tip will be 15% for pickup and dine-in, and 20% for delivery. Tips cannot exceed the maximum of $1000 or 100%.",
      "qMenuWebsite": "The URL for this website's restaurant managed by qMenu",
    }
  }

  changeLanguageFlag = this._global.languageType;
  preferredLanguages = [
    { value: 'ENGLISH', text: 'English' },
    { value: 'CHINESE', text: 'Chinese' }
  ];
  Languages = { ENGLISH: 'English', CHINESE: 'Chinese' };

  comebackDate = null;
  isComebackDateCorrectlySet = false;
  isTemporarilyDisabled;
  now = new Date().toISOString().split('T')[0];
  // an object to control whether show percent waring message
  percentValidationMap = {
    'taxRate': 0.2,
    'ccProcessingRate': 0.05,
    'surchargeRate': 0.1
  }
  @ViewChild('previewWebsiteModal') previewWebsiteModal:ModalComponent;

  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient, private _prunedPatch: PrunedPatchService) {
  }

  ngOnInit() {
    if(!this.restaurant.preferredLanguage){
      this.preferredLanguages.unshift({
        value: "",
        text: ""
      });
    }
    this.selfSignupRegistered = this.restaurant.selfSignup && this.restaurant.selfSignup.registered;

    if (this.restaurant.disabled && this.restaurant['comebackDate'] === undefined) {
      this.isTemporarilyDisabled = 'No';
    } else if (this.restaurant.disabled && (this.restaurant['comebackDate'] === null || this.isDate(this.restaurant['comebackDate']))) {
      this.isTemporarilyDisabled = 'Yes';
    }
    this.tipSettingsInit();
  }
   // when q-toggle is checked, the notificationExpiry should be setted null
  toggleNotificationExpiry(){
    if(!this.controlExpiry){
      this.notificationExpiry = null;
    }
  }

  // a small function we can preview website when we edit it.
  previewWebsite(){
    this.previewWebsiteModal.show();
  }

  // Show the corresponding translation of restaurant profile field.
  showCorrespondingTranslation(field){
    this.translating = field;
  }

  isDate(dateToParse) {
    return !isNaN(Date.parse(dateToParse));
  }

  isDisabledEditable() {
    return this._global.user.roles.some(r => r === 'ADMIN' || r === 'ACCOUNTANT');
  }

  ngOnChanges(params) {
    // console.log(params);
  }

  async selectAddress(address) {
    this.googleAddress = address;
    const addressDetails = await this._api.get(environment.qmenuApiUrl + 'utils/google-address', {
      formatted_address: address.formatted_address
    }).toPromise();
    this.googleAddress.timezone = addressDetails.timezone;
  }

  getMongoDate(mongoId) {
    return new Date(parseInt(mongoId.substring(0, 8), 16) * 1000);
  }

  getSalesAgent() {
    return Helper.getSalesAgent(this.restaurant.rateSchedules, this.users);
  }

  toggleEditing() {
    this.address = new Address(this.restaurant.googleAddress);
    this.selfSignupRegistered = this.restaurant.selfSignup && this.restaurant.selfSignup.registered;
    this.editing = !this.editing;
    this.fields.map(field => this[field] = this.restaurant[field]);
    this.apt = this.restaurant.googleAddress ? this.restaurant.googleAddress.apt : '';
    this.tipSettingsInit();
    if (this.comebackDate !== undefined) {
      this.comebackDate = this.comebackDate === null ? null : new Date(this.comebackDate) && new Date(this.comebackDate).toISOString().split('T')[0];
    }

    if (this.comebackDate === undefined) {
      this.isTemporarilyDisabled = 'No';
    }

    // special fields
    this.images = this.restaurant.images || [];
    this.preferredLanguage = this.preferredLanguages.filter(z => z.value === (this.restaurant.preferredLanguage))[0];

    // website broadcast expiration field
    // 2021-07-15T04:00:00.000Z
    if(this.restaurant.notificationExpiry){
      this.controlExpiry = true; // contorls whether the switch is turned on
      if(typeof this.restaurant.notificationExpiry === "string"){ // when this.restaurant.notificationExpiry comes from api call, it is data type of string
        this.notificationExpiry = this.restaurant.notificationExpiry.split('T')[0];
      }else{ // this.restaurant.notificationExpiry is type of date
        this.notificationExpiry = this.restaurant.notificationExpiry.toISOString().split('T')[0];
      }
    }else{
      this.controlExpiry = false;
    }
  }

  isEmailValid() {
    return !this.email || this.email.match(/\S+@\S+\.\S+/);
  }

  formatAmount(value) {
    if (typeof value !== 'number') {
      return '';
    }
    return value.toFixed(2);
  }

  tipSettingsInit() {
    ['Pickup', 'Delivery', 'Dine-in'].forEach(type => {
      const setting = (this.restaurant.serviceSettings || []).find(x => x.name === type) || {
        name: type,
        paymentMethods: [],
        tipSuggestion: {},
        tipMinimum: {}
      };
      const { tipSuggestion, tipMinimum, tipHide = false } = setting;
      if (tipSuggestion) {
        this.tipSettings[type].defaultPercentage = tipSuggestion.rate;
        this.tipSettings[type].defaultAmount = tipSuggestion.amount;
      }
      if (tipMinimum) {
        this.tipSettings[type].minimumPercentage = tipMinimum.rate;
        this.tipSettings[type].minimumAmount = tipMinimum.amount;
      }
      this.tipSettings[type].tipHide = tipHide;
    });
  }

  toggleTipHide(type, target) {
    this.tipSettings[type]['tipHide'] = !target.checked;
  }

  updateTipSettings(type, key, target) {
    let value = target.value;

    if (value === '') {
      this.tipSettings[type][key] = null;
      return;
    }

    if (key.indexOf('Percentage') >= 0) {
      // percentage have four decimal digits and range in 0-1
      value = Math.min(1, Math.max(0, value));
      target.value = formatNumber(value, 'en_US', '1.0-4');
    }
    if (key.indexOf('Amount') >= 0) {
      // amount have two decimal digit and range in 0-1000
      value = Math.min(1000, Math.max(0, value));
      // we must visibly set input's value here
      // because if user input overflow number multiple times,
      // we save the same maximum value and to angular the value is not changed,
      // so it won't change input's value, that'll cause input show overflow value
      target.value = this.formatAmount(value);
    }
    this.tipSettings[type][key] = value;
  }

  normalizeNumber(value, percent = false) {
    if (typeof value !== 'number') {
      return null;
    }
    return Number(value.toFixed(percent ? 4 : 2));
  }

  displayWebsiteForMarketing() {
    return this._global.user.roles.includes('MARKETER') && !this.editable;
  }

  /**
  *show the warning text: "*** WARNING! Are you sure [PERCENTAGE]% is the correct value? ***"
  *if someone enter an incorrect percentage value 
  */
  isRateInvalid(rateType,rateValue){
    return rateValue > this.percentValidationMap[rateType];
  }

  ok() {
    const oldObj = { _id: this.restaurant['_id'] } as any;
    const newObj = { _id: this.restaurant['_id'] } as any;
    this.fields.map(field => {
      oldObj[field] = this.restaurant[field];
      newObj[field] = this[field];
    });

    if (this.isTemporarilyDisabled === 'Yes') {
      newObj.comebackDate = newObj.comebackDate === null ? null : new Date(newObj.comebackDate);
    }

    if (this.isTemporarilyDisabled === 'No') {
      delete newObj.comebackDate;
    }

    // tip settings
    newObj.serviceSettings = ['Pickup', 'Delivery', 'Dine-in'].map(type => {
      const setting = this.restaurant.serviceSettings && this.restaurant.serviceSettings.find(x => x.name === type) || { name: type };
      const tip = this.tipSettings[type];
      const newTipSuggestion = {
        amount: this.normalizeNumber(tip.defaultAmount),
        rate: this.normalizeNumber(tip.defaultPercentage, true)
      };
      const newTipMinimum = {
        amount: this.normalizeNumber(tip.minimumAmount),
        rate: this.normalizeNumber(tip.minimumPercentage, true)
      };

      const { tipSuggestion, tipMinimum, tipHide, ...rest } = setting;
      return { ...rest, tipSuggestion: newTipSuggestion, tipMinimum: newTipMinimum, tipHide: tip.tipHide };
    });

    // make sure types are correct!
    // can not use isNaN because isNaN(null) is false
    if(this.taxRate < 0){
      return this._global.publishAlert(AlertType.Danger,"Please don't enter a negative number!");
    }else{
      newObj.taxRate = this.taxRate === 0 ? 0 : !this.taxRate ? undefined : this.taxRate > 1 ? 1 : this.taxRate;
    }
    newObj.surchargeAmount = +this.surchargeAmount || undefined;
    newObj.pickupTimeEstimate = +this.pickupTimeEstimate || undefined;
    newObj.deliveryTimeEstimate = +this.deliveryTimeEstimate || undefined;
    newObj.pickupMinimum = +this.pickupMinimum || undefined;
    newObj.ccMinimumCharge = +this.ccMinimumCharge || undefined;

    if (this.googleAddress) {
      newObj.googleAddress = JSON.parse(JSON.stringify(this.googleAddress));
      newObj.googleAddress.apt = this.apt;
    }

    if (!this.disabled) {
      delete newObj.comebackDate;
      delete newObj.disabledAt;
    } else {
      // if from enabled to disabled, update disabledAt field
      if (!oldObj.disabled) {
        newObj.disabledAt = new Date();
      }
    }

    newObj.preferredLanguage = (this.preferredLanguage && this.preferredLanguage.value) || undefined;
    if(!newObj.preferredLanguage){
      return this._global.publishAlert(AlertType.Danger,"Please select a standard language(请选择餐馆的标准语言)!");
    }
    // update those two fields!
    newObj.images = this.images;
    delete oldObj['images'];

    if (this.selfSignupRegistered != undefined) {
      oldObj.selfSignup = {};
      newObj.selfSignup = { registered: this.selfSignupRegistered }
      // newObj.selfSignup.registered = this.selfSignupRegistered
    }
    // turn 2020-09-01 to timezone form
    const getTransformedDate = (dateString) => {
      return TimezoneHelper.parse(dateString, this.restaurant.googleAddress.timezone );
    };

    if (this.controlExpiry) {
      if (this.notificationExpiry) {
        newObj.notificationExpiry = getTransformedDate(this.notificationExpiry);
      } else {
        // if user open controlExpiry but not set expiration, we should ask user to confirm the behavor;
        if (confirm('Broadcast expiration is empty, do you want to keep the broadcast permanently?')) {
          newObj.notificationExpiry = undefined;
          this.controlExpiry = false;
        } else {
          return;
        }
      }
    } else {
      newObj.notificationExpiry = undefined;
    }
    this._prunedPatch
      .patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
        {
          old: oldObj,
          new: newObj
        }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            'Updated successfully'
          );

          // assign new values to restaurant
          this.fields.map(f => this.restaurant[f] = newObj[f]);
          if (this.restaurant.selfSignup) {
            this.restaurant.selfSignup.registered = this.selfSignupRegistered;
          }
          this.restaurant.notificationExpiry = newObj.notificationExpiry;
          this.editing = false;
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
        }
      );

    this.editing = false;
  }

  cancel() {
    this.ifShowBasicInformation = true;
    this.editing = false;
    this.tipSettingsInit();
  }

  deleteLogo(url) {
    this.logo = undefined;
  }

  deleteImage(url) {
    let index = this.images.indexOf(url);
    if (index >= 0) {
      this.images.splice(index, 1);
    }
  }

  async onUploadImage(event) {
    this.uploadImageError = undefined;
    let files = event.target.files;
    try {
      const data: any = await Helper.uploadImage(files, this._api, this._http);
      if (data && data.Location) {
        this.images.push(data.Location);
      }
    } catch (err) {
      this.uploadImageError = err;
    }

  }

  async onUploadLogo(event) {

    this.uploadImageError = undefined;
    let files = event.target.files;
    try {
      const data: any = await Helper.uploadImage(files, this._api, this._http);

      if (data && data.Location) {
        this.logo = data.Location;
      }
    } catch (err) {
      this.uploadImageError = err;
    }
  }

  setComebackDateAsUnknown() {
    this.comebackDate = null;
    this.isComebackDateCorrectlySet = true;
    setTimeout(() => {
      this.isComebackDateCorrectlySet = false;
    }, 1000);
  }

  disabledHandle() {
    if (this.isTemporarilyDisabled === 'No' || !this.disabled) {
      this.comebackDate = null;
    }

    if (this.isTemporarilyDisabled === 'Yes') {
      this.comebackDate = null;
    }
  }

}
