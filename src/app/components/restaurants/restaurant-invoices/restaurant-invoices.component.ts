import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant, Order } from '@qmenu/ui';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { zip } from "rxjs";
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-restaurant-invoices',
  templateUrl: './restaurant-invoices.component.html',
  styleUrls: ['./restaurant-invoices.component.css']
})
export class RestaurantInvoicesComponent implements OnInit {
  @ViewChild('rateScheduleEditorModal') rateScheduleEditorModal: ModalComponent;

  // temp. using a shared service to get the value
  restaurant: Restaurant;

  showInvoiceCreation = false;
  invoiceFromDate = null;
  invoiceToDate = null;
  invoiceCreationError = null;

  constructor(private _route: ActivatedRoute, private _router: Router, private _api: ApiService, private _global: GlobalService) {

    this._route.params.subscribe(
      params => {
        zip(
          this._api
            .get(environment.qmenuApiUrl + "generic", {
              resource: "restaurant",
              query: {
                _id: { $oid: params['id'] }
              },
              projection: {
                logo: true,
                name: true,
                images: true,
                offsetToEST: 1,
                rateSchedules: 1
              },
              limit: 1
            }),
          this._api
            .get(environment.qmenuApiUrl + "generic", {
              resource: "invoice",
              query: {
                "restaurant.id": params['id']
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
                isSent: 1

              },
              limit: 100
            }),
          this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "order",
            query: {
              restaurant: { $oid: params['id'] }
            },
            projection: {
              createdAt: 1
            },
            limit: 10000
          })
        )
          .subscribe(
            results => {
              this.restaurant = new Restaurant(results[0][0]);
              const invoices = results[1].map(i => new Invoice(i));
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
      });
  }

  ngOnInit() {
  }

}
