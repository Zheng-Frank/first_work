import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Restaurant, Order } from '@qmenu/ui';
import { Invoice } from 'src/app/classes/invoice';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { Log } from 'src/app/classes/log';

@Component({
  selector: 'app-invoice-editor',
  templateUrl: './invoice-editor.component.html',
  styleUrls: ['./invoice-editor.component.css']
})
export class InvoiceEditorComponent implements OnInit, OnChanges {
  @Output() create = new EventEmitter();
  @Output() cancel = new EventEmitter();

  @Input() restaurantId;

  fromDate;
  toDate;

  previousInvoice = undefined;
  allDisplayed = false;
  startRows = 4;

  restaurant;
  invoices = [];
  orders = [];

  outstandingAdjustmentLogs = [];

  constructor(private _api: ApiService, private _global: GlobalService) {
    const guessedDates = this.guessInvoiceDates(new Date());
    this.fromDate = guessedDates.fromDate;
    this.toDate = guessedDates.toDate;
  }

  ngOnInit() {
  }

  guessInvoiceDates(someDate) {
    // 1 - 15 --> previous month: 16 - month end
    // otherwise 1 - 15 of same month
    if (someDate.getDate() > 15) {
      return {
        fromDate: this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth(), 1)),
        toDate: this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth(), 15))
      };
    } else {
      return {
        fromDate: this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth() - 1, 16)),
        toDate: this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth(), 0))
      };
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    this.previousInvoice = undefined;
    this.outstandingAdjustmentLogs = [];
    if (this.restaurantId) {

      try {

        this.restaurant = (await this._api.get(environment.qmenuApiUrl + "generic", {
          resource: "restaurant",
          query: {
            _id: { $oid: this.restaurantId }
          },
          projection: {
            name: 1,
            rateSchedules: 1,
            logs: 1
          },
          limit: 1
        }).toPromise()).map(r => new Restaurant(r))[0];

        this.orders = (await this._api.get(environment.qmenuApiUrl + "generic", {
          resource: "order",
          query: {
            restaurant: { $oid: this.restaurantId }
          },
          projection: {
            createdAt: 1
          },
          sort: {
            createdAt: -1
          },
          limit: 500
        }).toPromise()).map(o => new Order(o));

        this.invoices = (await this._api.get(environment.qmenuApiUrl + "generic", {
          resource: "invoice",
          query: {
            "restaurant.id": this.restaurantId
          },
          projection: {
            createdAt: 1,
            fromDate: 1,
            toDate: 1,
            balance: 1,
            isPaymentCompleted: 1,
            isPaymentSent: 1,
            isCanceled: 1,
            previousInvoiceId: 1,
            previousBalance: 1
          },
          limit: 700000
        }).toPromise()).map(i => new Invoice(i));

        this.invoices = (this.invoices || []).filter(each => !each.isCanceled);

        // try to set default previous rolled invoice
        const recentInvoices = this.getNonCanceledAndSortedDESCInvoices();
        if (recentInvoices.length > 0) {
          this.setPreviousInvoice(recentInvoices[recentInvoices.length - 1]);
        }
        this.outstandingAdjustmentLogs = (this.restaurant.logs || []).filter(log => !log.resolved && log.adjustmentAmount).map(log => ({
          selected: true,
          log: log
        }));

      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, "Error Pulling Data from API");
      }
    }
  }

  async createNewInvoice() {
    // do some cheap validation here.It should be done as form validation
    if (!this.fromDate || !this.toDate) {
      return alert('From Date and To Date are required!');
    }

    if (new Date(this.fromDate) > new Date(this.toDate)) {
      return alert('From Date must be smaller than To Date');
    }

    if (!this.restaurant) {
      return alert('Missing restaurant');
    }

    const payload = {
      restaurantId: this.restaurantId,
      toDate: this.toDate,
      // fromDate (optional, if not given, we will compute a previous invoice, otherwise ignore previous invoice!)
      ... this.previousInvoice ? {} : { fromDate: this.fromDate },
      balanceThreshold: 0, // override default $10
      payoutThreshold: 0 // override default $50
    };

    console.log(payload);
    try {
      const invoice = await this._api.post(environment.appApiUrl + 'invoices', payload).toPromise();
      this.create.emit({
        invoice: new Invoice(invoice),
        restaurant: this.restaurant
      });
      this._global.publishAlert(AlertType.Success, "Created invoice for " + this.restaurant.name);

    } catch (error) {
      let message = error.error;

      if (typeof message !== 'string') {
        message = "Failed to create the invoice!";
      }
      this._global.publishAlert(AlertType.Danger, message, 60000);
    }

  }

  // return 2017-2-12
  private formatDate(d) {
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) { month = '0' + month; }
    if (day.length < 2) { day = '0' + day; }
    return [year, month, day].join('-');
  }

  getRateSchedules() {
    if (this.restaurant && this.restaurant.rateSchedules) {
      return this.restaurant.rateSchedules;
    }
    return [];
  }

  getError() {
    if (new Date(this.fromDate).valueOf() > new Date(this.toDate).valueOf()) {
      return 'From date can not be greater than to date';
    }
    if (!this.fromDate) {
      return 'From date is required';
    }
    if (!this.toDate) {
      return 'To date is required';
    }
    return null;
  }

  getTotalOrders() {
    if (this.fromDate && this.toDate && this.restaurant && this.restaurant.orders) {
      return this.restaurant.orders.filter(o => o.createdAt.valueOf() >= new Date(this.fromDate).valueOf() && o.createdAt.valueOf() <= new Date(this.toDate).valueOf()).length;
    }
    return 0;
  }

  clickCancel() {
    this.cancel.emit();
  }

  togglePreviousInvoice(invoice) {
    if (this.previousInvoice === invoice) {
      this.previousInvoice = undefined;
    } else {
      this.setPreviousInvoice(invoice);
    }
  }

  setPreviousInvoice(invoice) {
    this.previousInvoice = invoice;
    let suggestedStartDate = new Date(invoice.toDate);
    suggestedStartDate.setDate(suggestedStartDate.getDate() + 1);
    this.fromDate = this.formatDate(suggestedStartDate);
  }

  getNonCanceledAndSortedDESCInvoices() {
    let recentInvoices = (this.invoices || []).filter(i => !i.isCanceled);
    recentInvoices.sort((i1, i2) => i1.toDate.valueOf() - i2.toDate.valueOf());
    return recentInvoices;
  }

}
