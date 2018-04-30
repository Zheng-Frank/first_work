import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Invoice } from '../../../classes/invoice';
import { ApiService } from "../../../services/api.service";
import { Restaurant, Order, Payment } from '@qmenu/ui';
import { InvoiceEditorComponent } from '../invoice-editor/invoice-editor.component';
import { InvoiceOptionEditorComponent } from '../invoice-option-editor/invoice-option-editor.component';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { GlobalService } from '../../../services/global.service';
import { zip } from "rxjs";
import { environment } from "../../../../environments/environment";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-invoice-monthly-details',
  templateUrl: './invoice-monthly-details.component.html',
  styleUrls: ['./invoice-monthly-details.component.css']
})
export class InvoiceMonthlyDetailsComponent implements OnInit {

  @ViewChild('myInvoiceEditor') myInvoiceEditor: InvoiceEditorComponent;
  @ViewChild('myInvoiceOptionEditor') myInvoiceOptionEditor: InvoiceOptionEditorComponent;
  @ViewChild('invoiceModal') invoiceModal: ModalComponent;
  @ViewChild('invoiceOptionModal') invoiceOptionModal: ModalComponent;

  startDate = new Date();
  restaurantInvoices = [];

  showCanceledRestaurant = true;
  showRestaurantWithInvoiceOnly = false;
  showQmenuInvoiceOnly = false;
  showKeyInInvoiceOnly = false;
  showStripeInvoiceOnly = false;
  showInPersonInvoiceOnly = false;

  invoiceStates = [
    { label: 'Invoice Sent?', value: 'any', css: 'text-primary', status: 'isSent' },
    { label: 'Payment Sent?', value: 'any', css: 'text-warning', status: 'isPaymentSent' },
    { label: 'Payment Completed?', value: 'any', css: 'text-success', status: 'isPaymentCompleted' },
    { label: 'Invoice Canceled?', value: 'any', css: 'text-danger', status: 'isCanceled' },
  ];

