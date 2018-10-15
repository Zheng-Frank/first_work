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
import { OrderItem } from "@qmenu/ui";
declare var $: any;
@Component({
  selector: 'app-restaurant-orders',
  templateUrl: './restaurant-orders.component.html',
  styleUrls: ['./restaurant-orders.component.css']
})

export class RestaurantOrdersComponent implements OnInit {
  @ViewChild('paymentModal') paymentModal: ModalComponent;
  @ViewChild('rejectModal') rejectModal: ModalComponent;
  @ViewChild('banModal') banModal: ModalComponent;
  @ViewChild('adjustModal') adjustModal: ModalComponent;

  @Input() restaurant: Restaurant;
  searchText;
  maxCount = 8;
  orders: any;
  showSummary = false;
  payment = {};
  orderForModal: Order = null;
  now: Date = new Date();

  constructor(private _api: ApiService, private _global: GlobalService) {


  }

  async ngOnInit() {
    console.log(this.restaurant);
    this.orders = await this._api.get('http://localhost:1337/' + 'order/getOrdersByRestaurantId/' + this.restaurant['_id'], { limit: 500 }).toPromise();
    this.orders = this.orders.map(o => new Order(o));
    console.log(this.orders);

  }

  onScroll(o) {
    let scrollBottom = $(document).height() - $(window).height() - $(window).scrollTop();
    if (scrollBottom <= 100) {
      this.maxCount++;
    }
  }


  getRecentOrders() {
    // we get only unfinished orders + today's orders
    // filter
    let list = this.orders;
    if (this.searchText) {
      let key = this.searchText;
      list = list.filter(order => {
        return (order.orderNumber + '').startsWith(key)
          || (order.customer && order.customer.phone && order.customer.phone.startsWith(key))
          || (order.customer && order.customer.firstName && order.customer.firstName.toLowerCase().startsWith(key.toLowerCase()))
          || (order.customer && order.customer.lastName && order.customer.lastName.toLowerCase().startsWith(key.toLowerCase()));
      });
    }

    return list.slice(0, this.maxCount);
  }

  async handleOnSetNewStatus(data) {
    let os: any = {};
    os.order = data.order.id;
    os.status = data.status;
    os.comments = data.comments;
    os.updatedBy = 'BY_RESTAURANT';


    await this._api.post(environment.legacyApiUrl + "orderStatus", os).toPromise();

    // let's fake putting the status to the order, db posting was slow to response and will result duplicated status
    os.createdAt = new Date();
    data.order.orderStatuses.push(os);

    // let's hide any modal possible
    this.rejectModal.hide();
  }

  handleOnDisplayCreditCard(order) {
    const explanations = {
      IN_PERSON: 'NO CREDIT CARD INFO WAS COLLECTED. THE CUSTOMER WILL SWIPE CARD IN PERSON.',
      QMENU: 'qMenu collected the money for restaurant.',
      STRIPE: 'The money was deposited to your Stripe account directly.',
      KEY_IN: 'PLEASE KEY-IN THE CREDIT CARD NUMBERS TO COLLECT THE ORDER MONEY.'
    };
    Object.assign(this.payment, order.payment);
    this.payment['explanation'] = explanations[order.payment.creditCardProcessingMethod || 'non-exist'];

    if (order.payment && order.payment.creditCardProcessingMethod === 'IN_PERSON') {
      this.paymentModal.show();
    } else {
      //  The payment of order was stripped off details due to security reasons. We need to get payment details from API.

      this._api.post(environment.legacyApiUrl + "order/paymentDetails", { orderId: order.id })
        .subscribe(
          payment => {
            Object.assign(this.payment, payment);
            this.paymentModal.show();
          },
          error => {
            console.log(error);
            let errorString = error._body || 'error in retrieving creditcard';
            alert(errorString);
          });
    }
  }




  save(filename, data) {
    //let blob = new Blob([data], { type: 'text/csv' });
    let blob = new Blob(["\ufeff", data]);
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      let elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    }
  };

  csvEscape(thing) {
    // enclose everything with double quote and escape double quote!
    thing = (thing + '').replace('""', '"');
    return '"' + thing + '"';
  };

  handleOnAdjust(order) {
    this.orderForModal = order;
    this.adjustModal.show();
    setTimeout(() => $('#adjustment').focus(), 1000);
  }

  handleOnReject(order) {
    this.orderForModal = order;
    this.rejectModal.show();
  }

  handleOnBan(order) {
    this.orderForModal = order;
    this.banModal.show();
  }

  getFormattedCreditCardNumber(number) {
    return (number || '').split('').reduce((a, e, i) => a + e + (i % 4 === 3 && (i < number.length - 1) ? '-' : ''), '');
  }

  okBan(reasons) {
    if (this.orderForModal && this.orderForModal.customer) {
      this._api.post(environment.legacyApiUrl + "customer/ban",  { customer: this.orderForModal.customer, reasons: reasons })
        .subscribe(
          d => { this.banModal.hide(); },
          error => console.log(error));
    } else {
      alert('no customer found');
    }
  }



  submitAdjustment(adjustment) {
    this.adjustModal.hide();

    console.log(adjustment);
    adjustment['orderId'] = this.orderForModal.id;

    this._api.post(environment.legacyApiUrl + "order/adjust",  adjustment)
    .subscribe(
      resultedOrder => {
        this.orderForModal.tip = resultedOrder.tip;
        this.orderForModal.orderItems = resultedOrder.orderItems.map(oi => new OrderItem(oi));
      },
      error => { console.log(error); alert('Tech difficulty to adjust order. Please DO NOT retry and call tech support 404-382-9768.'); }
    );
  }


}
