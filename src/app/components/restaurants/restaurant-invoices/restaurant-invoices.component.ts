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

  invoices: Invoice[] = [];

  showInvoiceCreation = false;
  invoiceFromDate = null;
  invoiceToDate = null;
  invoiceCreationError = null;

  constructor(private _route: ActivatedRoute, private _router: Router, private _api: ApiService, private _global: GlobalService) {

  }

  ngOnInit() {
  }

  async populateData(restaurantId) {
    const data = await this._api
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
        limit: 1000,
        sort: {
          toDate: -1
        }
      }).toPromise();
    this.invoices = data.map(i => new Invoice(i));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.restaurant) {
      this.populateData(this.restaurant.id || this.restaurant['_id']);
    }
  }

  async createNewInvoice(result) {
    this.invoices.unshift(result.invoice);
    // also updated restaurant logs!
    this.restaurant.logs = result.restaurant.logs;
    this.showInvoiceCreation = false;

  }

}
