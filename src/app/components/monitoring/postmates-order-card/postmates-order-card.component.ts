import { DatePipe } from '@angular/common';
import { GlobalService } from 'src/app/services/global.service';
import { ApiService } from './../../../services/api.service';
import { ConfirmComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Output, ViewChild } from '@angular/core';
import { Input, EventEmitter } from '@angular/core';
import { AlertType } from 'src/app/classes/alert-type';
import { Component, OnInit } from '@angular/core';
import { Order, Restaurant } from '@qmenu/ui';
import { environment } from 'src/environments/environment.qa';
declare var $: any;
@Component({
  selector: 'app-postmates-order-card',
  templateUrl: './postmates-order-card.component.html',
  styleUrls: ['./postmates-order-card.component.css'],
  providers: [DatePipe]
})
export class PostmatesOrderCardComponent implements OnInit {

  @Input() order: Order;
  @Input() restaurant: Restaurant;

  @Output() onSetNewStatus = new EventEmitter();
  @Output() onAdjust = new EventEmitter();
  @Output() onAdjustInvoice = new EventEmitter();
  @Output() onDisplayCreditCard = new EventEmitter();
  @Output() onReject = new EventEmitter();
  @Output() onUndoReject = new EventEmitter();
  @Output() onBan = new EventEmitter();
  @Output() onOpenChangeOrderTypesModal = new EventEmitter();
  @Output() onOpenPreviousCanceledOrderModal = new EventEmitter();

  @ViewChild('toggleButton') toggleButton;
  @ViewChild('confirmModal') confirmModal: ConfirmComponent;

  confirmAction;
  confirmTitle;
  confirmBodyText;
  phoneNumberToText;
  showTexting: boolean = false;
  displayingDeliveryDetails = false;
  constructor(private _api: ApiService, private _global: GlobalService, private datePipe: DatePipe) {
  }

  ngOnInit() {
  }
  openPreviousCanceledOrderModal(order_id){
    this.onOpenPreviousCanceledOrderModal.emit(order_id);
  }
  /**
   * When click on "copy" button, should put the following text in the user's clipboard:
"RT: [rt_id], Order# [XX] ([Mmm DD HH:MM AM/PM])"
   */
  copyToClipboard(order) {
    const cloned = order.createdAt.toLocaleString('en-US', { timeZone: this.restaurant.googleAddress.timezone });
    // let createdAt = moment(cloned).format("Mmm dd h:mm a");
    let createdAt = cloned.split(',')[0];
    let text = `RT: ${this.restaurant._id}, Order# ${order.orderNumber} (${createdAt})`;
    const handleCopy = (e: ClipboardEvent) => {
      // clipboardData 可能是 null
      e.clipboardData && e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      // removeEventListener 要传入第二个参数
      document.removeEventListener('copy', handleCopy);
    };
    document.addEventListener('copy', handleCopy);
    document.execCommand('copy');
    this._global.publishAlert(AlertType.Success, 'the data of order has copyed to your clipboard ~', 1000);
  }
 
  /**
   * Add "Change to pick-up" on CSR side for Postmates order
   */
  openChangeOrderTypesModal(order){
    this.onOpenChangeOrderTypesModal.emit(order);
  }
  getSubmittedTime(order: Order) {
    return new Date(order.createdAt);
  }

  getCustomerName(order: Order) {
    if (order.customer && (order.customer.firstName || order.customer.lastName)) {
      // to avoid "Sunny undefined" situation
      return (order.customer.firstName || '') + ' ' + (order.customer.lastName || '');
    }
    return null;
  }

  getCustomerPhoneNumber(order: Order) {
    if (order.customer) {
      return order.customer.phone;
    }
    return null;
  }

  getCustomerEmail(order: Order) {
    if (order.customer) {
      return order.customer.email;
    }
    return null;
  }

  handleOnSetNewStatus(data) {
    this.onSetNewStatus.emit(data);
    // hide details if it is over
    if (data && data.status === 'CANCELED' || data && data.status === 'COMPLETED') {
      $(this.toggleButton.nativeElement).click();
    }
  }

  canShowCreditCard(order: Order) {
    // 1000 * 3600 * 24 * 10, 10 days
    //return true;
    return order.payment.paymentType === 'CREDITCARD' && this.isAdmin();
  }

  canSendEmail(order: Order) {
    return this.restaurant && (this.restaurant.channels || []).some(c => c.type === 'Email' && (c.notifications || []).some(n => n === 'Order'));
  }

  canCancel(order: Order) {
    // status are not completed, not canceled, and time is not over 3 days
    // if admin and not qmenu collect
    return (!(order.statusEqual('CANCELED')) && (new Date().valueOf() - new Date(order.timeToDeliver || order.createdAt).valueOf() < 90 * 24 * 3600 * 1000)) || (this.isAdmin() && order.payment.method !== 'QMENU');
  }

