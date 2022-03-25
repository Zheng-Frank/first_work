import { GlobalService } from './../../../../services/global.service';
import { EventEmitter } from '@angular/core';
import { Component, OnInit, Input, Output } from '@angular/core';
import { invoicingSectionCallScript } from '../restaurant-setup-entry/setup-call-script';

enum invoicingFromQmenuTypes {
  Get_Check = 'Get a check in the mail',
  Direct_Deposit = 'Direct Deposit'
}

enum invoicingToQmenuTypes {
  PayOnline = 'Pay online with credit card',
  MailCheck = 'Mail qMenu a check',
  DirectWithdrawal = 'Direct Withdrawal'
}

enum paymentTypes {
  Check_Deposit = 'Check Deposit',
  Direct_Deposit = 'Direct Deposit',
  Credit_Card = 'Credit Card',
  Stripe = 'Stripe',
  Quickbooks_Bank_Withdraw = 'Quickbooks Bank Withdraw'
}

enum paymentDirectionTypes {
  Receive = 'Receive',
  Send = 'Send'
}

@Component({
  selector: 'app-restaurant-setup-invoicing',
  templateUrl: './restaurant-setup-invoicing.component.html',
  styleUrls: ['./restaurant-setup-invoicing.component.css']
})
export class RestaurantSetupInvoicingComponent implements OnInit {

  @Input()
  restaurant;
  @Output()
  done = new EventEmitter();
  // qMenu → Restaurant
  invoicingFromQmenuOpts = [{
    value: paymentTypes.Check_Deposit,
    text: invoicingFromQmenuTypes.Get_Check
  }, {
    value: paymentTypes.Direct_Deposit,
    text: invoicingFromQmenuTypes.Direct_Deposit
  }];
  invoicingFromQmenuOpt = '';
  // Restaurant → qMenu
  invoicingToQmenuOpts = [{
    value: paymentTypes.Credit_Card,
    text: invoicingToQmenuTypes.PayOnline
  }, {
    value: paymentTypes.Stripe,
    text: invoicingToQmenuTypes.MailCheck
  }, {
    value: paymentTypes.Quickbooks_Bank_Withdraw,
    text: invoicingToQmenuTypes.DirectWithdrawal
  }];
  invoicingToQmenuOpt = '';
  memo;
  // bank info model: name, address, routingNumber, accountNumber
  bankInfoModel = {
    name: '',
    address: '',
    routingNumber: '',
    accountNumber: '',
    memo_direct_deposit: '',
    memo_direct_withdrawal: ''
  }
  // deposit info model: name, address
  depositInfoModel = {
    name: '',
    address: '',
    memo: ''
  }
  // credit card detail info model: cardNumber, expiry, cvc, name, zipcode
  creditCardInfoModel = {
    name: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    zipcode: '',
    memo: ''
  }
  checkAddressMemo; // if Restaurant → qMenu && Stripe need show a memo
  creditCardOneTime = false; // whether credit card can use only once
  bankOneTime = false; // whether bank can use only once
  toPaymentTypes = ['CASH', 'IN_PERSON', 'KEY_IN', 'STRIPE'];
  serviceSettingsFinished = false;
  showToQmenuQuestion = false;// decided to show question one, qMenu → Restaurant
  showFromQmenuQuestion = false;// decided to show question one, Restaurant → qMenu
  changeLanguageFlag = this._global.languageType;// this flag decides show English call script or Chinese
  showCallScript = false;// it will display call script when the switch is opened
  rtTIN;
  payeeName;
  showMandatoryQuestions = false;
  constructor(private _global: GlobalService) { }

  async ngOnInit() {
    // await this.getRestaurantExample();
    this.init();
  }
  // make invoicingSectionCallScript from exporting becomes inner field of class RestaurantSetupInvoicingComponent
  get invoicingSectionCallScript() {
    return invoicingSectionCallScript;
  }

  isServiceEnabled(service) {
    return service && service.paymentMethods && service.paymentMethods.length > 0;
  }

