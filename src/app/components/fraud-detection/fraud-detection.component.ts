import {Component, EventEmitter, NgZone, OnInit, ViewChild} from '@angular/core';
import {Order, Restaurant, TimezoneHelper} from '@qmenu/ui';
import {ModalComponent} from '@qmenu/ui/bundles/qmenu-ui.umd';
import {ApiService} from '../../services/api.service';
import {GlobalService} from '../../services/global.service';
import {AlertType} from '../../classes/alert-type';
import {environment} from '../../../environments/environment';
import {Log} from '../../classes/log';

declare var $: any;

@Component({
  selector: 'app-fraud-detection',
  templateUrl: './fraud-detection.component.html',
  styleUrls: ['./fraud-detection.component.css']
})
export class FraudDetectionComponent implements OnInit {
  @ViewChild('paymentModal') paymentModal: ModalComponent;
  @ViewChild('rejectModal') rejectModal: ModalComponent;
  @ViewChild('undoRejectModal') undoRejectModal: ModalComponent;
  @ViewChild('banModal') banModal: ModalComponent;
  @ViewChild('previousOrdersModal') previousOrdersModal: ModalComponent;
  @ViewChild('logEditingModal') logEditingModal: ModalComponent;
  orderForModal = new Order();
  payment = {};
  cardSpecialOrder;
  onNewOrderReceived: EventEmitter<any> = new EventEmitter();
  maxCount = 8;
  orders: Order[];
  restaurantAddress = {} as any;
  resultList;
  showSummary = false;
  orderEvent: any;
  cancelError = '';
  undoOrder: any;
  isPostmatesStatusDelivered = false;
  createdAt;
  previousOrders = [];
  showTip = false;
  restaurant: Restaurant;
  logInEditing = new Log();

  constructor(private _api: ApiService, private _global: GlobalService, private _ngZone: NgZone) {
  }

  async ngOnInit() {
    await this.getRTs();
    await this.search();
    this.onNewOrderReceived.subscribe(
      d => this.showNotifier(d)
    );
  }

  showNotifier(orderEvent) {
    this.orderEvent = orderEvent;
    $('#order-notifier').show(1000);
    setTimeout(() => {
      $('#order-notifier').hide(1000);
    }, 10000);
  }

  onScroll(o) {
    let scrollBottom = $(document).height() - $(window).height() - $(window).scrollTop();
    if (scrollBottom <= 100) {
      this.maxCount++;
    }
  }

