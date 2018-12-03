import { Component, OnInit, ViewChild, Input, SimpleChanges, OnChanges } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant, Order } from '@qmenu/ui';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { zip } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-restaurant-invoices',
  templateUrl: './restaurant-invoices.component.html',
  styleUrls: ['./restaurant-invoices.component.css']
})
export class RestaurantInvoicesComponent implements OnInit, OnChanges {
  @ViewChild('rateScheduleEditorModal') rateScheduleEditorModal: ModalComponent;

  // temp. using a shared service to get the value
  @Input() restaurant: Restaurant;

  showInvoiceCreation = false;
  invoiceFromDate = null;
  invoiceToDate = null;
  invoiceCreationError = null;

  constructor(private _route: ActivatedRoute, private _router: Router, private _api: ApiService, private _global: GlobalService) {

    this._route.params.subscribe(
      params => {
        if (!params || !params.id) {
          return;
        }
        this.populateData(params.id);
      });
  }

  ngOnInit() {
  }

  populateData(restaurantId) {
    zip(
      this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "restaurant",
          query: {
            _id: { $oid: restaurantId }
          },
          projection: {
            logo: true,
            name: true,
            images: true,
            offsetToEST: 1,
            rateSchedules: 1,
            paymentMeans: 1,
            logs: 1
          },
          limit: 1
        }),
      this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "invoice",
          query: {
            "restaurant.id": restaurantId
          },
          projection: {
            fromDate: 1,
            toDate: 1,
            total: 1,
            commission: 1,
            subtotal: 1,
            balance: 1,
            status: 1,
            restaurantCcCollected: 1,
            qMenuCcCollected: 1,
            cashCollected: 1,
            "restaurant.id": 1,
            "restaurant.offsetToEST": 1,
            isCanceled: 1,
            isPaymentCompleted: 1,
            isPaymentSent: 1,
            isSent: 1,
            previousInvoiceId: 1,
            previousBalance: 1

          },
          limit: 100
        }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          restaurant: { $oid: restaurantId }
        },
        projection: {
          createdAt: 1
        },
        sort: {
          createdAt: -1
        },
        limit: 500
      })
    )
      .subscribe(
        results => {
          this.restaurant = new Restaurant(results[0][0]);
          let invoices = results[1].map(i => new Invoice(i));
          invoices = (invoices || []).filter(each => !each.isCanceled);
          // sort by end date!
          invoices.sort((i1, i2) => i2.toDate.valueOf() - i1.toDate.valueOf());
          this.restaurant.invoices = invoices;
          const orders = results[2].map(i => new Order(i));
          this.restaurant.orders = orders;
        },
        e => this._global.publishAlert(
          AlertType.Danger,
          "Error pulling data from API"
        )
      );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.restaurant) {
      this.populateData(this.restaurant.id || this.restaurant['_id']);
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

  async createNewInvoice(i) {
    try {
      const invoice = await this._api.post(environment.legacyApiUrl + 'invoice', {
        restaurantId: i.restaurant._id,
        fromDate: new Date(i.fromDate),
        toDate: new Date(i.toDate),
        previousInvoiceId: i.previousInvoiceId,
        previousBalance: i.previousBalance,
        payments: i.payments,
        username: this._global.user.username,
        adjustments: i.adjustments
      }).toPromise();

      invoice._id = invoice._id || invoice.id; // legacy returns id instead of _id
      // we need to update calculated fields!
      const originInvoice = JSON.parse(JSON.stringify(invoice));
      const newInvoice = new Invoice(invoice);
      newInvoice.computeDerivedValues();

      this.restaurant.invoices.unshift(new Invoice(newInvoice));

      const invoiceIds = await this._api
        .patch(environment.qmenuApiUrl + "generic?resource=invoice", [{
          old: originInvoice,
          new: newInvoice
        }]).toPromise();

      this._global.publishAlert(AlertType.Success, "Created invoice for " + i.restaurant.name);
      this.showInvoiceCreation = false;

      // mark adjustment logs as resolved
      if (i.adjustments && i.adjustments.length > 0 && this.restaurant.logs) {
        const oldLogs = this.restaurant.logs;
        const newLogs = JSON.parse(JSON.stringify(oldLogs));
        newLogs.map(log => i.adjustments.map(adjustment => {
          if (adjustment.time === log.time) {
            log.resolved = true;
          }
        }));
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: { _id: this.restaurant['_id'] },
          new: { _id: this.restaurant['_id'], logs: newLogs }
        }]).toPromise();
        this.restaurant.logs = newLogs;
      }

    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, "Error Creating Invoice")
    }

  }


}