  init() {
    this.showFromQmenuQuestion = false;
    this.showToQmenuQuestion = false;
    this.showMandatoryQuestions = false;
    // check service settings
    // service settings should contain both pickup and delivery service
    if (this.restaurant.serviceSettings && this.restaurant.serviceSettings.some(service => (service.name === 'Pickup' || service.name === 'Delivery') && this.isServiceEnabled(service))) {
      this.serviceSettingsFinished = true;
      // Dose need to display two questions?
      if (this.restaurant.serviceSettings.some(service => (service.name === 'Pickup' || service.name === 'Delivery') && (service.paymentMethods || []).some(method => method === 'QMENU'))) {
        this.showFromQmenuQuestion = true;
        this.showMandatoryQuestions = true; // show tin and payee name setup question
      }
      if (this.restaurant.serviceSettings.some(service => (service.name === 'Pickup' || service.name === 'Delivery') && (service.paymentMethods || []).some(method => this.toPaymentTypes.some(type => type === method)))) {
        this.showToQmenuQuestion = true;
      }
      // Have the two questions been answered?
      this.restaurant.serviceSettings.forEach(service => {
        // received
        if ((service.paymentMethods || []).some(method => method === 'QMENU') && this.hasReceivingPaymentMean()) {
          this.showFromQmenuQuestion = false;
        }
        // send to qMenu
        if ((service.paymentMethods || []).some(method => this.toPaymentTypes.some(type => type === method)) && this.hasSendPaymentMean()) {
          this.showToQmenuQuestion = false;
        }
      });
      // check payment means
      this.depositInfoModel.address = this.bankInfoModel.address = this.restaurant.googleAddress.formatted_address || '';
      let person = (this.restaurant.people || []).filter(p => (p.roles || []).some(r => r === 'Owner'))[0] || '';
      this.bankInfoModel.name = this.depositInfoModel.name = (person || {}).name;

      if (this.showMandatoryQuestions) {
        this.rtTIN = this.restaurant.tin;
        this.payeeName = this.restaurant.payeeName;
      }
    }

  }

  hasReceivingPaymentMean() {
    return (this.restaurant.paymentMeans || []).some(payment => (payment || {}).direction === paymentDirectionTypes.Receive);
  }

  hasSendPaymentMean() {
    return (this.restaurant.paymentMeans || []).some(payment => (payment || {}).direction === paymentDirectionTypes.Send);
  }

  // Restaurant → qMenu, three types including Credit_Card, Stripe,Quickbooks_ Bank_Withdraw
  showQmenuCheckAddress() {
    return this.invoicingToQmenuOpt === paymentTypes.Stripe;
  }
  // qMenu → Restaurant, two types including Check_Deposit, Direct_Deposit
  chooseInvoicingFromQmenuOpt(opt) {
    this.invoicingFromQmenuOpt = opt.value;
  }
  // Restaurant → qMenu, three types including Credit_Card, Stripe,Quickbooks_ Bank_Withdraw
  chooseInvoicingToQmenuOpt(opt) {
    this.invoicingToQmenuOpt = opt.value;
  }
  // qMenu → Restaurant, two types including Check_Deposit, Direct_Deposit
  showBankInfo() {
    return this.invoicingFromQmenuOpt === paymentTypes.Direct_Deposit || this.invoicingToQmenuOpt === paymentTypes.Quickbooks_Bank_Withdraw;
  }
  // qMenu → Restaurant, two types including Check_Deposit, Direct_Deposit
  showDirectDepositMemo() {
    if (this.invoicingToQmenuOpt !== paymentTypes.Quickbooks_Bank_Withdraw) {
      this.bankInfoModel.memo_direct_withdrawal = '';
    }
    return this.invoicingFromQmenuOpt === paymentTypes.Direct_Deposit;
  }
  // Restaurant → qMenu, three types including Credit_Card, Stripe,Quickbooks_ Bank_Withdraw
  showDirectWithdrawalMemo() {
    if (this.invoicingFromQmenuOpt !== paymentTypes.Direct_Deposit) {
      this.bankInfoModel.memo_direct_deposit = '';
    }
    return this.invoicingToQmenuOpt === paymentTypes.Quickbooks_Bank_Withdraw;
  }