  constructor(private _route: ActivatedRoute, private _api: ApiService, private _global: GlobalService) {
    const self = this;
    this._route.params.subscribe(
      params => {
        this.startDate = new Date(params['startDate']);
        let startDate = this.startDate;

        let endDate = new Date(params['startDate']);
        endDate.setMonth(endDate.getMonth() + 1);


        // due to each restaurant's time offset, we need to include a litte more than we need to make sure query returns results correctly
        const fromDateE = new Date(startDate);
        const toDateE = new Date(endDate);

        fromDateE.setHours(fromDateE.getHours() - 12);
        toDateE.setHours(toDateE.getHours() + 12);


        const fromDateS = new Date(startDate);
        const toDateS = new Date(endDate);

        fromDateS.setHours(fromDateS.getHours() + 12);
        toDateS.setHours(toDateS.getHours() - 12);

        // 
        endDate.setDate(endDate.getDate() - 1);
        // request restaurant invoices here here!
        this.restaurantInvoices = [];
        zip(
          this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "invoice",
            query: {
              $and: [
                {
                  fromDate: { $lte: { $date: toDateE } }
                },
                {
                  toDate: { $gte: { $date: fromDateE } }
                }]
            },
            projection: {
              fromDate: true,
              toDate: true,
              total: true,
              commission: true
            },
            limit: 80000
          }),
          this._api.get(environment.qmenuApiUrl + "generic", {
            resource: "restaurant",
            projection: {
              name: 1,
              address: 1,
              serviceSettings: true
            },
            limit: 10000
          })
        ).subscribe(
          results => {
            console.log(results);
            // here we group invoices by restaurant1
            console.log('A');

            let restaurantInvoiceDict = {};
            results[0].map(invoice => {
              let r_id = invoice.restaurant.id; // we didn't use _id in restaurant body :()
              restaurantInvoiceDict[r_id] = restaurantInvoiceDict[r_id] || [];
              restaurantInvoiceDict[r_id].push(new Invoice(invoice));
            });

            results[1].map(r => {
              let record = {
                restaurant: r,
                invoices: restaurantInvoiceDict[r._id] || []
                // we keep invoices that has time overlaps
                // invoices: results[0].filter(invoice =>
                //   r._id && r._id === invoice.restaurant._id
                //   && Math.max(new Date(invoice.fromDate).valueOf(), this.startDate.valueOf()) < Math.min(new Date(invoice.toDate).valueOf(), endDate.valueOf())).map(i => new Invoice(i))
              };

              console.log(record.invoices.length)

              let ccMethods = [];
              (r.serviceSettings || []).map(service => {
                ['IN_PERSON', 'STRIPE', 'KEY_IN', 'QMENU'].map(paymentMethod => {
                  if ((service.paymentMethods || []).indexOf(paymentMethod) >= 0) {
                    ccMethods.push(paymentMethod);
                  }
                });
              });

              // sort and unique
              ccMethods = ccMethods.sort();
              ccMethods = Array.from(new Set(ccMethods));
              r.creditCardProcessingMethod = ccMethods.join(',');

              this.restaurantInvoices.push(record);

              
            });
console.log('B')
            // let's sort the list!
            this.restaurantInvoices.sort((a, b) => a.restaurant.name.toLowerCase().localeCompare(b.restaurant.name.toLowerCase()));
          }, error => {
            this._global.publishAlert(AlertType.Danger, "Error Pulling Data from API");
          });

        //   this._api
        //     .getRestaurantList()
        //     .zip(this._controller.getInvoiceList(this.startDate, endDate))
        //     .subscribe(results => {
        //       // results[0] is restaurants
        //       // results[1] is invoices
        //       console.log('total invoices: ', results[1].length);
        //       results[0].map(r => {

        //         let record = {
        //           restaurant: r,
        //           // we keep invoices that has time overlaps
        //           invoices: results[1].filter(invoice =>
        //             invoice.restaurant.id === r.id
        //             && Math.max(new Date(invoice.fromDate).valueOf(), this.startDate.valueOf()) < Math.min(new Date(invoice.toDate).valueOf(), endDate.valueOf())).map(i => new Invoice(i))
        //         };

        //         let ccMethods = [];
        //         (r.serviceSettings || []).map(service => {
        //           ['IN_PERSON', 'STRIPE', 'KEY_IN', 'QMENU'].map(paymentMethod => {
        //             if ((service.paymentMethods || []).indexOf(paymentMethod) >= 0) {
        //               ccMethods.push(paymentMethod);
        //             }
        //           });
        //         });

        //         // sort and unique
        //         ccMethods = ccMethods.sort();
        //         ccMethods = Array.from(new Set(ccMethods));
        //         r.creditCardProcessingMethod = ccMethods.join(',');

        //         this.restaurantInvoices.push(record);
        //       });

        //       // let's sort the list!
        //       this.restaurantInvoices.sort((a, b) => a.restaurant.name.toLowerCase().localeCompare(b.restaurant.name.toLowerCase()));
        //     }, err => console.log(err));
      });
  }
  ngOnInit() {
  }

  getCssClass(invoice: Invoice) {
    return invoice.isCanceled ? 'text-danger' : (invoice.isPaymentCompleted ? 'text-success' : (invoice.isPaymentSent ? 'text-warning' : (invoice.isSent ? 'text-primary' : 'text-seconday')));
  }


  createClicked(restaurantId) {
    // // let's make a dummy restaurant first, then request actual body!
    // let restaurant = new Restaurant();
    // this.myInvoiceEditor.setRestaurant(restaurant);
    // // pre-set fromDate and toDate
    // const date = this.startDate;
    // this.myInvoiceEditor.fromDate = this.formatDate(new Date(date.getFullYear(), date.getMonth(), 1));
    // this.myInvoiceEditor.toDate = this.formatDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    // // request the body asyn
    // let self = this;
    // // a function to request orders, called after we have restaurant details loaded
    // const requestOrders = function (r) {
    //   self._controller.getOrdersByRestaurantId(r.id).subscribe(
    //     orders => {
    //       r.orders = orders.map(o => new Order(o));
    //     },
    //     e => console.log(e)
    //   );
    // };

    // this._controller.getRestaurantById(restaurantId).subscribe(
    //   r => { Object.assign(restaurant, r); requestOrders(restaurant); },
    //   e => console.log(e)
    // );

    // this.invoiceModal.show();
  }

  invoiceClicked(restaurantId) {
    // // let's make a dummy restaurant first, then request actual body!
    // let restaurant = new Restaurant();
    // this.myInvoiceOptionEditor.setRestaurant(restaurant);
    // // pre-set fromDate and toDate
    // const date = this.startDate;
    // /*this.myInvoiceOptionEditor.fromDate = this.formatDate(new Date(date.getFullYear(), date.getMonth(), 1));
    // this.myInvoiceOptionEditor.toDate = this.formatDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));*/
    // // request the body asyn
    // let self = this;
    // // a function to request orders, called after we have restaurant details loaded
    // const requestOrders = function (r) {
    //   self._controller.getOrdersByRestaurantId(r.id).subscribe(
    //     orders => {
    //       r.orders = orders.map(o => new Order(o));
    //     },
    //     e => console.log(e)
    //   );
    // };

    // this._controller.getRestaurantById(restaurantId).subscribe(
    //   r => { Object.assign(restaurant, r); requestOrders(restaurant); },
    //   e => console.log(e)
    // );

    // this.invoiceOptionModal.show();
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

  createNewInvoice(i) {
    // this.invoiceModal.hide();
    // this._controller.createInvoice(i.restaurant.id, new Date(i.fromDate), new Date(i.toDate))
    //   .subscribe(
    //   invoice => {
    //     this.restaurantInvoices.map(ri => {
    //       if (ri.restaurant.id === i.restaurant.id) {
    //         ri.invoices = ri.invoices || [];
    //         ri.invoices.push(new Invoice(invoice));
    //       }
    //     });
    //   },
    //   err => { this._controller.emitAlert('Failed to create invoice :('); }
    //   );
  }

  private desc = false;
  sort(field) {
    this.desc = !this.desc;
    this.restaurantInvoices.sort((r1, r2) => {
      if (this.desc) {
        return (r2.restaurant[field] || '').localeCompare(r1.restaurant[field] || '');
      } else {
        return (r1.restaurant[field] || '').localeCompare(r2.restaurant[field] || '');
      }
    });
  }

  shouldShowQmenuRow(record) {
    return (!record.restaurant.disabled || this.showCanceledRestaurant)
      && (!this.showQmenuInvoiceOnly || (record.oo.creditCardProcessingMethod.indexOf('QMENU') >= 0));
  }

  shouldShowInvoiceRow(record) {
    return (!record.restaurant.disabled || this.showCanceledRestaurant)
      && (!this.showRestaurantWithInvoiceOnly || (record.invoices).some(invoice => this.shouldShowSubrow(invoice)));
  }

  shouldShowSubrow(invoice) {
    return !(this.invoiceStates.some(state => state.value === 'yes' && !invoice[state.status] || state.value === 'no' && invoice[state.status]));
  }

  getFilteredInvoices(record) {
    return record.invoices.filter(invoice => this.shouldShowSubrow(invoice));
  }

  getCommission() {
    return this.restaurantInvoices.reduce((sum, record) => {
      if ((!record.restaurant.disabled || this.showCanceledRestaurant) && record.invoices) {
        sum += record.invoices.reduce((subtotal, invoice) => {
          if (this.shouldShowSubrow(invoice)) {
            if (!invoice.isCanceled) {
              subtotal += invoice.getCommission();
            }
          }
          return subtotal;
        }, 0);
      }
      return sum;
    }, 0);
  }

  getTotal() {
    return this.restaurantInvoices.reduce((sum, record) => {
      if ((!record.restaurant.disabled || this.showCanceledRestaurant) && record.invoices) {
        sum += record.invoices.reduce((subtotal, invoice) => {
          if (this.shouldShowSubrow(invoice)) {
            if (!invoice.isCanceled) {
              subtotal += invoice.getTotal();
            }
          }
          return subtotal;
        }, 0);
      }
      return sum;
    }, 0);
  }

  createInvoiceOption(event) {
    // this method is missing and the build won't work without this
  }

}
