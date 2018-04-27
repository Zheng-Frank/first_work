import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Invoice } from '../../../classes/invoice';
import { ApiService } from "../../../services/api.service";
import { Restaurant, Order, Payment } from '@qmenu/ui';
import { InvoiceEditorComponent } from '../invoice-editor/invoice-editor.component';
import { InvoiceOptionEditorComponent} from '../invoice-option-editor/invoice-option-editor.component';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

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

  constructor(private _route: ActivatedRoute, private _api: ApiService) {
    const self = this;
    this._route.params.subscribe(
      params => {
        this.startDate = new Date(params['startDate']);
        // get endDate
        // let endDate = new Date(params['startDate']);
        // endDate.setMonth(endDate.getMonth() + 1);
        // endDate.setDate(endDate.getDate() - 1);
        // // request restaurant invoices here here!
        // this.restaurantInvoices = [];
        // this._controller
        //   .getRestaurantList()
        //   .zip(this._controller.getInvoiceList(this.startDate, endDate))
        //   .subscribe(results => {
        //     // results[0] is restaurants
        //     // results[1] is invoices
        //     console.log('total invoices: ', results[1].length);
        //     results[0].map(r => {

        //       let record = {
        //         restaurant: r,
        //         // we keep invoices that has time overlaps
        //         invoices: results[1].filter(invoice =>
        //           invoice.restaurant.id === r.id
        //           && Math.max(new Date(invoice.fromDate).valueOf(), this.startDate.valueOf()) < Math.min(new Date(invoice.toDate).valueOf(), endDate.valueOf())).map(i => new Invoice(i))
        //       };

        //       let ccMethods = [];
        //       (r.serviceSettings || []).map(service => {
        //         ['IN_PERSON', 'STRIPE', 'KEY_IN', 'QMENU'].map(paymentMethod => {
        //           if ((service.paymentMethods || []).indexOf(paymentMethod) >= 0) {
        //             ccMethods.push(paymentMethod);
        //           }
        //         });
        //       });

        //       // sort and unique
        //       ccMethods = ccMethods.sort();
        //       ccMethods = Array.from(new Set(ccMethods));
        //       r.creditCardProcessingMethod = ccMethods.join(',');

        //       this.restaurantInvoices.push(record);
        //     });

        //     // let's sort the list!
        //     this.restaurantInvoices.sort((a, b) => a.restaurant.name.toLowerCase().localeCompare(b.restaurant.name.toLowerCase()));
        //   }, err => console.log(err));
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

  shouldShowQmenuRow(record){
    return (!record.restaurant.disabled || this.showCanceledRestaurant)
      && (!this.showQmenuInvoiceOnly || (record.oo.creditCardProcessingMethod.indexOf('QMENU')>=0));
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
            if(!invoice.isCanceled){
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
            if(!invoice.isCanceled){
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