  // Restaurant → qMenu, three types including Credit_Card, Stripe,Quickbooks_ Bank_Withdraw
  showCreditCardDetail() {
    return this.invoicingToQmenuOpt === paymentTypes.Credit_Card;
  }
  // qMenu → Restaurant, two types including Check_Deposit, Direct_Deposit
  showDepositInfo() {
    return this.invoicingFromQmenuOpt === paymentTypes.Check_Deposit;
  }
  /**
   * three case:
   * 1. paymentTypes.Quickbooks_Bank_Withdraw be checked (set first paymentMeans details, set memo with memo_direct_withdrawal)
   * 2. paymentTypes.Direct_Deposit be checked (set second paymentMeans details, set memo with memo_direct_deposit)
   * 3. both of them be checked, so need direction flag to decide which memo will be set.
   * @param direction 
   */
  getPaymentBankDetails(direction) {
    let details = {};
    let { memo_direct_deposit, memo_direct_withdrawal, ...restBankInfo } = this.bankInfoModel;
    Object.entries(restBankInfo).forEach(([key, value]) => {
      // remove empty fields
      if (value) {
        details[key] = value;
      }
    });
    details['onetime'] = !this.bankOneTime;
    switch (direction) {
      case 0:
        if (memo_direct_deposit) {
          details['memo'] = memo_direct_deposit;
        }
        break;
      case 1:
        if (memo_direct_withdrawal) {
          details['memo'] = memo_direct_withdrawal;
        }
        break;
      default:
        break;
    }
    return details;
  }

  canSave() {
    return this.invoicingFromQmenuOpt || this.invoicingToQmenuOpt;
  }

  // save in payment field of restaurant json
  saveInvocing() {
    let activeRT = JSON.parse(JSON.stringify(this.restaurant));
    //  qMenu → Restaurant
    if (this.invoicingFromQmenuOpt && this.showFromQmenuQuestion) {
      let paymentMean = {
      };
      paymentMean['direction'] = paymentDirectionTypes.Receive;
      paymentMean['type'] = this.invoicingFromQmenuOpt;
      paymentMean['details'] = {};
      if ((this.showBankInfo() && this.showDirectDepositMemo() && this.showDirectWithdrawalMemo()) || (this.showBankInfo() && this.showDirectDepositMemo())) {
        paymentMean['details'] = this.getPaymentBankDetails(0);
      } else if (this.showDepositInfo()) {
        Object.entries(this.depositInfoModel).forEach(([key, value]) => {
          // remove empty fields
          if (value) {
            paymentMean['details'][key] = value;
          }
        });
      }
      let { paymentMeans = [] } = activeRT;
      activeRT.paymentMeans = [...paymentMeans, paymentMean];
    }
    // Restaurant → qMenu
    if (this.invoicingToQmenuOpt && this.showToQmenuQuestion) {
      let paymentMean = {
      };
      paymentMean['direction'] = paymentDirectionTypes.Send;
      paymentMean['type'] = this.invoicingToQmenuOpt;
      paymentMean['details'] = {};
      if (this.showQmenuCheckAddress()) {
        paymentMean['details']['memo'] = this.checkAddressMemo;
      } else if ((this.showBankInfo() && this.showDirectDepositMemo() && this.showDirectWithdrawalMemo()) || (this.showBankInfo() && this.showDirectWithdrawalMemo())) {
        paymentMean['details'] = this.getPaymentBankDetails(1);
      } else if (this.showCreditCardDetail()) {
        Object.entries(this.creditCardInfoModel).forEach(([key, value]) => {
          // remove empty fields
          if (key === 'expiry' && value) {
            let expiryDate = value.split('-');
            // e.g: 03/22
            paymentMean['details'][key] = expiryDate[1] + "/" + expiryDate[2];
          } else if (value) {
            paymentMean['details'][key] = value;
          }
        });
        //  I agree to have this payment method charged recurrently 
        // means that this payment method can be used mutiple times 
        paymentMean['details']['onetime'] = !this.creditCardOneTime;
      }
      let { paymentMeans = [] } = activeRT;
      activeRT.paymentMeans = [...paymentMeans, paymentMean];
    }
    this.done.emit({
      paymentMeans: activeRT.paymentMeans
    });
  }

  onEditTinAndPayee(event, field) {
    let newObj = {};
    if (field === 'rtTIN') {
      newObj['tin'] = event.newValue;
    }
    if (field === 'payeeName') {
      newObj['payeeName'] = event.newValue;
    }
    this.done.emit(newObj);
  }

}