  /**
   * this function is used to judge canceled order who submit
   */
  whoCancelOrder(order: Order) {
    const status = order.statuses.filter(statuses => statuses.status == 'CANCELED');
    if (status.length > 0) {
      return status[0].updatedBy;
    }
  }
  /**
   *this function is used to get order canceled time (who canceled the order)
   *
   * @param {*} order
   * @memberof OrderCardComponent
   */
  getOrderCanceledTime(order) {
    const status = order.statuses.filter(statuses => statuses.status == 'CANCELED');
    if (status.length > 0) {
      return status[0].createdAt;
    }
  }

  canShowAdjust(order: Order) {
    // we can only adjust order within 3 days
    return !order.statusEqual('CANCELED') && new Date().valueOf() - new Date(order.timeToDeliver || order.createdAt).valueOf() < 3 * 24 * 3600 * 1000;
  }

  canPrint() {
    // within 2 days
    // 1000 * 3600 * 48 = 43200000
    //return new Date().valueOf() - new Date(this.order.timeToDeliver || this.order.createdAt).valueOf() < 17280000000 && this.restaurant && ((this.restaurant.printerKey && this.restaurant.printerSN) || (this.restaurant.printers && this.restaurant.printers.length > 0));
    return true;
    //return this.restaurant && ((this.restaurant.printerKey && this.restaurant.printerSN) || (this.restaurant.printers && this.restaurant.printers.length > 0));;
  }

  canFax() {
    // within 2 days
    // 1000 * 3600 * 48 = 43200000
    return this.restaurant && (this.restaurant.channels || []).some(c => c.type === 'Fax' && (c.notifications || []).some(n => n === 'Order'));
  }

  print() {
    this.confirmAction = 'PRINT';
    this.confirmTitle = 'Confirm Printing';
    this.confirmBodyText = 'Do you want to send the order to printer?';
    this.confirmModal.show();

  }

  fax() {
    this.confirmAction = 'FAX';
    this.confirmTitle = 'Confirm Fax';
    this.confirmBodyText = 'Do you want to send the order to fax?';
    this.confirmModal.show();
  }

  setTexting() {
    this.showTexting = !this.showTexting;
  }

