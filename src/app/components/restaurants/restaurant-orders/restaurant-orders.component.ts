import { Component, OnInit, ViewChild, Input, SimpleChanges, OnChanges } from '@angular/core';
import { Injectable, EventEmitter, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Restaurant, Order } from '@qmenu/ui';
import { Invoice } from '../../../classes/invoice';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { zip } from "rxjs";
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
  private socket: any;
  orderEvent: any;

  constructor(private _api: ApiService, private _ngZone: NgZone) {
    this.socket = io(environment.socketUrl);
  }

  ngOnInit() {
    this.onNewOrderReceived.subscribe(
      d => this.showNotifier(d)
    );

    this.populateOrders();
    this.setSocket(this.restaurant);
  }


  showNotifier(orderEvent) {
    this.orderEvent = orderEvent;
    $('#order-notifier').show(1000); setTimeout(() => { $('#order-notifier').hide(1000); }, 10000);
  }

  setSocket(restaurant: Restaurant) {
    // remove socket listening if there is any
    if (this.restaurant) {
      this.socket.removeAllListeners(this.restaurant['_id']);
    }

    let self = this;
    // subscribe to event if the new customer has id
    if (restaurant) {
      this.socket.on(restaurant['_id'], (data) => {
        self._ngZone.run(() => {
          switch (data.action) {
            case 'ORDER_STATUS':
              data.orderStatus.createdAt = new Date(Date.parse(data.orderStatus.createdAt));
              this.attachNewOrderStatus(data.orderStatus);
              break;
            case 'ORDER_NEW':
              // we should do minimal refresh in future here
              //this.refreshAllOrders(restaurant.id);
              this.onNewOrderReceived.emit(data);
              break;

            default: break;
          }
        });

      });
    }
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

    // pull customer, orderStatus
    const customerIds = orders.map(o => o.customer);
    const promises = [
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: 'customer',
        query: {
          _id: { $in: customerIds.map(customerId => ({ $oid: customerId })) }
        },
        limit: 6000
      }).toPromise(),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: 'orderstatus',
        query: {
          order: { $in: orders.map(order => ({ $oid: order._id })) }
        },
        limit: 6000
      }).toPromise()
    ];

    const results = await Promise.all(promises);
    // assemble back to order:
    this.orders = orders.map(order => {
      order.customer = results[0].filter(c => c._id === order.customer)[0];
      order.payment = order.paymentObj;
      order.orderStatuses = results[1].filter(os => os.order === order._id);
      order.id = order._id;
      return new Order(order);
    });
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
      this._api.post(environment.legacyApiUrl + "customer/ban", { customer: this.orderForModal.customer, reasons: reasons })
        .subscribe(
          d => { this.banModal.hide(); },
          error => console.log(error));
    } else {
      alert('no customer found');
    }
  }

  submitAdjustment(adjustment) {
    this.adjustModal.hide();

    adjustment['orderId'] = this.orderForModal.id;

    this._api.post(environment.legacyApiUrl + "order/adjust", adjustment)
      .subscribe(
        resultedOrder => {
          this.orderForModal.tip = resultedOrder.tip;
          this.orderForModal.orderItems = resultedOrder.orderItems.map(oi => new OrderItem(oi));
        },
        error => { console.log(error); alert('Tech difficulty to adjust order. Please DO NOT retry and call tech support 404-382-9768.'); }
      );
  }
}
