import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Order, Payment, CreditCard, Customer, Restaurant }  from '@qmenu/ui';
import { ConfirmComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
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


  ngOnInit() {
  }


  getSubmittedTime(order: Order) {
    return new Date(order.orderStatuses[0].createdAt);
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
    // 1000 * 3600 * 2 = 7200000
    return order.payment.paymentType === 'CREDITCARD' && (new Date().valueOf() - new Date(order.timeToDeliver || order.createdAt).valueOf() < 96 * 3600 * 1000);
  }

  canCancel(order: Order) {
    // status are not completed, not canceled, and time is not over 2 days
    // 1000 * 3600 * 48 = 172800000
    return !(order.statusEqual('CANCELED')) &&  (new Date().valueOf() - new Date(order.timeToDeliver || order.createdAt).valueOf() < 10* 24 * 3600 * 1000);
  }

  canShowAdjust(order: Order) {
    // we can only adjust order within 3 days
    // 1000 * 3600 * 72 = 259200000
    return !order.statusEqual('CANCELED') && new Date().valueOf() - new Date(order.timeToDeliver || order.createdAt).valueOf() < 259200000;
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
    return  this.restaurant && this.restaurant.phones && this.restaurant.phones.some(p => p.faxable);    
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

  confirm() {
    switch (this.confirmAction) {
      case 'PRINT':
        // this._controller.printOrderDetails(this.order).subscribe(
        //   d => {
        //     //console.log(d);
        //   },
        //   e => {
        //     console.log(e);
        //   }
        // );
        break;
      case 'FAX':
      //   this._controller.faxOrder(this.order.id, this.restaurant.phones.find(p => p.faxable).phoneNumber).subscribe(
      //     d => {
      //       //console.log(d);
      //     },
      //     e => {
      //       console.log(e);
      //     }
      //   );
      //   break;
      // default:
      //   break;
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

  isCanceled(order: Order) {
    // status are not completed, not canceled, and time is not over 2 days
    // 1000 * 3600 * 48 = 172800000
    return order.statusEqual('CANCELED');
  }
}