  async sendText() {

    try {
      await this._api.post(environment.appApiUrl + 'biz/orders/send', {
        orderId: this.order.id, type: 'sms', to: this.phoneNumberToText
      }).toPromise();
      this._global.publishAlert(AlertType.Success, `Sent SMS to ${this.phoneNumberToText}`);
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, `Failed sending SMS to ${this.phoneNumberToText}`);
    }
  }

  isPhoneValid() {
    return this.phoneNumberToText && this.phoneNumberToText.match(/^[2-9]\d{2}[2-9]\d{2}\d{4}$/);
  }

  async sendEmail() {
    const emails = this.restaurant.channels.filter(c => c.type == 'Email' && (c.notifications || []).indexOf('Order') >= 0).map(c => c.value);
    for (let email of emails) {
      try {
        await this._api.post(environment.appApiUrl + 'biz/orders/send', {
          orderId: this.order.id, type: 'email', to: email
        }).toPromise();
        this._global.publishAlert(AlertType.Success, `Sent email to ${email}`);
      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, `Failed sending email to ${email}`);
      }
    }

  }

  getTestOrderRenderingUrl(printClient, orderView, menus) {
    const format = orderView.format || 'png';
    const customizedRenderingStyles = encodeURIComponent(orderView.customizedRenderingStyles || '');
    const menusEncoded = encodeURIComponent(JSON.stringify(menus || []));
    const template = orderView.template === 'chef' ? 'restaurantOrderPosChef' : 'restaurantOrderPos';

    // url: "https://08znsr1azk.execute-api.us-east-1.amazonaws.com/prod/renderer?orderId=5c720fd092edbd4b28883ee1&template=restaurantOrderPosChef&format=png&customizedRenderingStyles=body%20%7B%20color%3A%20red%3B%20%7D&menus=%5B%7B%22name%22%3A%22All%20Day%20Menu%22%2C%22mcs%22%3A%5B%7B%22name%22%3A%22SPECIAL%20DISHES%22%2C%22mis%22%3A%5B%7B%22name%22%3A%221.Egg%20Roll%20(2)%22%7D%5D%7D%5D%7D%5D"

    let url = `${environment.legacyApiUrl.replace('https', 'http')}utilities/order/${environment.testOrderId}?format=pos&injectedStyles=${customizedRenderingStyles}`;
    if (format === 'esc' || format === 'gdi' || format === 'pdf' || (printClient.info && printClient.info.version && +printClient.info.version.split(".")[0] >= 3)) {
      // ONLY newest phoenix support chef view so for now
      url = `${environment.utilsApiUrl}renderer?orderId=${environment.testOrderId}&template=${template}&format=${format}&customizedRenderingStyles=${customizedRenderingStyles}&menus=${menusEncoded}`;
      if (format === 'pdf') {
        url = `${environment.utilsApiUrl}renderer?orderId=${environment.testOrderId}&template=restaurantOrderFax&format=${format}&customizedRenderingStyles=${customizedRenderingStyles}`;
      }
    }
    return url;
  }

  async confirm() {
    switch (this.confirmAction) {
      case 'PRINT':
        const printClients = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'print-client',
          query: {
            "restaurant._id": this.restaurant._id
          },
          limit: 100
        }).toPromise();
        // sometimes the restaurant has multiple print clients, we need to assign only one?
        // const uniquePrintClients = [];
        // printClients.map(pc => {
        //   if(!uniquePrintClients.some(p => p.type === pc.type)) {
        //     uniquePrintClients.push(pc);
        //   }
        // });
        for (let pc of printClients) {
          for (let printer of pc.printers || []) {
            // if (printer.autoPrintCopies > 0) {
            //   try {
            //     await this._api.post(environment.appApiUrl + 'biz/orders/send', {
            //       printClientId: pc._id, orderId: this.order.id, type: pc.type, to: printer.name, key: printer.key, orderNumber: this.order.orderNumber, format: printer.format || "png"
            //     }).toPromise();
            //     this._global.publishAlert(AlertType.Success, `Sent to ${pc.type}: ${printer.name}`);

            //   } catch (error) {
            //     console.log(error);
            //     this._global.publishAlert(AlertType.Danger, `Failed printing to ${pc.type}: ${printer.name}`);
            //   }
            // }
            if (this.restaurant['printSettings'] && this.restaurant['printSettings'].useNewSettings) {
              // multi-views support!
              for (let orderView of printer.orderViews || []) {
                const { copies } = orderView;
                if (copies > 0) {
                  const format = orderView.format || "png";
                  const customizedRenderingStyles = orderView.customizedRenderingStyles || "";
                  const template = format === "pdf" ? "restaurantOrderFax" : (orderView.template === "chef" ? "restaurantOrderPosChef" : "restaurantOrderPos");
                  const menus = orderView.menus || [];

                  let orderRenderingUrl;
                  if (format === "esc" || format === "gdi" || (format === "pdf") || (pc.info && pc.info.version && +pc.info.version.split(".")[0] >= 3)) {
                    const stage = environment.env;
                    orderRenderingUrl = `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/${stage}/renderer?orderId=${this.order.id}&template=${template}&format=${format}&customizedRenderingStyles=${encodeURIComponent(customizedRenderingStyles)}&menus=${encodeURIComponent(JSON.stringify(menus))}`;
                  }
                  else {
                    let legacyUrl = 'https://api.myqmenu.com/';
                    if (environment.env === 'dev') {
                      legacyUrl = "https://quez.herokuapp.com/";
                    }
                    orderRenderingUrl = legacyUrl + 'utilities/order/' + this.order.id + '?format=pos';
                  }

                  // await prepareJobAndEvent('send-phoenix', {
                  //   orderId: order._id.toString(),
                  //   printClientId: pc._id.toString(),
                  //   data: {
                  //     type: "PRINT",
                  //     data: {
                  //       printerName: printer.name,
                  //       url: orderRenderingUrl,
                  //       format: format.toUpperCase(),
                  //       copies: printer.autoPrintCopies
                  //     }
                  //   }
                  // });
                  // const url = this.getTestOrderRenderingUrl(pc, orderView, menus);

                  await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
                    name: "send-phoenix",
                    params: {
                      printClientId: pc._id,
                      data: {
                        "type": "PRINT",
                        data: {
                          printerName: printer.name,
                          format: format.toUpperCase(), // for back compatibility
                          url: orderRenderingUrl,
                          copies: printer.copies || 1 // default to 1
                        }
                      }
                    }
                  }]).toPromise();

                }
              }
            }
            else if (printer.autoPrintCopies > 0 && pc.type === "phoenix") {
              let orderRenderingUrl;
              const format = printer.format || "png";
              if (format === "esc" || format === "gdi" || (format === "pdf") || (pc.info && pc.info.version && +pc.info.version.split(".")[0] >= 3)) {
                const stage = environment.env;
                orderRenderingUrl = `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/${stage}/renderer?orderId=${this.order.id}&template=restaurantOrderPos&format=${format}`;
                if (format === "pdf") {
                  orderRenderingUrl = `https://08znsr1azk.execute-api.us-east-1.amazonaws.com/${stage}/renderer?orderId=${this.order.id}&template=restaurantOrderFax&format=${format}`;
                }
              }
              else {
                let legacyUrl = 'https://api.myqmenu.com/';
                if (environment.env === 'dev') {
                  legacyUrl = "https://quez.herokuapp.com/";
                }
                orderRenderingUrl = legacyUrl + 'utilities/order/' + this.order.id + '?format=pos';
              }

              // await prepareJobAndEvent('send-phoenix', {
              //   orderId: this.order.id.toString(),
              //   printClientId: pc._id.toString(),
              //   data: {
              //     type: "PRINT",
              //     data: {
              //       printerName: printer.name,
              //       url: orderRenderingUrl,
              //       format: format.toUpperCase(),
              //       copies: printer.autoPrintCopies
              //     }
              //   }
              // });
              await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', [{
                name: "send-phoenix",
                params: {
                  printClientId: pc._id,
                  data: {
                    "type": "PRINT",
                    data: {
                      printerName: printer.name,
                      format: format.toUpperCase(), // for back compatibility
                      url: orderRenderingUrl,
                      copies: printer.settings && printer.settings.copies || 1 // default to 1
                    }
                  }
                }
              }]).toPromise();

            }
          }
        }
        console.log(printClients);
        break;
      case 'FAX':
        const faxes = this.restaurant.channels.filter(c => c.type == 'Fax' && (c.notifications || []).indexOf('Order') >= 0).map(c => c.value);
        for (let fax of faxes) {
          try {
            await this._api.post(environment.appApiUrl + 'biz/orders/send', {
              orderId: this.order.id, type: 'fax', to: fax
            }).toPromise();
            this._global.publishAlert(AlertType.Success, `Sent fax to ${fax}`);
          } catch (error) {
            console.log(error);
            this._global.publishAlert(AlertType.Danger, `Failed sending fax to ${fax}`);
          }
        }
        break;
      default:
        break;
    }
  }


  adjust() {
    this.onAdjust.emit(this.order);
  }

  adjustInvoice(){
    this.onAdjustInvoice.emit(this.order);
  }

  showCreditCard() {
    this.onDisplayCreditCard.emit(this.order);
  }

  cancel() {
    this.onReject.emit(this.order);
  }

  undoCancel() {
    this.onUndoReject.emit(this.order);
  }
  /**
   * 绑定发射事件
   *Bind launch event
   * @param {*} order
   * @memberof OrderCardComponent
   */
  ban(order: Order) {
    // console.log("374行 order card ：ban:"+JSON.stringify(order.customer));
    this.onBan.emit(order);
  }

  getBannedReasons() {
    // if(this.order){
    //      if(this.order.customer){
    //       return this.order.customer.bannedReasons.join(', ');
    //      }
    // }
    return this.order && this.order.customer && this.order.customer.bannedReasons && this.order.customer.bannedReasons.join(', ');
  }

  getOrderLink() {
    return `${environment.utilsApiUrl}renderer?orderId=${this.order.id}&template=restaurantOrderFax&format=pdf`;
  }
  /**
   * 通过父组件注入属性判断是否显示紧致控件
   *Judge whether to display compact control by injecting property into parent component
   * @param {Order} order
   * @returns
   * @memberof OrderCardComponent
   */
  isBanned(order: Order) {
    //  return order.customer.disabled;
    //如果order.customer当前属性值为undefined ,则当前用户未被禁止
    //（If customer 'property named bannedReasons is undefined,he is not banned!）
    //console.log("order carn 409行 ："+JSON.stringify(order.customer));
    if (order && order.customer && order.customer.bannedReasons && order.customer.bannedReasons instanceof Array && order.customer.bannedReasons.length > 0) {
      return true;
    } else {
      return false;
    }
  }
  isCanceled(order: Order) {
    // status are not completed, not canceled, and time is not over 2 days
    // 1000 * 3600 * 48 = 172800000
    return order.statusEqual('CANCELED');
  }

  isAdmin() {
    return this._global.user.roles.some(r => r === 'ADMIN');
  }

  isViewable(order: Order) {
    return this.isAdmin() || !(order.payment.paymentType === 'CREDITCARD' && order.payment.method === 'KEY_IN')
  }

  getUpdatedStatuses() {
    const order: any = { ...this.order };
    (order.delivery.updates || []).sort((a, b) => (new Date(a.created)).valueOf() - (new Date(b.created)).valueOf());
    const updates = (order.delivery.updates || []).filter((update, index, self) => self.findIndex(_update => (_update.status === update.status)) === index)

    return updates;
  }

  postmatesStatus(status) {
    switch (status) {
      case 'pickup':
        return 'Picking up the food';

      case 'pickup_complete':
        return 'Picked up the food';

      case 'delivered':
        return 'Delivered'

      case 'dropoff':
        return 'Delivering';

      case 'delivered':
        return 'Delivered';
    }
  }

}
