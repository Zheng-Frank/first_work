import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";

import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { mergeMap, observeOn } from 'rxjs/operators';
import { Restaurant } from '@qmenu/ui';
import { Log } from "../../../classes/log";
import { PaymentMeans } from '@qmenu/ui';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Channel } from '../../../classes/channel';
import { Observable, from } from 'rxjs';
import { Helper } from "../../../classes/helper";

declare var $: any;
declare var window: any;


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

  @ViewChild('adjustmentModal') adjustmentModal: ModalComponent;

  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService, private currencyPipe: CurrencyPipe, private datePipe: DatePipe) {
    this.loadInvoice();
    if (this.canEdit) {
      this.display = 'paymentMeans';
    }
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
              logs: 1
            },
            limit: 1
          })
      })).subscribe(restaurants => {

        this.restaurantId = restaurants[0]._id;
        this.restaurant = restaurants[0];
        this.invoice.restaurant.paymentMeans = (restaurants[0].paymentMeans || [])

        // show only relevant payment means: Send to qMenu = balance > 0
        this.paymentMeans = (restaurants[0].paymentMeans || [])
          .map(pm => new PaymentMeans(pm))
          .filter(pm => (pm.direction === 'Send' && this.invoice.getBalance() > 0) || (pm.direction === 'Receive' && this.invoice.getBalance() < 0));

        // inject paymentMeans to invoice. If multiple, choose the first only
        const firstPm = this.paymentMeans[0];
        if (firstPm) {
          // https://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-dollars-currency-string-in-javascript
          const amountString = '$' + Math.abs(this.invoice.getBalance()).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');

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

        this.myInvoiceViewer.refresh();

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

  paymentSuccess() {
    this.loadInvoice();
    this._global.publishAlert(AlertType.Success, 'Payment Success.');
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

  async computeDerivedFields() {
    await this._api.post(environment.appApiUrl + 'invoices/compute-derived-fields', { id: this.invoice['_id'] || this.invoice.id }).toPromise();
    this._global.publishAlert(AlertType.Success, "Success!");
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
    i.computeDerivedValues();
    // back to use POJS
    updatedInvoice = JSON.parse(JSON.stringify(i));



    this._api.patch(environment.qmenuApiUrl + "generic?resource=invoice", [{ old: oldInvoice, new: updatedInvoice }]).subscribe(
      result => {
        // let's update original, assuming everything successful
        Object.assign(this.invoice, i);
        this._global.publishAlert(
          AlertType.Success,
          adjustment.name + " was added"
        );
        this.addLog({
          time: new Date(),
          action: "adjust",
          user: this._global.user.username,
          value: adjustment
        });
        this.loadInvoice();
      },
      error => {
        this._global.publishAlert(AlertType.Danger, "Error updating to DB");
      }
    );

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

  sendInvoice(channel: Channel) {
    this.apiRequesting = channel.type;
    // we need to get shorten URL, mainly for SMS.
    const url = environment.bizUrl + 'index.html#/invoice/' + (this.invoice.id || this.invoice['_id']);
    // const url = environment.legacyApiUrl + 'utilities/invoice/' + (this.invoice.id || this.invoice['_id']);

    this._api.post(environment.appApiUrl + 'utils/shorten-url', { longUrl: url }).pipe(mergeMap(shortUrlObj => {
      let message = 'QMENU INVOICE:';
      message += '\nFrom ' + this.datePipe.transform(this.invoice.fromDate, 'shortDate') + ' to ' + this.datePipe.transform(this.invoice.toDate, 'shortDate') + '. ';
      // USE USD instead of $ because $ causes trouble for text :(
      message += '\n' + (this.invoice.getBalance() > 0 ? 'Balance' : 'Credit') + ' ' + this.currencyPipe.transform(Math.abs(this.invoice.getBalance()), 'USD');
      message += `\n${environment.shortUrlBase}${shortUrlObj.code} .`; // add training space to make it clickable in imessage     
      // if (this.invoice.paymentInstructions) {
      //   message += '\n' + this.invoice.paymentInstructions.replace(/\<br\>/g, '\n');
      // }
      message += '\nThank you for your business!'

      // we need to append '-' to end of $xxx.xx because of imessage bug
      const matches = message.match(/\.\d\d/g);
      matches.map(match => {
        message = message.replace(match, match + '-');
      });

      switch (channel.type) {
        case 'Fax':
          return this._api.post(environment.legacyApiUrl + 'utilities/sendFax', { faxNumber: channel.value, invoiceId: this.invoice.id || this.invoice['_id'] });
        case 'Email':
          return this._api.post(environment.legacyApiUrl + 'utilities/sendEmail', { email: channel.value, invoiceId: this.invoice.id || this.invoice['_id'] });
        case 'SMS':
          return this._api.post(environment.legacyApiUrl + 'twilio/sendText', { phoneNumber: channel.value, message: message });
        default: break;
      }

    }))
      .subscribe(
        async result => {
          this.apiRequesting = undefined;
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
        },
        error => {
          this.apiRequesting = undefined;
          this._global.publishAlert(AlertType.Danger, "Error shortening URL");
        }
      );
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
    let amount = +(this.invoice.getBalance().toFixed(2));
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
      if (this.invoice.restaurant.paymentMeans && this.invoice.restaurant.paymentMeans.length > 0 && this.invoice.getBalance() < 0) {
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
