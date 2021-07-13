import { Helper } from 'src/app/classes/helper';
import { Log } from 'src/app/classes/log';
import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { EventEmitter, NgZone } from '@angular/core';
import { Restaurant, Order, TimezoneHelper } from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { GlobalService } from 'src/app/services/global.service';
import { OrderCardComponent } from '../order-card/order-card.component';


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
  @ViewChild('undoRejectModal') undoRejectModal: ModalComponent;
  @ViewChild('banModal') banModal: ModalComponent;
  @ViewChild('adjustModal') adjustModal: ModalComponent;
  @ViewChild('adjustInvoiceModal') adjustInvoiceModal: ModalComponent;
  @ViewChild('adjustInvoiceComponment') adjustInvoiceComponment: ModalComponent;
  @ViewChild('previousCanceledOrderModal') previousCanceledOrderModal: ModalComponent; // this modal is in order to show customer previous canceled order detail

  previousCanceledOrder: any; // previous canceled order object of one customer
  @ViewChild('changeOrderTypeModal') changeOrderTypeModal: ModalComponent;
  @ViewChild('orderCard') orderCard: OrderCardComponent;
  cardSpecialOrder;
  onNewOrderReceived: EventEmitter<any> = new EventEmitter();
  // customer:Customer
  @Input() restaurant: Restaurant;
  searchText: string;
  maxCount = 8;
  orders: any;
  resultList;
  showSummary = false;
  payment = {};
  // orderForModal: Order = null;
  orderForModal = new Order();
  now: Date = new Date();
  orderEvent: any;
  cancelError = '';
  undoOrder: any;
  isPostmatesStatusDelivered = false;
  searchTypes = ['Order Number', 'Customer Phone', 'Postmates ID'];
  type = 'Order Number';//  concrete search type
  showAdvancedSearch: boolean = false;//show advanced Search ,time picker ,search a period time of orders.
  fromDate; //time picker to search order.
  toDate;
  logInEditing = new Log(); // invoice ajustment modal need this field
  adjustInvoiceRestaurantList = []; // all the restaurant need adjust invoice
  changeOrderType = 'Restaurant self-deliver';
  searchQROrder = false;
  constructor(private _api: ApiService, private _global: GlobalService, private _ngZone: NgZone) {
  }
  /**
   * it is because that the changeordertypemodal has mass sort if it is in the card component.
   */
  handleOpenChangeOrderTypesModal(order) {
    this.cardSpecialOrder = order;
    this.changeOrderTypeModal.show();
  }
  ngOnInit() {
    this.populateOrders();
    this.onNewOrderReceived.subscribe(
      d => this.showNotifier(d)
    );
  }
  
  /**
   *
   *cancel the advanced date search
   * @memberof RestaurantOrdersComponent
   */
  cancelDoSearchOrderByTime() {
    this.showAdvancedSearch = false;
    this.populateOrders();
  }
    /**
   *
   * this function is used to filter order by createdAt
   * @param {*} from
   * @param {*} to
   * @memberof RestaurantOrdersComponent
   */
  async doSearchOrderByTime(from, to) {
    if (from == undefined) {
      return this._global.publishAlert(AlertType.Danger, "please input a correct from time date format!");
    }
    if (to == undefined) {
      return this._global.publishAlert(AlertType.Danger, "please input a correct to time date format !");
    }
    if (new Date(from).valueOf() - new Date(to).valueOf() > 0) {
      return this._global.publishAlert(AlertType.Danger, "please input a correct date format,from time is less than or equals to time!");
    }
    
    let tostr = to.split('-');
    tostr[2] = (parseInt(tostr[2]) + 1) + "";//enlarge the day range to get correct timezone
    to = tostr.join('-');
    const utcf = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(from+" 00:00:00.000"), this.restaurant.googleAddress.timezone);
    const utct = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(to+" 00:00:00.000"), this.restaurant.googleAddress.timezone);

    const query = {
      restaurant: {
        $oid: this.restaurant._id
      },
      $and: [{
        createdAt: {
          $gte: { $date: utcf }
        } // less than and greater than
      }, {
        createdAt: {
          $lte: { $date: utct }
        }
      }
      ]
    } as any;
    // only show qr orders has some interactions with date range search. 
    if(this.searchQROrder){
      query['dineInSessionObj._id'] = {
        $exists:true
      }
    }
    // ISO-Date()
    const orders = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: query,
      projection: {//返回除logs以外的所有行
        logs: 0,
      },
      sort: {
        createdAt: -1
      },
      limit: 150
    },50);
    const customerIds = orders.filter(order => order.customer).map(order => order.customer);

    const blacklist = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "blacklist",
      query: {
        "value": { $in: customerIds },
        disabled: { $ne: true }
      },
      projection: {
        disabled: 1,
        reasons: 1, //
        // reasons: {$slice: -10}, 数组里面前两个
        value: 1,
        orders: 1
      },
      limit: 100000,
      sort: {
        createAt: 1
      }
    }).toPromise();

    const customerIdBannedReasonsDict = blacklist.reduce((dict, item) => (dict[item.value] = item, dict), {});
    // assemble back to order:
    this.orders = orders.map(order => {
      order.orderNumber = order.orderNumber;
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

  showNotifier(orderEvent) {
    this.orderEvent = orderEvent;
    $('#order-notifier').show(1000); setTimeout(() => { $('#order-notifier').hide(1000); }, 10000);
  }

  attachNewOrderStatus(orderStatus) {
    // find the order and attach to status
    if (this.orders) {
      this.orders.forEach(o => {
        if (o.id === orderStatus.order) {
          if (!o.statuses) {
            o.statuses = [];
          }
          o.statuses.push(orderStatus);
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
  /**
   * this function is used to search order by order number ,phone,customer
   *
   * @param {*} event
   * @memberof RestaurantOrdersComponent
   */
  search(event) {
    this.populateOrders();
  }

  /**
     *
     * @memberof RestaurantOrdersComponent
     */
  async populateOrders() {
    const query = {
      restaurant: {
        $oid: this.restaurant._id
      }
    } as any;

    let regexp = /^[0-9]{3,4}$/; //regular express patternt to match order number 3 or 4 digits
    // when check the qr orders only checkbox ,it need interact with the search input.
    if(this.searchQROrder){
      query['dineInSessionObj._id'] = {
        $exists:true
      }
    }
    if (!this.searchText) {

    } else if (this.type == 'Order Number' && this.searchText && regexp.test(this.searchText)) {
      query.orderNumber = +this.searchText;
    } else if (this.type == 'Postmates ID' && this.searchText) {
      query['delivery.id'] = {
        $regex: this.searchText
      }
    } else if (this.type == 'Customer Phone' && this.searchText) {
      if (this.searchText.indexOf('-') != -1) { //to make  it support query order with phone number using - to split
        let str_arr = this.searchText.split('-');
        let queryStr = '';
        str_arr.forEach(function (s) {
          queryStr += s
        });
        query['customerObj.phone'] = {
          $regex: queryStr
        }
      } else { //the situation of the phone number don't have '-'
        query['customerObj.phone'] = {
          $regex: this.searchText
        }
      }
    }
    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: query,
      projection: {//返回除logs以外的所有行
        logs: 0,
      },
      sort: {
        createdAt: -1
      },
      limit: 50
    }).toPromise();
    // get blocked customers and assign back to each order blacklist reasons
    const customerIds = orders.filter(order => order.customer).map(order => order.customer);

    const blacklist = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "blacklist",
      query: {
        "value": { $in: customerIds },
        disabled: { $ne: true }
      },
      projection: {
        disabled: 1,
        reasons: 1, //
        // reasons: {$slice: -10}, 数组里面前两个
        value: 1,
        orders: 1
      },
      limit: 100000,
      sort: {
        createAt: 1
      }
    }).toPromise();

    const customerIdBannedReasonsDict = blacklist.reduce((dict, item) => (dict[item.value] = item, dict), {});
    // assemble back to order:
    this.orders = orders.map(order => {
      order.orderNumber = order.orderNumber;
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
  //this order may be don't exist in this 50 orders,we should find it in our database.
  async handleOnOpenPreviousCanceledOrderModal(order_id) {
    const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
        _id: {
          $oid: order_id
        }
      },
      projection: {//返回除logs以外的所有行
        logs: 0,
      },
      sort: {
        createdAt: -1
      },
      limit: 1
    }).toPromise();
    const customerIds = orders.filter(order => order.customer).map(order => order.customer);
    const blacklist = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "blacklist",
      query: {
        "value": { $in: customerIds },
        disabled: { $ne: true }
      },
      projection: {
        disabled: 1,
        reasons: 1, //
        // reasons: {$slice: -10}, 数组里面前两个
        value: 1,
        orders: 1
      },
      limit: 100000,
      sort: {
        createAt: 1
      }
    }).toPromise();

    const customerIdBannedReasonsDict = blacklist.reduce((dict, item) => (dict[item.value] = item, dict), {});
    // assemble back to order:
    this.previousCanceledOrder = orders.map(order => {
      order.orderNumber = order.orderNumber;
      order.customer = order.customerObj;
      order.payment = order.paymentObj;
      order.id = order._id;
      order.customerNotice = order.customerNotice || '';
      order.restaurantNotie = order.restaurantNotie || '';
      // making it back-compatible to display bannedReasons
      order.customer.bannedReasons = (customerIdBannedReasonsDict[order.customerObj._id] || {}).reasons;
      return new Order(order);
    })[0];
    this.previousCanceledOrderModal.show();
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
        data.order.statuses.push(os);
      },
      error => {
        alert('Update order status failed');
      }
    );
  }

  /**
   * change-to-self-delivery

     change-to-pickup
   */
  async handleOnChangeOrderTypes() {
    if (this.changeOrderType === 'Restaurant self-deliver') {
      try {
        await this._api.post(environment.appApiUrl + 'biz/orders/change-to-self-delivery', {
          orderId: this.cardSpecialOrder._id
        }).toPromise();
      } catch (error) {
        console.log("errors:" + JSON.stringify(error));
      }
    } else if (this.changeOrderType === 'Customer Pickup') {
      try {
        await this._api.post(environment.appApiUrl + 'biz/orders/change-to-pickup', {
          orderId: this.cardSpecialOrder._id
        }).toPromise();
      } catch (error) {
        console.log("errors:" + JSON.stringify(error));
      }
    }
    this.changeOrderTypeModal.hide();
    this.populateOrders();
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

      this._api.get(environment.appApiUrl + "biz/payment", { orderId: order.id })
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
  // open adjust invoice modal,let the sub componment get focus and set a initial reason.
  handleOnAdjustInvoice(order) {
    this.orderForModal = order;
    this.logInEditing = new Log();
    this.adjustInvoiceComponment.percentage = true;
    this.adjustInvoiceComponment.percentageAdjustmentAmount = 20;
    this.adjustInvoiceComponment.adjustmentAmount = Number(this.adjustInvoiceComponment.moneyTransform(order.getSubtotal() * 20 / 100));
    this.logInEditing.adjustmentAmount = this.adjustInvoiceComponment.adjustmentAmount;
    let date = Helper.adjustDate(order.createdAt, this.restaurant.googleAddress.timezone).toString().split(' ');
    let dateStr = date.slice(0, 4).join(' ');
    this.adjustInvoiceComponment.amountReason = this.adjustInvoiceComponment.percentageAmountReason = "Credit $" + this.adjustInvoiceComponment.adjustmentAmount.toFixed(2) + " to restaurant 20% of refund subtotal $" + order.getSubtotal().toFixed(2) + " order #" + order.orderNumber + " on " + dateStr + ") to coming invoice."
    this.adjustInvoiceComponment.stripeReason = this.adjustInvoiceComponment.percentageStripeReason = '';
    this.adjustInvoiceComponment.additionalExplanation = '';
    this.adjustInvoiceModal.show();
  }

  // submit the result to api to create a new log
  doAdjustInvoice(data) {
    this.onSuccessCreationLog(data);
  }
  // hide adjustment q-modal
  cancelAdjustInvoice() {
    this.adjustInvoiceModal.hide();
  }

  async onSuccessCreationLog(data) {

    if (!data.log.time) {
      data.log.time = new Date();
    }
    if (!data.log.username) {
      data.log.username = this._global.user.username;
    }
    const log = JSON.parse(JSON.stringify(data.log)); // make it same as what' in logs array

    // need to get full logs!
    const rtWithFullLogs = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        _id: { $oid: data.restaurant._id }
      },
      projection: {
        logs: 1
      },
      limit: 1
    }, 1);

    const logs = rtWithFullLogs[0].logs || [];

    // check if the original exists, by testing time
    const myIndex = logs.findIndex(e => new Date(e.time).valueOf() === new Date(log.time).valueOf());
    if (myIndex >= 0) {
      logs[myIndex] = log;
    } else {
      logs.push(log);
    }

    this.patchLog({ _id: data.restaurant._id }, { _id: data.restaurant._id, logs: logs });

  }
  patchLog(oldRestaurant, updatedRestaurant) {
    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: oldRestaurant, new: updatedRestaurant }]).subscribe(
      result => {
        // let's update original, assuming everything successful
        this.adjustInvoiceRestaurantList.map(r => {
          if (r._id === oldRestaurant._id) {
            r.logs = updatedRestaurant.logs;
          }
        });
        this._global.publishAlert(
          AlertType.Success,
          'Successfully created new log.'
        );
        this.cancelAdjustInvoice();
      },
      error => {
        this._global.publishAlert(AlertType.Danger, "Error adding a log");
      }
    );
  }

  handleOnReject(order) {
    this.orderForModal = order;
    this.isPostmatesStatusDelivered = this.orderForModal && this.orderForModal['delivery'] && this.orderForModal['delivery'].status === 'delivered';
    this.rejectModal.show();
  }

  handleOnUndoReject(order) {
    this.undoOrder = order;
    this.undoRejectModal.show();
  }

  handleOnBan(order: Order) {
    //判断 customer 的bannerReason 属性是否为false
    // judge customer 's property ,bannerReasons (is it undefined?)
    if (order && order.customer && order.customer.bannedReasons && order.customer.bannedReasons instanceof Array && order.customer.bannedReasons.length > 0) {
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
      alert("No customer found");
      return;
    }
    const customerId = this.orderForModal.customer["_id"];
    // extract email, phone, and addresses
    const customer = await this._api.get(`${environment.appApiUrl}app/customer?customerId=${customerId}`).toPromise();

    const customerOrders = (this.orders || []).filter(order => order.customerObj && order.customerObj._id === customerId);
    const getOrderSkeleton = (order) => {
      const o = new Order(order);
      return {
        _id: order._id || order.id,
        paymentObj: { method: (order.paymentObj || {}).method },
        type: order.type,
        restaurantObj: {
          _id: this.restaurant.id || this.restaurant["_id"],
          name: this.restaurant.name,
          // customerObj.email:{
          //   _id:"xxx"
          // }
        },
        customerObj: order.customerObj,
        address: {
          formatted_address: (order.address || {}).formatted_address,
          lat: (order.address || {}).lat,
          lng: (order.address || {}).lng
        }
      }
    }

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
    if (!reasons || reasons.length === 0) {  //黑名单启用 ,顾客被禁止（Blacklist abandoned, customers banned）
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
          op: "$set",//更新 update
          field: "disabled",
          value: true
        }).toPromise();
      }
    } else {
      // insert new ones!
      const newKeys = Object.keys(generatedBlacklist).filter(key => !existingBlackList.some(ei => ei.value === key));
      if (newKeys.length > 0) {
        await this._api.post(`${environment.appApiUrl}app`, {
          resource: "blacklist",
          objects: newKeys.map(key => generatedBlacklist[key])
        }).toPromise();
      }

      // for existing items, we add new reasons and enable them!
      const updatedItems = existingBlackList.filter(ei => reasons.some(reason => ei.disabled || (ei.reasons || []).indexOf(reason) < 0));
      for (let item of updatedItems) {
        await this._api.patch(`${environment.appApiUrl}app`, {
          resource: 'blacklist',
          query: {
            _id: { $oid: item._id }
          },
          op: "$set",
          field: "reasons",
          value: [...new Set([...item.reasons, ...reasons])]
        }).toPromise();
        //      ${environment.qmenuApiUrl}generic
        await this._api.patch(`${environment.appApiUrl}app`, {
          resource: 'blacklist',
          query: {
            _id: { $oid: item._id }
          },
          op: "$unset",
          field: "disabled",
          value: null
        }).toPromise();
      }
    }
    //this.okBanOld(reasons);//okBanOldCustomer()
    this.banModal.hide();// 隐藏模块（hide the dialog）
    this.populateOrders(); //刷新订单界面(refresh order bound)
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
      // alert('Error on cancelation: ' + JSON.stringify(error));
    }
  }

  async undoRejectOrder() {

    if ((this.undoOrder && this.undoOrder.paymentObj) &&
      (this.undoOrder.paymentObj.method !== 'QMENU') &&
      (this.undoOrder.statuses) &&
      (this.undoOrder.paymentObj.paymentType !== 'STRIPE') &&
      (!this.undoOrder.courierId)) {
      await this.populateOrders();

      let copyOrder = { ...this.undoOrder };
      copyOrder.statuses = copyOrder.statuses.filter(s => s.status !== 'CANCELED');
      const { customerNotice, restaurantNotie, ..._newOrder } = copyOrder;

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', [
        {
          old: this.undoOrder,
          new: _newOrder
        }
      ]).toPromise();

      await this.populateOrders();

      this._global.publishAlert(AlertType.Success, `Undo Cancel done`);

    } else {
      this._global.publishAlert(AlertType.Danger, `Undo Cancel failed`);
    }

    this.undoRejectModal.hide();
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
