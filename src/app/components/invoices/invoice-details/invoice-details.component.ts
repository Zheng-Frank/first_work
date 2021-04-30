import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";

import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { mergeMap } from 'rxjs/operators';
import { Restaurant } from '@qmenu/ui';
import { Log } from "../../../classes/log";
import { PaymentMeans } from '@qmenu/ui';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Channel } from '../../../classes/channel';
import { Helper } from "../../../classes/helper";
import { FattmerchantComponent } from '../fattmerchant/fattmerchant.component';
import { StripeComponent } from '../stripe/stripe.component';

declare var $: any;
declare var window: any;
const FATT_LIMIT = 299;

@Component({
  selector: 'app-invoice-details',
  templateUrl: './invoice-details.component.html',
  styleUrls: ['./invoice-details.component.css'],
  providers: [CurrencyPipe, DatePipe]
})
export class InvoiceDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('myInvoiceViewer') myInvoiceViewer;

  invoice: Invoice;
  paymentMeans: PaymentMeans[] = [];
  restaurantLogs: Log[] = [];
  restaurantId;
  restaurant: Restaurant;

  invoiceChannels = [];

  display;

  adjustmentDescription;
  adjustmentIsCredit = true;
  adjustmentAmount;

  apiRequesting: 'Fax' | 'SMS' | 'Email' | 'Phone';

  currencyMap = {
    // 'US': 'USD', // this is the default
    'CA': 'CAD'
  };

  invoiceCurrency;
  @ViewChild('adjustmentModal') adjustmentModal: ModalComponent;

  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService, private currencyPipe: CurrencyPipe, private datePipe: DatePipe) {
    this.loadInvoice();
    if (this.canEdit) {
      this.display = 'paymentMeans';
    }
  }

  shouldShowStripe() {
    return this.invoice && !(this.invoice.isPaymentSent || this.invoice.isPaymentCompleted) && this.isCreditCardOrStripe()
  }

  shouldShowFattmerchant() {
    return this.invoice && (this.invoiceCurrency !== 'CAD' && this.invoice.balance <= FATT_LIMIT) && !(this.invoice.isPaymentSent || this.invoice.isPaymentCompleted) && this.isCreditCardOrStripe()
  }

  @ViewChild("myStripe") myStripe: StripeComponent;
  payingStripe = false;
  stripeError = undefined;
  async payStripe() {

    this.stripeError = undefined;
    this.payingStripe = true;
    try {
      const token = await this.myStripe.tokenize();
      console.log(token);
      const payResult = await this._api.post(environment.appApiUrl + "invoices/pay", {
        id: this.invoice["_id"],
        amount: Math.abs(this.invoice.balance),
        currency: this.invoiceCurrency,
        stripeToken: token
      }).toPromise();
      console.log(payResult);
      this._global.publishAlert(AlertType.Success, "Success");
      this.loadInvoice();
    }
    catch (error) {
      const extractedError = (error.error || {}).message || (error.error || {}).body || error.error || JSON.stringify(error);
      console.log("failed", error);
      this.stripeError = extractedError;
    }
    this.payingStripe = false;
  }

  @ViewChild("myFattmerchant") myFattmerchant: FattmerchantComponent;
  fattmerchantError;
  payingFattmerchant = false;
  async payFattmerchant() {
    this.fattmerchantError = undefined;
    this.payingFattmerchant = true;
    try {
      const token = await this.myFattmerchant.tokenize(this.invoice.balance);
      console.log(token);
      const payResult = await this._api.post(environment.appApiUrl + "invoices/pay", {
        id: this.invoice["_id"],
        amount: Math.abs(this.invoice.balance),
        currency: "USD",
        fattmerchantWebToken: token
      }).toPromise();
      console.log(payResult);
      this._global.publishAlert(AlertType.Success, "Success");
      this.loadInvoice();
    }
    catch (error) {
      const extractedError = (error.error || {}).message || (error.error || {}).body || error.error || JSON.stringify(error);
      console.log("failed", error);
      this.fattmerchantError = extractedError;
    }
    this.payingFattmerchant = false;
  }

  canEdit() {
    return this._global.user.roles.some(r => ['ADMIN', 'ACCOUNTANT', 'CSR'].indexOf(r) >= 0);
  }

  canView() {
    return this._global.user.roles.some(r => r === 'INVOICE_VIEWER');
  }

  isCreditCardOrStripe() {
    return this.paymentMeans && this.paymentMeans.some(pm => pm.type === 'Credit Card' || pm.type === 'Stripe');
  }

  loadInvoice() {
    const self = this;
    this._route.params
      .pipe(mergeMap(params =>
        this._api
          .get(environment.qmenuApiUrl + "generic", {
            resource: "invoice",
            query: {
              _id: { $oid: params['id'] }
            },
            limit: 1
          })
      )).pipe(mergeMap(invoices => {
        this.invoice = new Invoice(invoices[0]);
        return this._api
          .get(environment.qmenuApiUrl + "generic", {
            resource: "restaurant",
            query: {
              _id: { $oid: this.invoice.restaurant.id }
            },
            projection: {
              name: 1,
              paymentMeans: 1,
              channels: 1,
              googleAddress: 1,
              logs: 1,
              feeSchedules: 1
            },
            limit: 1
          })
      })).subscribe(restaurants => {

        this.restaurantId = restaurants[0]._id;
        this.restaurant = restaurants[0];
        this.invoice.restaurant.paymentMeans = (restaurants[0].paymentMeans || []);
        this.invoiceCurrency = this.currencyMap[restaurants[0].googleAddress && restaurants[0].googleAddress.country];

        // show only relevant payment means: Send to qMenu = balance > 0
        this.paymentMeans = (restaurants[0].paymentMeans || [])
          .map(pm => new PaymentMeans(pm))
          .filter(pm => (pm.direction === 'Send' && this.invoice.balance > 0) || (pm.direction === 'Receive' && this.invoice.balance < 0));

        // inject paymentMeans to invoice. If multiple, choose the first only
        const firstPm = this.paymentMeans[0];
        if (firstPm) {
          // https://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-dollars-currency-string-in-javascript
          const amountString = '$' + Math.abs(this.invoice.balance).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');

          const wordingMap = {
            'Check': 'Please send payment check in the amount of ' + amountString + ' to:<br>qMenu, Inc.<br>7778 McGinnis Ferry Rd, Suite 276<br>Suwanee, GA 30024',
            'Quickbooks Invoicing': undefined,
            'Stripe': 'Please pay online or send payment check in the amount of ' + amountString + ' to:<br>qMenu, Inc.<br>7778 McGinnis Ferry Rd, Suite 276<br>Suwanee, GA 30024',
            'Quickbooks Bank Withdraw': 'Balance ' + amountString + ' will be withdrawn from your bank account ending in ' + ((firstPm.details || {}).accountNumber || '').substr(-4) + '.',
            'Credit Card': 'Balance ' + amountString + ' will be charged to your credit card ending in ' + ((firstPm.details || {}).cardNumber || '').substr(-4) + '.',
            'Direct Deposit': 'Credit ' + amountString + ' will be deposited to your bank account ending in ' + ((firstPm.details || {}).accountNumber || '').substr(-4) + '. It may take up to 3 business days.',
            'Check Deposit': 'A payment check of ' + amountString + ' is mailed to ' + ((firstPm.details || {}).address ? firstPm.details.address : 'you') + '. It may take up to 7 business days.'
          }
          this.invoice.paymentInstructions = wordingMap[firstPm.type];

        }


        this.restaurantLogs = (restaurants[0].logs || []).map(log => new Log(log));

        this.invoiceChannels = (restaurants[0].channels || []).filter(c => c.notifications && c.notifications.indexOf('Invoice') >= 0);

        if (this.myInvoiceViewer) {
          this.myInvoiceViewer.refresh();
        }


      }, error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling invoice from API"
        )
      });
  }

  ngOnInit() {
    // UGLY solution to hide header and footer
    $('nav').hide();
    $('#footer').hide();
  }

  ngOnDestroy() {
    // UGLY solution to restore hider and footer
    $('nav').show();
    $('#footer').show();
  }

  setDisplay(item) {
    if (this.display === item) {
      this.display = '';
    } else {
      this.display = item;
    }
  }

  downloadPdf() {
    window.print();
  }

  async applyFeeSchedules() {

    if (this.restaurant.feeSchedules && this.restaurant.feeSchedules.length > 0) {
      try {
        const result = await this._api.patch(environment.qmenuApiUrl + "generic?resource=invoice",
          [{
            old: {
              _id: this.invoice['_id'],
              restaurant: {}
            }, new: {
              _id: this.invoice['_id'],
              restaurant: {
                feeSchedules: this.restaurant.feeSchedules
              }
            }
          }]).toPromise();

        await this.addLog({
          time: new Date(),
          action: "apply fee schedules",
          user: this._global.user.username,
          value: `old: ${JSON.stringify(this.invoice.restaurant.feeSchedules || [])}`
        });
      } catch (error) {
        this._global.publishAlert(AlertType.Danger, "Error updating to DB");
      }

      await this.computeDerivedFields();

    } else {
      this._global.publishAlert(AlertType.Danger, "No fee schedules found for restaurant");
    }

  }

  async computeDerivedFields() {
    try {
      await this._api.post(environment.appApiUrl + 'invoices/compute-derived-fields', { id: this.invoice['_id'] || this.invoice.id }).toPromise();
      this._global.publishAlert(AlertType.Success, "Success!");
      await this.loadInvoice();
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, error.error);
    }
  }

  async toggleInvoiceStatus(field) {
    if (field === 'isCanceled' && this.invoice.isCanceled) {
      if (!confirm('Are you sure to uncancel?') || this.invoice.adjustments) {
        return alert('Not canceled or because order has adjustments.');
      }
    }

    if (field === 'isCanceled' && !this.invoice.isCanceled) {
      if (!confirm("Are you sure to cancel this invoice?")) {
        return;
      }
      if (this.invoice.isPaymentSent || this.invoice.isPaymentCompleted) {
        return alert('Payment is already sent or completed. Failed to cancel.');
      }
      const dependentInvoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'invoice',
        query: {
          previousInvoiceId: this.invoice['_id'] || this.invoice.id
        },
        projection: {
          fromDate: 1,
          isCanceled: 1
        },
        limit: 1000
      }).toPromise();

      console.log(dependentInvoices)
      if (dependentInvoices.some(i => !i.isCanceled)) {
        return alert('There are other invoices depending on this one. Failed to cancel.');
      }
    }


    this.setInvoiceStatus(field, !this.invoice[field]);
    await this.addLog(
      {
        time: new Date(),
        action: "set",
        user: this._global.user.username,
        value: field + '=' + !this.invoice[field]
      }
    );
  }

  async setInvoiceStatus(field, value) {

    const oldInvoice = JSON.parse(JSON.stringify(this.invoice));
    const updatedInvoice = JSON.parse(JSON.stringify(this.invoice));
    updatedInvoice[field] = value;

    try {
      const result = await this._api.patch(environment.qmenuApiUrl + "generic?resource=invoice", [{ old: oldInvoice, new: updatedInvoice }]).toPromise();
      this.invoice[field] = updatedInvoice[field];
      this._global.publishAlert(
        AlertType.Success,
        field + " was updated"
      );
      if (field === 'isCanceled' && this.invoice.adjustments && this.invoice.adjustments.length > 0) {
        // we need to reverse adjustment logs to be un-resolved!
        const updatedLogs = JSON.parse(JSON.stringify(this.restaurantLogs)).map(log => new Log(log));

        updatedLogs.map(log => {
          if (this.invoice.adjustments.some(adjustment => new Date(adjustment.time).valueOf() === log.time.valueOf())) {
            log.resolved = false;
          }
        });

        const result = await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: { _id: this.restaurantId }, new: { _id: this.restaurantId, logs: updatedLogs } }]).toPromise();
      }

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, "Error updating to DB");
    }
  }

  addAdjustment() {
    this.adjustmentModal.show();
  }

  async okAdjustment() {

    const adjustment = {
      name: this.adjustmentDescription,
      amount: Math.abs(+this.adjustmentAmount) * (this.adjustmentIsCredit ? 1 : -1)
    };

    const oldInvoice = JSON.parse(JSON.stringify(this.invoice));
    let updatedInvoice = JSON.parse(JSON.stringify(this.invoice));
    updatedInvoice.adjustments = updatedInvoice.adjustments || [];
    updatedInvoice.adjustments.push(adjustment);

    // we need recalculate the values!
    let i = new Invoice(updatedInvoice);
    // back to use POJS
    updatedInvoice = JSON.parse(JSON.stringify(i));

    try {

      const result = await this._api.patch(environment.qmenuApiUrl + "generic?resource=invoice", [{ old: oldInvoice, new: updatedInvoice }]).toPromise();
      Object.assign(this.invoice, i);
      this._global.publishAlert(
        AlertType.Success,
        adjustment.name + " was added"
      );
      await this.addLog({
        time: new Date(),
        action: "adjust",
        user: this._global.user.username,
        value: adjustment
      });

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, "Error updating to DB");
    }

    this.adjustmentModal.hide();

    // because invoiceViewer is onPush, we need to refresh
    await this.computeDerivedFields();
  }

  resolve(log) {
    const newRestaurantLogs = this.restaurantLogs.slice(0);
    const index = newRestaurantLogs.indexOf(log);
    const logResolved = new Log(log);
    logResolved.resolved = true;
    newRestaurantLogs[index] = logResolved;

    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
      {
        old: { _id: this.restaurantId, logs: this.restaurantLogs }, new:
        {
          _id: this.restaurantId,
          logs: newRestaurantLogs
        }
      }]).subscribe(
        result => {
          // let's update original, assuming everything successful
          this.restaurantLogs = newRestaurantLogs;
          this._global.publishAlert(
            AlertType.Success,
            'Successfully updated.'
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating log");
        }
      );
  }

  getUnresolvedLogs() {
    return (this.restaurantLogs || []).filter(log => !log.resolved);
  }

  async sendInvoice(channel: Channel) {
    this.apiRequesting = channel.type;

    try {
      // we need to get shorten URL, mainly for SMS.
      const invoiceId = this.invoice.id || this.invoice['_id'];
      switch (channel.type) {
        case 'Fax':
        case 'Email':
        case 'SMS':
          await this._api.post(environment.appApiUrl + 'invoices/send', { invoiceId: invoiceId, type: channel.type.toLowerCase(), to: channel.value }).toPromise();
          break;
        default:
          break;
      }
      this._global.publishAlert(AlertType.Success, channel.type + ' Send');
      if (!this.invoice.isSent) {
        this.setInvoiceStatus('isSent', true);
      }
      await this.addLog(
        {
          time: new Date(),
          action: channel.type,
          user: this._global.user.username,
          value: channel.value
        }
      );
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, "Error");
    }
    this.apiRequesting = undefined;
  }

  async addLog(log) {
    const oldInvoice = JSON.parse(JSON.stringify(this.invoice));
    const updatedInvoice = JSON.parse(JSON.stringify(this.invoice));
    updatedInvoice.logs = updatedInvoice.logs || [];
    const logTime = log.time;
    // when updating, we need to convert to time format of database
    log.time = { $date: logTime };
    updatedInvoice.logs.push(log);
    try {
      const result = await this._api.patch(environment.qmenuApiUrl + "generic?resource=invoice", [{ old: oldInvoice, new: updatedInvoice }]).toPromise();
      // let's update original, assuming everything successful
      this.invoice.logs = updatedInvoice.logs;
      // the last log's time should convert back to normal (without $date)
      this.invoice.logs[this.invoice.logs.length - 1].time = logTime;

    }
    catch (e) {
      this._global.publishAlert(AlertType.Danger, "Error updating to DB");
      throw e;
    }

  }
  async sendPaperCheck() {
    let amount = +(this.invoice.balance.toFixed(2));
    if (amount < 0) {
      amount = Math.abs(amount);
    }
    //console.log('this.invoice.restaurant=', this.invoice.restaurant);
    //if multiple payment means, choose the first only
    let paymentMean = this.invoice.restaurant.paymentMeans[0];
    let address, destination;
    if (paymentMean && paymentMean.direction === 'Receive' && paymentMean.type === 'Check Deposit') {
      if (paymentMean.details.address) {
        address = paymentMean.details.address.replace(', USA', '');
        destination = {
          "name": paymentMean.details.name || this.invoice.restaurant.name,
          "restaurantId": this.invoice.restaurant.id,
          "address_line1": Helper.getAddressLine1(address),
          "address_city": Helper.getCity(address),
          "address_state": Helper.getState(address),
          "address_zip": Helper.getZipcode(address)
        }
      }
      else if (this.restaurant.googleAddress && this.restaurant.googleAddress.formatted_address) {
        let formatted_address = this.restaurant.googleAddress.formatted_address.replace(', USA', '');
        destination = {
          "name": this.invoice.restaurant.name,
          "restaurantId": this.invoice.restaurant.id,
          "address_line1": Helper.getLine1(this.restaurant.googleAddress),
          "address_city": Helper.getCity(formatted_address),
          "address_state": Helper.getState(formatted_address),
          "address_zip": Helper.getZipcode(formatted_address)
        }
      }
      else {
        this._global.publishAlert(AlertType.Danger, "Missing address");
        throw "Missing address"
      }
    }
    try {
      let result = await this._api.post(environment.qmenuApiUrl + "utils/send-check", {
        destination: destination,
        "action": "paperCheckTransfer",
        "amount": amount,
        "memo": 'QMenu Payment ' + this.formatDate(this.invoice.fromDate) + ' - ' + this.formatDate(this.invoice.toDate)
      }).toPromise();

      if (result.status_code != 200) {
        this._global.publishAlert(
          AlertType.Danger, "Failed to send check"
        );
      } else {
        await this.setInvoiceStatus('isPaymentCompleted', true);
        await this.setInvoiceStatus('isPaymentSent', true);

        await this.addLog(
          {
            time: new Date(),
            action: "paperCheckTransfer",
            user: this._global.user.username,
            value: result.response.url
          }
        );
        await this.addLog(
          {
            time: new Date(),
            action: "set",
            user: this._global.user.username,
            value: 'isPaymentCompleted=true'
          }
        );
        await this.addLog(
          {
            time: new Date(),
            action: "set",
            user: this._global.user.username,
            value: 'isPaymentSent=true'
          }
        );
        this._global.publishAlert(
          AlertType.Success, "Successfully send check"
        );
      }

    } catch (e) {
      console.log('Error', e);
      this._global.publishAlert(
        AlertType.Danger, "Failed to send check"
      );
      await this.addLog(
        {
          time: new Date(),
          action: "paperCheckTransfer",
          user: this._global.user.username,
          value: e
        }
      );
    }

  }

  formatDate(date: Date) {
    let month = '' + (date.getMonth() + 1);
    let day = '' + date.getDate();
    let year = date.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [month, day, year].join('/');
  }


  showSendPaperCheck() {
    if (!this.invoice.isPaymentSent || !this.invoice.isPaymentCompleted) {
      if (this.invoice.restaurant.paymentMeans && this.invoice.restaurant.paymentMeans.length > 0 && this.invoice.balance < 0) {
        let paymentMean = this.invoice.restaurant.paymentMeans[0];
        if (paymentMean && paymentMean.direction === 'Receive' && paymentMean.type === 'Check Deposit') {
          return true;
        }
      }
    }
    return false;
  }

  isButtonVisible() {
    return this._global.user.roles.some(r => r === 'PAYER');
  }
}
