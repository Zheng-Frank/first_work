import { Component, OnInit, Input } from '@angular/core';
import { Invoice } from 'src/app/classes/invoice';
import { Order } from '@qmenu/ui';
import { state } from '@angular/animations';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { mergeMap, observeOn } from 'rxjs/operators';
import { Channel } from 'src/app/classes/channel';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AlertType } from 'src/app/classes/alert-type';
import { GlobalService } from 'src/app/services/global.service';
import { TimezoneService } from 'src/app/services/timezone.service';

@Component({
  selector: 'app-invoices-anual',
  templateUrl: './invoices-anual.component.html',
  styleUrls: ['./invoices-anual.component.css'],
  providers: [CurrencyPipe, DatePipe]
})
export class InvoicesAnualComponent implements OnInit {

  @Input() invoices: Invoice[] = [];

  showCanceled = false;
  invoiceChannels = [];
  apiRequesting: 'Fax' | 'SMS' | 'Email' | 'Phone';

  statements = [{
    year: 0,
    restaurant: {
      name: '',
      phone: '',
      address: {
        apt: '',
        formattedAddress: ''
      }
    },
    subtotal: 0,
    tax: 0,
    delivery: 0,
    tip: 0,
    total: 0,
    balance: 0,
    restaurantCollected: 0,
    qmenuCcCollected: 0,
    ccProcessingFee: 0,
    commissionScheme: [],
    commission: 0,
    surcharge: 0,
    stripeFee: 0,
    adjustment: 0,
    thirdPartyDeliveryCharge: 0,
    thirdPartyDeliveryTip: 0,
    validOrdersCount: 0,
    fromDate: null,
    toDate: null
  }];

  constructor(private _api: ApiService, private _global: GlobalService, private _timezone: TimezoneService, private currencyPipe: CurrencyPipe, private datePipe: DatePipe) { }

  async ngOnInit() {

    // Retrieve restaurant channels by getting the restaurant id of the first invoice ever
    if (this.invoices[0]) {
      const restaurants = await this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "restaurant",
          query: {
            _id: { $oid: this.invoices[0].restaurant.id }
          },
          projection: {
            channels: 1
          },
          limit: 1
        }).toPromise();

