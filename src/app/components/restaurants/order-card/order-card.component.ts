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
  @Output() onBan = new EventEmitter();

  @ViewChild('toggleButton') toggleButton;
  @ViewChild('confirmModal') confirmModal: ConfirmComponent;

  confirmAction;
  confirmTitle;
  confirmBodyText;
  phoneNumberToText;
  showTexting: boolean = false;


  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
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
    return order.payment.paymentType === 'CREDITCARD';
  }

  canSendEmail(order: Order) {
    return this.restaurant && (this.restaurant.channels || []).some(c => c.type === 'Email' && (c.notifications || []).some(n => n === 'Order'));
  }

  canCancel(order: Order) {
    // status are not completed, not canceled, and time is not over 3 days
    //return true;
    return !(order.statusEqual('CANCELED')) && (new Date().valueOf() - new Date(order.timeToDeliver || order.createdAt).valueOf() < 90 * 24 * 3600 * 1000);
  }

  canShowAdjust(order: Order) {
    // we can only adjust order within 3 days
    return !order.statusEqual('CANCELED') && new Date().valueOf() - new Date(order.timeToDeliver || order.createdAt).valueOf() < 3 * 24 * 3600 * 1000;
  }

  canPrint() {
    // within 2 days
    // 1000 * 3600 * 48 = 43200000
    //return new Date().valueOf() - new Date(this.order.timeToDeliver || this.order.createdAt).valueOf() < 17280000000 && this.restaurant && ((this.restaurant.printerKey && this.restaurant.printerSN) || (this.restaurant.printers && this.restaurant.printers.length > 0));
    return this.restaurant && ((this.restaurant.printerKey && this.restaurant.printerSN) || (this.restaurant.printers && this.restaurant.printers.length > 0));;
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

  sendText() {
    this._api.post(environment.legacyApiUrl + 'utilities/sendOrderSMS', { orderId: this.order.id, orderNumber: this.order.orderNumber, phones: this.phoneNumberToText.split() })
      .subscribe(
        d => {
          this._global.publishAlert(
            AlertType.Success,
            "SMS successfully"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Failed to send text");
        }
      );
  }

  isPhoneValid() {
    return this.phoneNumberToText && this.phoneNumberToText.match(/^[2-9]\d{2}[2-9]\d{2}\d{4}$/);
  }

  sendEmail() {
    const emails = this.restaurant.channels.filter(c => c.type == 'Email' && (c.notifications || []).indexOf('Order') >= 0).map(c => c.value);
    for (let email of emails) {
      try {
        this._api.post(environment.appApiUrl + 'biz/send-order', {}).toPromise();
        this._global.publishAlert(AlertType.Success, `Sent email to ${email}`);
      } catch(error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, `Failed sending email to ${email}`);
      }
    }
    // this._api.post(environment.legacyApiUrl + 'utilities/sendEmail', { restaurantEmail: email, orderId: this.order.id, orderNumber: this.order.orderNumber })
    //   .subscribe(
    //     d => {
    //       this._global.publishAlert(
    //         AlertType.Success,
    //         "Email successfully"
    //       );
    //     },
    //     error => {
    //       this._global.publishAlert(AlertType.Danger, "Failed to send email");
    //     }
    //   );
  }

  confirm() {
    switch (this.confirmAction) {
      case 'PRINT':
        this._api.post(environment.legacyApiUrl + 'order/printOrderDetailsByOrderId', { orderId: this.order.id })
          .subscribe(
            d => {
              //console.log(d);
            },
            error => {
              this._global.publishAlert(AlertType.Danger, "Failed to Print");
            }
          );
        break;
      case 'FAX':
        this._api.post(environment.legacyApiUrl + 'utilities/sendFax', { orderId: this.order.id, faxNumber: this.restaurant.channels.find(c => c.type === 'Fax' && (c.notifications || []).some(n => n === 'Order')).value })
          .subscribe(
            d => {
              //console.log(d);
            },
            error => {
              this._global.publishAlert(AlertType.Danger, "Failed to fax");
            }
          );
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

  ban() {
    this.onBan.emit(this.order);
  }

  getBannedReasons() {
    return this.order && this.order.customer && this.order.customer.bannedReasons && this.order.customer.bannedReasons.join(', ');
  }

  getOrderLink() {
    return environment.legacyApiUrl + 'utilities/order/' + this.order.id;
  }

  isCanceled(order: Order) {
    // status are not completed, not canceled, and time is not over 2 days
    // 1000 * 3600 * 48 = 172800000
    return order.statusEqual('CANCELED');
  }
}
