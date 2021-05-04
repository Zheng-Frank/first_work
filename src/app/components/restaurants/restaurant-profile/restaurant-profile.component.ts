import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { Address, Restaurant } from '@qmenu/ui';
import { Helper } from '../../../classes/helper';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { PrunedPatchService } from '../../../services/prunedPatch.service';
import { environment } from '../../../../environments/environment';
import { AlertType } from '../../../classes/alert-type';
import { HttpClient } from '@angular/common/http';
import { formatNumber } from '@angular/common';
import { LanguageType } from 'src/app/classes/language-type';

@Component({
  selector: 'app-restaurant-profile',
  templateUrl: './restaurant-profile.component.html',
  styleUrls: ['./restaurant-profile.component.css']
})
export class RestaurantProfileComponent implements OnInit, OnChanges {
  @Input() restaurant: Restaurant;
  @Input() editable;
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
    'serviceSettings'
  ];

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
  showExplanationsIcon = false; //  a flag to decide whether show English/Chinese translations icon and the icon will toggle show explanations when focus in it.
  showExplanations = false;
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
      "SalesAgent":"",
      "Disabled":"复选框禁用餐厅（例如，如果餐厅停业或停止与qMenu开展业务，选中此框将禁用客户为餐厅下达的任何未来订单）。当一家餐馆被禁用时，这也会告诉我们的系统即使在所有权受到攻击时也不会产生专线小组转移任务，因为我们的专线小组团队努力维持一个不再与我们合作的餐馆的专线小巴列表是不值得的。",
      "TimeEstimateforPickup":"准备拿餐订单时间估算（分钟）",
      "TimeEstimateforDelivery":"准备外送订单时间估算（分钟）",
      "PreferredLanguage":"确定用于机器人调用的语言，以通知新的传入订单（英文或中文）.",
      "WebsiteBroadcast":"此广播将显示在餐厅的订购网站上。 如果餐厅要求您向将出现在网站上的客户添加消息，则应在此处添加该内容。 例如，在下图中，餐馆想要警告顾客他们必须出示与他们打算用来购买食物的信用卡相匹配的有效ID。",
      "Surcharge":"在线订购的额外费用。 鼓励餐厅尽可能不收取此类费用，因为它可能会阻止客户。 （向客户展示的文字：通常类似“在线订单费”）。",
      "SurchargeRate":"在线订购的额外费用。 鼓励餐厅尽可能不收取此类费用，因为它可能会阻止客户。 （向客户展示的文字：通常类似“在线订单费”）",
      "CCProcessingRate":"一些餐馆收取信用卡金额的一定百分比作为处理付款的费用。",
      "CCProcessingFlatFee":"部分餐厅收取固定费用以处理信用卡交易，如1美元。 鼓励餐厅尽可能不收取此类费用，因为它可能会阻止客户。",
      "PickupMinimum":"取件订单的最低订单金额",
      "CCMinimumCharge":"",
      "DefaultPercentage":"",
      "MinimumPercentage":"",
      "DefaultAmount":"",
      "MinimumAmount":"",
      "ShowTip":"",
      "DisableScheduling":"如果选中此复选框，则会阻止客户在餐厅当前未打开时从餐厅下订单。 由于客户经常仍然错误地为未来日期下订单（认为他们正在下当天订单），我们已将此作为所有餐厅的默认系统行为。",
      "RegisterSelfSignup":"",
      "Notes":"有关餐厅的任何额外的非结构化数据，没有其他现有专用字段输入信息。",
      "HideOrderStatusonCustomerSide":"",
      "SkipOrderConfirmation":"如果选择此选项，此餐厅的未确认订单将不会出现在Qmenu CSR Portal主页上的“未确认订单”列表中（换句话说，餐厅不希望确认他们获得的每个订单，也不会 希望收到我们的提醒。）",
      "SkipAutoInvoicing":"",
      "NotShowTaxOptiontoCustomer":"",
      "SkipImageInject":"",
      "Allowsubmittingorderatclosetime":"",
      "HideprintingCC":"",
      "PreventRTfromcancelingorders":"",
      "Showorderreadyestimate":"",
      "Domain":"标注:“域”字段不再位于“配置文件”部分下，因为现在，所有与网站相关的信息都已移至此处。",
      "DisableOrderingAhead":"",
      "OrderCallLanguage":"确定用于机器人调用的语言，以通知新的传入订单（英文或中文）.",
      "Logo":"（菜单编辑会处理这个问题，CSR+销售人员可以忽略）：这里上传的任何徽标都会出现在餐厅的qMenu订购网站的这两个地方。",
      "Photos":"(菜单编辑负责这一点，客服+销售可以忽略) 此处上传的图片将是餐厅qMenu订购网站上的网站背景图片。"
    },
    EnglishExplanations:{
      "Name":"Name of restaurant",
      "Address":"Address of restaurant (this must now be selected from a list of Google-validated addresses).",
      "AddressExtra":"Any extra address information, like apartment or suite number, that isn’t captured by the main “Address” field can be recorded here ",
      "ID":"ID of restaurant",
      "Alias":"",
      "TimeZone":"You must remember to look up the time zone of the restaurant and set it properly! Simply search for “[city], [state] time zone” or “[zip code] time zone” on Google. ",
      "TaxRate":"The restaurant’s local tax rate. If the restaurant doesn’t know their tax rate, you can look it up on Google for them.",
      "SalesAgent":"",
      "Disabled":"Checkbox to disable the restaurant (for instance, if the restaurant goes out of business or stops doing business with qMenu, checking this box will disable any future orders from being placed by customers for the restaurant). When a restaurant is disabled, this will also tell our system to not generate GMB transfer tasks even when the ownership is attacked, since it’s not worth our GMB team’s efforts to maintain a GMB listing of a restaurant that won’t work with us anymore anyway.",
      "TimeEstimateforPickup":"Time Estimate for Pickup (mins)",
      "TimeEstimateforDelivery":"Time Estimate for Delivery (mins):",
      "PreferredLanguage":"Determines the language to use for robo-calls to notify of new incoming orders (English or Chinese) .",
      "WebsiteBroadcast":"This broadcast will be displayed on the restaurant’s ordering site. If the restaurant asks you to add a message to customers that will appear on the website, this is where you should add that content. For example, in the image below, the restaurant wants to warn customers that they must present a valid ID matching the credit card they intend to use to purchase the food.",
      "Surcharge":" Extra fee for ordering online. Encourage the restaurant not to charge such a fee if possible as it may deter customers. (Text to show customer: what to show customers to explain this fee, usually something like “Service Fee”).",
      "SurchargeRate":"",
      "CCProcessingRate":"Some restaurants charge a percentage of the credit card amount as a fee to process the payment.",
      "CCProcessingFlatFee":"Some restaurants charge a flat fee for processing credit card transactions, like $1. Encourage the restaurant not to charge such a fee if possible as it may deter customers.",
      "PickupMinimum":"Minimum order amount for pickup orders ",
      "CCMinimumCharge":"",
      "DefaultPercentage":"",
      "MinimumPercentage":"",
      "DefaultAmount":"",
      "MinimumAmount":"",
      "ShowTip":"",
      "DisableScheduling":"If this box is checked, it prevents customers from placing future orders from the restaurant if the restaurant is not currently open. Due to the fact that customers were often still mistakenly placing orders for future dates (thinking that they were placing current-day orders), we have made this the default system behavior for all restaurants.",
      "RegisterSelf-Signup":"",
      "Notes":"Any extra unstructured data about the restaurant for which there is not another existing dedicated field to enter the information into.",
      "HideOrderStatusonCustomerSide":"",
      "SkipOrderConfirmation":"If this option is selected, unconfirmed orders for this restaurant will not appear in the “Unconfirmed Orders” list on the Qmenu CSR Portal home page (in other words, the restaurant doesn’t want to have to confirm each order they get and does not want to receive reminders from us to do so).",
      "SkipAutoInvoicing":"",
      "NotShowTaxOptiontoCustomer":"",
      "SkipImageInject":"",
      "Allowsubmittingorderatclosetime":"",
      "HideprintingCC":"",
      "PreventRTfromcancelingorders":"",
      "Showorderreadyestimate":"",
      "Domain":" NOTE:The “Domain” field is no longer under the “Profile” section, because now, all website-related information has been moved here.", // Editable field.
      "DisableOrderingAhead":"",
      "OrderCallLanguage":"Determines the language to use for robo-calls to notify of new incoming orders (English or Chinese) .",
      "Logo":" (Menu editors take care of this, CSR + sales can ignore): Any logo uploaded here will appear in these two places on the qMenu ordering site for the restaurant.",
      "Photos":" (Menu editors take care of this, CSR + sales can ignore): Image uploaded here will be the website background image on the qMenu ordering site for the restaurant. ",

    }
  }

  changeLanguageFlag = LanguageType.ENGLISH;
  preferredLanguages = [
    { value: 'ENGLISH', text: 'English' },
    { value: 'CHINESE', text: 'Chinese' }
  ];

  comebackDate = null;
  isComebackDateCorrectlySet = false;
  isTemporarilyDisabled;
  now = new Date().toISOString().split('T')[0];

  constructor(private _api: ApiService, private _global: GlobalService, private _http: HttpClient, private _prunedPatch: PrunedPatchService) {
  }

  ngOnInit() {
    this.selfSignupRegistered = this.restaurant.selfSignup && this.restaurant.selfSignup.registered;

    if (this.restaurant.disabled && this.restaurant['comebackDate'] === undefined) {
      this.isTemporarilyDisabled = 'No';
    } else if (this.restaurant.disabled && (this.restaurant['comebackDate'] === null || this.isDate(this.restaurant['comebackDate']))) {
      this.isTemporarilyDisabled = 'Yes';
    }
    this.tipSettingsInit();
  }
  // Show the corresponding translation of restaurant profile field.
  showCorrespondingTranslation(field){
    this.translating = field;
    this.showExplanations = true;
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
    this.preferredLanguage = this.preferredLanguages.filter(z => z.value === (this.restaurant.preferredLanguage || 'ENGLISH'))[0];
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
      const setting = this.restaurant.serviceSettings.find(x => x.name === type) || {
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
    newObj.taxRate = +this.taxRate || undefined;
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
    }

    newObj.preferredLanguage = (this.preferredLanguage && this.preferredLanguage.value) || undefined;
    // update those two fields!
    newObj.images = this.images;
    delete oldObj['images'];

    if (this.selfSignupRegistered != undefined) {
      oldObj.selfSignup = {};
      newObj.selfSignup = { registered: this.selfSignupRegistered }
      // newObj.selfSignup.registered = this.selfSignupRegistered
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
            this.restaurant.selfSignup.registered = this.selfSignupRegistered
          };

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