      this.invoiceChannels = (restaurants[0].channels || []).filter(c => c.notifications && c.notifications.indexOf('Invoice') >= 0);
    }


    // Unique years
    const years = [...new Set(this.invoices.map(invoice => invoice.fromDate.getFullYear()))];

    // Start filling in the statements object
    this.statements = years.map(year => {
      return {
        year,
        restaurant: {
          name: '',
          phone: '',
          address: {
            apt: '',
            formattedAddress: ''
          }
        },
        subtotal: 0,
        tax: 0,
        delivery: 0,
        tip: 0,
        total: 0,
        balance: 0,
        restaurantCollected: 0,
        qmenuCcCollected: 0,
        ccProcessingFee: 0,
        commissionScheme: [],
        commission: 0,
        surcharge: 0,
        stripeFee: 0,
        adjustment: 0,
        thirdPartyDeliveryCharge: 0,
        thirdPartyDeliveryTip: 0,
        validOrdersCount: 0,
        fromDate: null,
        toDate: null
      };
    });


    // Compute
    this.statements.map((statementAcc, index) => {
      // --- Assume all invoices during the year have the same restaurant, picks first invoice's rt info
      this.statements[index].restaurant.name = this.invoices[0].restaurant.name;
      this.statements[index].restaurant.address.apt = this.invoices[0].restaurant.address.apt || '';
      this.statements[index].restaurant.address.formattedAddress = this.invoices[0].restaurant.address.formatted_address.replace(', USA', '');
      this.statements[index].restaurant.phone = this.invoices[0].restaurant.phone;

      this.statements[index].subtotal = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((subtotalAcc, invoice) => subtotalAcc + invoice.subtotal, 0);
      this.statements[index].tax = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((taxAcc, invoice) => taxAcc + invoice.tax, 0);
      this.statements[index].delivery = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((deliveryAcc, invoice) => deliveryAcc + invoice.deliveryCharge, 0);
      this.statements[index].tip = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((tipAcc, invoice) => tipAcc + invoice.tip, 0);
      this.statements[index].total = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((totalAcc, invoice) => totalAcc + invoice.total, 0);
      this.statements[index].balance = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((balanceAcc, invoice) => balanceAcc + invoice.balance, 0);

      this.statements[index].restaurantCollected = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((restaurantCollectedAcc, invoice) => restaurantCollectedAcc + invoice.cashCollected + invoice.restaurantCcCollected, 0);
      this.statements[index].qmenuCcCollected = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((qmenuCcCollectedAcc, invoice) => qmenuCcCollectedAcc + invoice.qMenuCcCollected, 0);
      this.statements[index].ccProcessingFee = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((ccProcessingFeeAcc, invoice) => ccProcessingFeeAcc + invoice.ccProcessingFee, 0);
      this.statements[index].stripeFee = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((stripeFeeAcc, invoice) => stripeFeeAcc + invoice.stripeFee, 0);

      this.statements[index].commissionScheme = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).map(invoice => invoice.orders.reduce((acc, order) => [order.rate, order.fixed], 0)).reduce((acc, orderScheme) => [orderScheme], 0);
      this.statements[index].commission = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((commissionAcc, invoice) => commissionAcc + invoice.commission, 0);

      this.statements[index].surcharge = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((surchageAcc, invoice) => surchageAcc + invoice.surcharge, 0);
      this.statements[index].adjustment = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((adjustmentAcc, invoice) => adjustmentAcc + invoice.getAdjustment(), 0);
      this.statements[index].thirdPartyDeliveryCharge = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((thirdPartyDeliveryChargeAcc, invoice) => thirdPartyDeliveryChargeAcc + invoice.thirdPartyDeliveryCharge, 0);
      this.statements[index].thirdPartyDeliveryTip = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((thirdPartyDeliveryTipAcc, invoice) => thirdPartyDeliveryTipAcc + invoice.thirdPartyDeliveryTip, 0);

      this.statements[index].validOrdersCount = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).reduce((validOrdersCountAcc, invoice) => validOrdersCountAcc + invoice.orders.filter(o => !o.canceled).length, 0);

      // Because sort is descending (-1)
      const [lastInvoice] = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled);
      const firstInvoice = this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled)[this.invoices.filter(i => i.fromDate.getFullYear() == statementAcc.year && !i.isCanceled).length - 1];
      this.statements[index].toDate = lastInvoice ? lastInvoice.toDate : null;
      this.statements[index].fromDate = firstInvoice ? firstInvoice.fromDate : null;

    });

    // Filter since only previous year needed
    const previousYear = new Date().getFullYear() - 1;
    this.statements = this.statements.filter(statement => statement.year === previousYear);
  }

  getRestaurantTime(time, invoice): Date {
    const t = new Date(time);
    t.setHours(t.getHours() + this._timezone.getOffsetToEST(invoice.restaurant.address.timezone || 0));
    return t;
  }

  downloadPdf() {
    window.print();
  }

  getCssClass(invoice: Invoice) {
    return invoice.isPaymentCompleted ? 'text-success' : (invoice.isPaymentSent ? 'text-info' : (invoice.isSent ? 'text-light bg-dark' : 'text-dark'));
  }

  getPreviousInvoice(currentInvoice: Invoice) {
    return (this.invoices || []).filter(i => (i.id || i['_id']) === (currentInvoice.previousInvoiceId || 'non-exist'))[0];
  }

  getFilteredInvoices(year) {
    if (this.showCanceled) {
      return this.invoices.filter(i => i.fromDate.getFullYear() == year);
    } else {
      return (this.invoices || []).filter(i => !i.isCanceled && i.fromDate.getFullYear() == year);
    }
  }

  sendInvoice(channel: Channel) {
    try {
      this.apiRequesting = channel.type;

      const [statement] = this.statements;
      const [firstInvoice] = this.invoices;

      if (statement && firstInvoice) {
        const fakeId = 'anual-statement-' + new Date().getMilliseconds();

        // we need to get shorten URL, mainly for SMS.
        const url = environment.bizUrl + 'index.html#/invoice/' + (firstInvoice.id || firstInvoice['_id']);

        this._api.post(environment.appApiUrl + 'utils/shorten-url', { longUrl: url }).pipe(mergeMap(shortUrlObj => {
          let message = 'QMENU INVOICE:';
          message += '\nFrom ' + this.datePipe.transform(statement.fromDate, 'shortDate') + ' to ' + this.datePipe.transform(statement.toDate, 'shortDate') + '. ';
          // USE USD instead of $ because $ causes trouble for text :(
          message += '\n' + (statement.balance > 0 ? 'Balance' : 'Credit') + ' ' + this.currencyPipe.transform(Math.abs(statement.balance), 'USD');
          message += `\n${environment.shortUrlBase}${shortUrlObj.code} .`; // add training space to make it clickable in imessage     
          message += '\nThank you for your business!'

          // we need to append '-' to end of $xxx.xx because of imessage bug
          const matches = message.match(/\.\d\d/g);
          matches.map(match => {
            message = message.replace(match, match + '-');
          });

          switch (channel.type) {
            case 'Fax':
              return this._api.post(environment.legacyApiUrl + 'utilities/sendFax', { faxNumber: channel.value, invoiceId: (firstInvoice.id || firstInvoice['_id']) });
            case 'Email':
              return this._api.post(environment.legacyApiUrl + 'utilities/sendEmail', { email: channel.value, invoiceId: (firstInvoice.id || firstInvoice['_id']) });
            case 'SMS':
              return this._api.post(environment.legacyApiUrl + 'twilio/sendText', { phoneNumber: channel.value, message: message });
            default: break;
          }

        }))
          .subscribe(
            async result => {
              this.apiRequesting = undefined;
              this._global.publishAlert(AlertType.Success, channel.type + ' Send');
            },
            error => {
              this.apiRequesting = undefined;
              this._global.publishAlert(AlertType.Danger, "Error shortening URL");
            }
          );
      }
    } catch (error) {
      console.log('Error in sending anual invoice', error);
      this._global.publishAlert(AlertType.Danger, "Error in sending anual invoice");
    }

  }

}