  async getRTs() {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {disabled: {$ne: true}},
      projection: {
        'googleAddress.timezone': 1,
        'googleAddress.formatted_address': 1,
        'googleAddress.lat': 1,
        'googleAddress.lng': 1
      }
    }, 10000);
    restaurants.forEach(rt => {
      this.restaurantAddress[rt._id] = rt.googleAddress;
    });
  }

  async search() {

    let query = {
      'paymentObj.method': {$ne: 'KEY_IN'},
      $or: [
        {'computed.total': {$gt: 150}}, // order total over $150
        {'ccAddress.distanceToStore': {$gte: 200}} // billing address 200 miles from delivery address
      ]
    } as object;

    let toDate = new Date(), fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 1);

    if (this.createdAt) {
      fromDate = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.createdAt + ' 00:00:00.000'), 'America/New_York');
      toDate = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.createdAt + ' 23:59:59.999'), 'America/New_York');
    }

    query = {
      ...query,
      $and: [
        {createdAt: {$gte: {$date: fromDate}}},
        {createdAt: {$lte: {$date: toDate}}}
      ]
    };

    // ISO-Date()
    const orders = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: query,
      projection: {logs: 0},
      sort: {createdAt: -1},
      limit: 150
    }, 50);
    const customerIds = orders.filter(order => order.customer).map(order => order.customer);
    const previousOrders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
        'customerObj._id': { $in: customerIds }
      },
      projection: {
        _id: 1,
        customer: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 10000,
    }).toPromise();
    orders.forEach(order => {
      order.previousOrders = [];
      previousOrders.forEach(previousOrder => {
        if (order.customer === previousOrder.customer && order._id !== previousOrder._id) {
          order.previousOrders.push(previousOrder);
        }
      });
    });

    this.orders = await this.prepareOrders(orders, customerIds);
  }

  async getBlackList(customerIds) {
    return await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'blacklist',
      query: {'value': {$in: customerIds}, disabled: {$ne: true}},
      projection: {disabled: 1, reasons: 1, value: 1, orders: 1},
      limit: 100000,
      sort: {createAt: 1}
    }).toPromise();
  }

  async prepareOrders(orders, customerIds) {
    const blacklist = await this.getBlackList(customerIds);
    const customerIdBannedReasonsDict = blacklist.reduce((dict, item) => (dict[item.value] = item, dict), {});
    // assemble back to order:
    return orders.map(order => {
      order.restaurantAddress = this.restaurantAddress[order.restaurant];
      order.customer = order.customerObj;
      order.payment = order.paymentObj;
      order.id = order._id;
      order.customerNotice = order.customerNotice || '';
      order.restaurantNotie = order.restaurantNotie || '';
      // making it back-compatible to display bannedReasons
      order.customer.bannedReasons = (customerIdBannedReasonsDict[order.customerObj._id] || {}).reasons;
      return new Order(order);
    });
  }

  getMapLink(order) {
    let origin = this.restaurantAddress[order.restaurant].formatted_address,
      destination = order.ccAddress.formatted_address;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  }

  getCustomerName(order: Order) {
    if (order.customer && (order.customer.firstName || order.customer.lastName)) {
      // to avoid "Sunny undefined" situation
      return (order.customer.firstName || '') + ' ' + (order.customer.lastName || '');
    }
    return null;
  }

  getBannedReasons(order: Order) {
    return order.customer && order.customer.bannedReasons && order.customer.bannedReasons.join(', ');
  }

  getCustomerPhoneNumber(order: Order) {
    if (order.customer) {
      return order.customer.phone;
    }
    return null;
  }

  async showPreviousOrders(previousOrders) {
    let orders = [];
    for (let i = 0; i < previousOrders.length; i++) {
      const previousOrder = previousOrders[i];
      const tempOrders = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {_id: {$oid: previousOrder._id}},
        projection: {logs: 0},
        sort: {createdAt: -1},
        limit: 1
      }).toPromise();
      orders.push(tempOrders[0]);
    }
    const customerIds = orders.filter(order => order.customer).map(order => order.customer);
    // assemble back to order:
    this.previousOrders = await this.prepareOrders(orders, customerIds);
    this.previousOrdersModal.show();
  }

  handleOnDisplayCreditCard(order) {
    const explanations = {
      IN_PERSON: 'NO CREDIT CARD INFO WAS COLLECTED. THE CUSTOMER WILL SWIPE CARD IN PERSON.',
      QMENU: 'qMenu collected the money for restaurant.',
      STRIPE: 'The money was deposited to your Stripe account directly.',
      KEY_IN: 'PLEASE KEY-IN THE CREDIT CARD NUMBERS TO COLLECT THE ORDER MONEY.'
    };
    this.payment = JSON.parse(JSON.stringify(order.payment));
    this.payment['explanation'] = explanations[order.payment.method || 'non-exist'];

    if (order.payment && order.payment.method === 'IN_PERSON') {
      this.paymentModal.show();
    } else {
      //  The payment of order was stripped off details due to security reasons. We need to get payment details from API.

      this._api.get(environment.appApiUrl + 'biz/payment', {orderId: order.id})
        .subscribe(
          payment => {
            this.payment = JSON.parse(JSON.stringify(payment));
            this.payment['explanation'] = explanations[order.payment.method || 'non-exist'];
            this.paymentModal.show();
          },
          error => {
            console.log(error);
            let errorString = error._body || 'error in retrieving creditcard';
            alert(errorString);
          });
    }
  }

  getCustomerEmail(order: Order) {
    if (order.customer) {
      return order.customer.email;
    }
    return null;
  }

  getSubmittedTime(order: Order) {
    return new Date(order.createdAt);
  }

  getUpdatedStatuses(order: Order) {
    (order.delivery.updates || []).sort((a, b) => (new Date(a.created)).valueOf() - (new Date(b.created)).valueOf());
    const updates = (order.delivery.updates || [])
      .filter((update, index, self) => self.findIndex(_update => (_update.status === update.status)) === index);
    return updates;
  }

  isViewable(order: Order) {
    return this.isAdmin() || !(order.payment.paymentType === 'CREDITCARD' && order.payment.method === 'KEY_IN');
  }

  isCanceled(order: Order) {
    // status are not completed, not canceled, and time is not over 2 days
    // 1000 * 3600 * 48 = 172800000
    return order.statusEqual('CANCELED');
  }

  isBanned(order: Order) {
    // 如果order.customer当前属性值为undefined ,则当前用户未被禁止
    // （If customer 'property named bannedReasons is undefined,he is not banned!）
    return order && order.customer && order.customer.bannedReasons
      && order.customer.bannedReasons instanceof Array && order.customer.bannedReasons.length > 0;
  }

  /**
   *this function is used to get order canceled time (who canceled the order)
   *
   * @param {*} order
   * @memberof OrderCardComponent
   */
  getOrderCanceledTime(order) {
    const status = order.statuses.filter(statuses => statuses.status === 'CANCELED');
    if (status.length > 0) {
      return status[0].createdAt;
    }
  }

  whoCancelOrder(order: Order) {
    const status = order.statuses.filter(statuses => statuses.status === 'CANCELED');
    if (status.length > 0) {
      return status[0].updatedBy;
    }
  }

  isAdmin() {
    return this._global.user.roles.some(r => r === 'ADMIN');
  }

  canCancel(order: Order) {
    // status are not completed, not canceled, and time is not over 3 days
    // if admin and not qmenu collect
    return (
      !(order.statusEqual('CANCELED'))
      && (new Date().valueOf() - new Date(order.timeToDeliver || order.createdAt).valueOf() < 90 * 24 * 3600 * 1000)
    ) || (this.isAdmin() && order.payment.method !== 'QMENU');
  }

  canShowCreditCard(order: Order) {
    return order.payment.paymentType === 'CREDITCARD' && this.isAdmin();
  }

  getOrderLink(order: Order) {
    return `${environment.utilsApiUrl}renderer?orderId=${order.id}&template=restaurantOrderFax&format=pdf`;
  }

  postmatesStatus(status) {
    switch (status) {
      case 'pickup':
        return 'Picking up the food';

      case 'pickup_complete':
        return 'Picked up the food';

      case 'delivered':
        return 'Delivered';

      case 'dropoff':
        return 'Delivering';

      case 'pending':
        return 'Pending';
    }
  }

  /**
   * When click on "copy" button, should put the following text in the user's clipboard:
   "RT: [rt_id], Order# [XX] ([Mmm DD HH:MM AM/PM])"
   */
  copyToClipboard(order) {
    const cloned = order.createdAt.toLocaleString('en-US', {timeZone: order.restaurantTimezone});
    // let createdAt = moment(cloned).format("Mmm dd h:mm a");
    let createdAt = cloned.split(',')[0];
    let text = `RT: ${order.restaurant}, Order# ${order.orderNumber} (${createdAt})`;
    const handleCopy = (e: ClipboardEvent) => {
      // clipboardData 可能是 null
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', text);
      }
      e.preventDefault();
      // removeEventListener 要传入第二个参数
      document.removeEventListener('copy', handleCopy);
    };
    document.addEventListener('copy', handleCopy);
    document.execCommand('copy');
    this._global.publishAlert(AlertType.Success, 'the data of order has copyed to your clipboard ~', 1000);
  }

  save(filename, data) {
    let blob = new Blob(['\ufeff', data]);
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
  }

  handleOnReject(order) {
    this.orderForModal = order;
    this.isPostmatesStatusDelivered = this.orderForModal && this.orderForModal['delivery']
      && this.orderForModal['delivery'].status === 'delivered';
    this.rejectModal.show();
  }

  handleOnUndoReject(order) {
    this.undoOrder = order;
    this.undoRejectModal.show();
  }

  handleOnBan(order: Order) {
    // 判断 customer 的bannerReason 属性是否为false
    // judge customer 's property ,bannerReasons (is it undefined?)
    if (order && order.customer && order.customer.bannedReasons
      && order.customer.bannedReasons instanceof Array && order.customer.bannedReasons.length > 0) {
      this.orderForModal = order;
      this.okBan([]);
    } else {
      this.orderForModal = order;
      this.banModal.show();
    }
  }

  getFormattedCreditCardNumber(number) {
    return (number || '').split('').reduce((a, e, i) => a + e + (i % 4 === 3 && (i < number.length - 1) ? '-' : ''), '');
  }

  async okBan(reasons) {

    if (!this.orderForModal || !this.orderForModal.customer) {
      alert('No customer found');
      return;
    }
    const customerId = this.orderForModal.customer['_id'];
    // extract email, phone, and addresses
    const customer = await this._api.get(`${environment.appApiUrl}app/customer?customerId=${customerId}`).toPromise();

    const customerOrders = (this.orders || []).filter(order => order.customerObj && order.customerObj._id === customerId);
    const getOrderSkeleton = (order) => {
      const o = new Order(order);
      return {
        _id: order._id || order.id,
        paymentObj: {method: (order.paymentObj || {}).method},
        type: order.type,
        restaurantObj: {
          _id: order.restaurant,
          name: order.restaurantObj.name,
        },
        customerObj: order.customerObj,
        address: {
          formatted_address: (order.address || {}).formatted_address,
          lat: (order.address || {}).lat,
          lng: (order.address || {}).lng
        }
      };
    };

    const generatedBlacklist = {}; // value: item
    for (let ip of customer.ips || []) {
      generatedBlacklist[ip] = {
        type: 'IP',
        value: ip,
        orders: customerOrders.map(order => getOrderSkeleton(order)),
        reasons: reasons
      };
    }

    // NOTE: we no longer use customer.bannedReasons. instead, we a blacklist item, type 'CUSTOMER' to indicate if the customer is banned
    generatedBlacklist[customer._id] = {
      type: 'CUSTOMER',
      value: customer._id,
      orders: customerOrders.map(order => getOrderSkeleton(order)),
      reasons: reasons
    };

    if (customer.phone) {
      generatedBlacklist[customer.phone] = {
        type: 'PHONE',
        value: customer.phone,
        orders: customerOrders.map(order => getOrderSkeleton(order)),
        reasons: reasons
      };
    }
    if (customer.email) {
      generatedBlacklist[customer.email] = {
        type: 'EMAIL',
        value: customer.email,
        orders: customerOrders.map(order => getOrderSkeleton(order)),
        reasons: reasons
      };
    }
    if (customer.socialId) {
      generatedBlacklist[customer.socialId] = {
        type: 'SOCIAL',
        value: customer.socialId,
        orders: customerOrders.map(order => getOrderSkeleton(order)),
        reasons: reasons
      };
    }

    for (let order of customerOrders) {
      if (order.address && order.address.formatted_address) {
        // only add unique formatted_address. filling orders to it
        generatedBlacklist[order.address.formatted_address] = generatedBlacklist[order.address.formatted_address] || {
          type: 'ADDRESS',
          value: order.address.formatted_address,
          orders: [],
          reasons: reasons
        };
        const orderSkeleton = getOrderSkeleton(order);
        generatedBlacklist[order.address.formatted_address].orders.push(orderSkeleton);
      }
    }

    const existingBlackList = await this._api.get(`${environment.appApiUrl}app/blacklist?values=${encodeURIComponent(JSON.stringify(Object.keys(generatedBlacklist)))}`).toPromise();
    if (!reasons || reasons.length === 0) {  // 黑名单启用 ,顾客被禁止（Blacklist abandoned, customers banned）
      // no reason is provided? disable them
      const enabledExistingblacklist = existingBlackList.filter(b => !b.disabled);
      for (let item of enabledExistingblacklist) {
        await this._api.patch(`${environment.appApiUrl}app`, {
          resource: 'blacklist',
          query: {
            _id: {
              $oid: item._id
            }
          },
          op: '$set', // 更新 update
          field: 'disabled',
          value: true
        }).toPromise();
      }
    } else {
      // insert new ones!
      const newKeys = Object.keys(generatedBlacklist).filter(key => !existingBlackList.some(ei => ei.value === key));
      if (newKeys.length > 0) {
        await this._api.post(`${environment.appApiUrl}app`, {
          resource: 'blacklist',
          objects: newKeys.map(key => generatedBlacklist[key])
        }).toPromise();
      }

      // for existing items, we add new reasons and enable them!
      const updatedItems = existingBlackList.filter(ei => reasons.some(reason => ei.disabled || (ei.reasons || []).indexOf(reason) < 0));
      for (let item of updatedItems) {
        await this._api.patch(`${environment.appApiUrl}app`, {
          resource: 'blacklist',
          query: {
            _id: {$oid: item._id}
          },
          op: '$set',
          field: 'reasons',
          value: [...new Set([...item.reasons, ...reasons])]
        }).toPromise();
        //      ${environment.qmenuApiUrl}generic
        await this._api.patch(`${environment.appApiUrl}app`, {
          resource: 'blacklist',
          query: {
            _id: {$oid: item._id}
          },
          op: '$unset',
          field: 'disabled',
          value: null
        }).toPromise();
      }
    }
    this.banModal.hide(); // 隐藏模块（hide the dialog）
    await this.search(); // 刷新订单界面(refresh order bound)
  }

  async rejectOrder(event) {
    const order = event.order;
    try {
      await this._api.post(environment.appApiUrl + 'biz/orders/cancelation', {
        orderId: event.order.id,
        comments: event.comments
      }).toPromise();
      (order.statuses || []).push({
        status: 'CANCELED',
        comments: event.comments,
        createdAt: new Date()
      });
      this.rejectModal.hide();
    } catch (error) {
      if (error && error.error.code === 'noncancelable_delivery') {
        this.cancelError = 'Can not cancel. Order is on its way.';
      } else {
        this.cancelError = error.error || JSON.stringify(error);
      }
      console.log(error);
    }
  }

  async undoRejectOrder() {

    if ((this.undoOrder && this.undoOrder.paymentObj) &&
      (this.undoOrder.paymentObj.method !== 'QMENU') &&
      (this.undoOrder.statuses) &&
      (this.undoOrder.paymentObj.paymentType !== 'STRIPE') &&
      (!this.undoOrder.courierId)) {
      await this.search();

      let copyOrder = {...this.undoOrder};
      copyOrder.statuses = copyOrder.statuses.filter(s => s.status !== 'CANCELED');
      const {customerNotice, restaurantNotie, ..._newOrder} = copyOrder;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', [
        {
          old: this.undoOrder,
          new: _newOrder
        }
      ]).toPromise();

      await this.search();

      this._global.publishAlert(AlertType.Success, `Undo Cancel done`);

    } else {
      this._global.publishAlert(AlertType.Danger, `Undo Cancel failed`);
    }

    this.undoRejectModal.hide();
  }

  async addLog(order) {
    this.logInEditing = new Log();
    // @ts-ignore
    this.logInEditing.relatedOrders = order.orderNumber.toString();
    let [rt] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {_id: { $oid: order.restaurantObj._id }},
      projection: {
        'name': 1, 'logo': 1, 'logs': 1,
        'googleAddress.timezone': 1,
        'googleAddress.formatted_address': 1,
        'googleAddress.lat': 1,
        'googleAddress.lng': 1,
        'phones.phoneNumber': 1,
        'channels.value': 1
      },
      limit: 1
    }).toPromise();
    this.restaurant = rt;
    this.logEditingModal.show();
  }

  async onLogCreated(data) {
    let logs = this.restaurant.logs || [];
    data.log.time = new Date();
    data.log.username = this._global.user.username;
    logs.push(new Log(data.log));
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
      old: {_id: this.restaurant._id}, new: {_id: this.restaurant._id, logs}
    }]).toPromise();
    data.formEvent.acknowledge();
    this.restaurant = null;
    this.logInEditing = new Log();
    this.logEditingModal.hide();
  }
  onLogCancel() {
    this.restaurant = null;
    this.logInEditing = new Log();
    this.logEditingModal.hide();
  }

}
