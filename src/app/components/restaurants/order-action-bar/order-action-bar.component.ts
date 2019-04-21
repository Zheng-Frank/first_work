import {Component, Input, Output, EventEmitter} from '@angular/core';
import {Order} from '@qmenu/ui';
declare var $: any;

@Component({
  selector: 'app-order-action-bar',
  templateUrl: './order-action-bar.component.html',
  styleUrls: ['./order-action-bar.component.css']
})
export class OrderActionBarComponent {
  @Input() order: Order;
  @Output() onSetNewStatus = new EventEmitter();
  constructor() {
  }

  getStatusArray(): any[] {
    let statusArray: any[] = [];

    statusArray.push({
      dbStatus: 'CONFIRMED',
      status: 'Confirmed',
      action: 'Confirm',
      finished: this.order.statusAfter('CONFIRMED'),
      isCurrent: this.order.statusEqual('CONFIRMED')
    });
    statusArray.push({
      dbStatus: 'WIP',
      status: 'Cooking',
      action: 'Start cooking',
      finished: this.order.statusAfter('WIP'),
      isCurrent: this.order.statusEqual('WIP')
    });

    if (this.order.type === 'PICKUP') {
      statusArray.push({
        dbStatus: 'READY',
        status: 'Ready for pickup',
        action: 'Ready for pickup',
        finished: this.order.statusAfter('READY'),
        isCurrent: this.order.statusEqual('READY')
      });
    } else if (this.order.type === 'DELIVERY') {
      statusArray.push(
        {
          dbStatus: 'READY',
          status: 'Ready for delivery',
          action: 'Ready for delivery',
          finished: this.order.statusAfter('READY'),
          isCurrent: this.order.statusEqual('READY')
        }
      );
      statusArray.push(
        {
          dbStatus: 'DELIVERING',
          status: 'Delivering',
          action: 'Out for delivery',
          finished: this.order.statusAfter('DELIVERING'),
          isCurrent: this.order.statusEqual('DELIVERING')
        }
      );
    }
    statusArray.push({
      dbStatus: 'COMPLETED',
      status: 'Completed',
      action: 'Complete',
      finished: this.order.statusAfter('COMPLETED'),
      isCurrent: this.order.statusEqual('COMPLETED')
    });
    return statusArray;
  }

  isCompleted() {
    return this.order.statusEqual('COMPLETED');
  }

  isCanceled() {
    return this.order.statusEqual('CANCELED');
  }

  setStatus(status: string) {
    this.onSetNewStatus.emit({ order: this.order, status: {status: status} });
  }
}
