import { Component, OnInit, ViewChild, Input, SimpleChanges, OnChanges, Output } from '@angular/core';
import { Injectable, EventEmitter, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant, Order } from '@qmenu/ui';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Observable, zip } from 'rxjs';

import { mergeMap } from "rxjs/operators";
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { OrderItem } from "@qmenu/ui";
declare var $: any;
declare var io: any;

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

  onNewOrderReceived: EventEmitter<any> = new EventEmitter();


  @Input() restaurant: Restaurant;
  searchText;
  maxCount = 8;
  orders: any;
  resultList;
  showSummary = false;
  payment = {};
  orderForModal: Order = null;
  now: Date = new Date();
  orderEvent: any;

  constructor(private _api: ApiService, private _ngZone: NgZone) {
  }

  ngOnInit() {
    this.onNewOrderReceived.subscribe(
      d => this.showNotifier(d)
    );

    this.populateOrders();
  }


  showNotifier(orderEvent) {
    this.orderEvent = orderEvent;
    $('#order-notifier').show(1000); setTimeout(() => { $('#order-notifier').hide(1000); }, 10000);
  }



  attachNewOrderStatus(orderStatus) {
    // find the order and attach to status
    if (this.orders) {
      this.orders.forEach(o => {
        if (o.id === orderStatus.order) {
          if (!o.orderStatuses) {
            o.orderStatuses = [];
          }
          o.orderStatuses.push(orderStatus);
        }
      });
    }
  }

  onScroll(o) {
    let scrollBottom = $(document).height() - $(window).height() - $(window).scrollTop();
    if (scrollBottom <= 100) {
      this.maxCount++;
    }
  }

  search(event) {
    let regexp = /^[0-9]{3,4}$/; //regular express patternt to match order number 3 or 4 digits
    if (!this.searchText || (this.searchText && regexp.test(this.searchText))) {
      this.populateOrders();
    }
  }
  async populateOrders() {
    const query = {
      restaurant: {
        $oid: this.restaurant._id
      }
    } as any;
    let regexp = /^[0-9]{3,4}$/; //regular express patternt to match order number 3 or 4 digits
    if (this.searchText && regexp.test(this.searchText)) {
      query.orderNumber = +this.searchText
    }

    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: query,
      projection: {
        logs: 0,
      },
      sort: {
        createdAt: -1
      },
      limit: 100
    }).toPromise();

    // assemble back to order:
    this.orders = orders.map(order => {
      order.customer = order.customerObj;
      order.payment = order.paymentObj;
      order.orderStatuses = order.statuses;
      order.id = order._id;
      return new Order(order);
    });
  }

  async handleOnSetNewStatus(data) {

    console.log(data)
    let os: any = {
      order: data.order.id,
      ...data.status,
      updatedBy: 'BY_CSR',
      createdAt: new Date()
    };

    // // let's hide any modal possible
    this.rejectModal.hide();

    return this._api.patch(environment.appApiUrl + 'biz', {
      resource: 'order',
      query: { _id: { $oid: data.order.id } },
      op: '$push',
      field: 'statuses',
      value: os
    }).subscribe(
      result => {
        data.order.orderStatuses.push(os);
      },
      error => {
        alert('Update order status failed');
      }
    );
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

      this._api.get(environment.appApiUrl + "biz/payment", { orderId: order.id })
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

  async okBan(reasons) {
    if (this.orderForModal && this.orderForModal.customer) {


      let op = '$set';
      if (!reasons || reasons.length === 0) {
        op = '$unset';
      }

      const customerQuery = {
        _id: { $oid: this.orderForModal.customer['_id'] }
      };
      const orderQuery =
      {
        customer: { $oid: this.orderForModal.customer['_id'] }
      };

      zip(this._api.patch(environment.appApiUrl + 'biz', {
        resource: 'customer',
        query: customerQuery,
        op: op,
        field: 'bannedReasons',
        value: reasons
      }),
        this._api.patch(environment.appApiUrl + 'biz', {
          resource: 'order',
          query: orderQuery,
          op: op,
          field: "customerObj.bannedReasons",
          value: reasons
        }),
      ).subscribe(
        d => {
          this.banModal.hide();
          this.populateOrders();
        },
        error => console.log(error));

      // this._api.post(environment.legacyApiUrl + "customer/ban", { customer: this.orderForModal.customer, reasons: reasons })
      //   .subscribe(
      //     d => { this.banModal.hide(); },
      //     error => console.log(error));
    } else {
      alert('no customer found');
    }
  }

  async rejectOrder(event) {
    const order = event.order;
    try {
      await this._api.post(environment.appApiUrl + 'biz/orders/cancelation', {
        orderId: event.order.id,
        comments: event.comments
      }).toPromise();
      (order.orderStatuses || []).push({
        status: 'CANCELED',
        comments: event.comments,
        createdAt: new Date()
      });
      this.rejectModal.hide();
    } catch (error) {
      alert('Error on cancelation: ' + JSON.stringify(error));
    }
  }

  async submitAdjustment(adjustment) {
    this.adjustModal.hide();

    console.log(adjustment);
    adjustment['orderId'] = this.orderForModal.id;

    try {
      await this._api.post(environment.appApiUrl + 'biz/orders/adjustment', adjustment).toPromise();
      // lazy, just reload all
      this.populateOrders();
    } catch (error) {
      console.log(error);
      alert('Tech difficulty to adjust order. Please DO NOT retry and call tech support 404-382-9768.');
    }
  }
}
