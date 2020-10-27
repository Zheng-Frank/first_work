import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Order, Payment, CreditCard, Customer, Restaurant } from '@qmenu/ui';
import { ConfirmComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from "../../../services/global.service";
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
declare var $: any;
@Component({
  selector: 'app-order-card',
  templateUrl: './order-card.component.html',
  styleUrls: ['./order-card.component.css']
})
export class OrderCardComponent implements OnInit {
  @Input() order: Order;
  @Input() restaurant: Restaurant;

  @Output() onSetNewStatus = new EventEmitter();
  @Output() onAdjust = new EventEmitter();
  @Output() onDisplayCreditCard = new EventEmitter();
  @Output() onReject = new EventEmitter();
  @Output() onUndoReject = new EventEmitter();
  @Output() onBan = new EventEmitter();
  @Output() onChangeToSelfDelivery = new EventEmitter();

  @ViewChild('toggleButton') toggleButton;
  @ViewChild('confirmModal') confirmModal: ConfirmComponent;

  confirmAction;
  confirmTitle;
  confirmBodyText;
  phoneNumberToText;
  showTexting: boolean = false;
  displayingDeliveryDetails = false;

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
  }

  changeToSelfDelivery() {
    this.onChangeToSelfDelivery.emit(this.order);
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
            if (printer.autoPrintCopies > 0) {
              try {
                await this._api.post(environment.appApiUrl + 'biz/orders/send', {
                  printClientId: pc._id, orderId: this.order.id, type: pc.type, to: printer.name, key: printer.key, orderNumber: this.order.orderNumber, format: printer.format || "png"
                }).toPromise();
                this._global.publishAlert(AlertType.Success, `Sent to ${pc.type}: ${printer.name}`);

              } catch (error) {
                console.log(error);
                this._global.publishAlert(AlertType.Danger, `Failed printing to ${pc.type}: ${printer.name}`);
              }
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

  showCreditCard() {
    this.onDisplayCreditCard.emit(this.order);
  }

  cancel() {
    this.onReject.emit(this.order);
  }

  undoCancel() {
    this.onUndoReject.emit(this.order);
  }

  ban() {
    this.onBan.emit(this.order);
  }

  getBannedReasons() {
    return this.order && this.order.customer && this.order.customer.bannedReasons && this.order.customer.bannedReasons.join(', ');
  }

  getOrderLink() {
    return `${environment.utilsApiUrl}renderer?orderId=${this.order.id}&template=restaurantOrderFax&format=pdf`;
  }

  isCanceled(order: Order) {
    // status are not completed, not canceled, and time is not over 2 days
    // 1000 * 3600 * 48 = 172800000
    return order.statusEqual('CANCELED');
  }

  isAdmin() {
    return this._global.user.roles.some(r => r === 'ADMIN');
  }

  isViewable(order: Order){
    return this.isAdmin() ||  !(order.payment.paymentType === 'CREDITCARD' &&  order.payment.method === 'KEY_IN')
  }

  getUpdatedStatuses() {
    const order: any = { ...this.order };
    (order.delivery.updates || []).sort((a, b) => (new Date(a.created)).valueOf() - (new Date(b.created)).valueOf());
    const updates = (order.delivery.updates || []).filter((update, index, self) => self.findIndex(_update => (_update.status === update.status)) === index)

    return updates;
  }

  postmatesStatus(status) {
    switch(status) {
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
