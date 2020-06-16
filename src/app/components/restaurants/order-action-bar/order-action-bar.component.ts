import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Order } from '@qmenu/ui';
const STATUS_SEQUENCE = [
  'SUBMITTED',
  'CONFIRMED',
  'WIP',
  'READY',
  'DELIVERING',
  'DELIVERED',
  'CANCELED',
  'COMPLETED'
];

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
    const oses = this.order["statuses"] || [];
    oses.sort((o1, o2) => new Date(o1.createdAt || 0).valueOf() - new Date(o2.createdAt || 0).valueOf());
    const lastStatusIndex = STATUS_SEQUENCE.indexOf((oses[oses.length - 1] || {}).status);

    let statusArray: any[] = [];
    statusArray.push({
      dbStatus: 'CONFIRMED',
      status: 'Confirmed',
      action: 'Confirm',
      finished: STATUS_SEQUENCE.indexOf("CONFIRMED") <= lastStatusIndex
    });

    statusArray.push({
      dbStatus: 'WIP',
      status: 'Cooking',
      action: 'Start cooking',
      finished: STATUS_SEQUENCE.indexOf("WIP") <= lastStatusIndex
    });

    statusArray.push({
      dbStatus: 'READY',
      status: 'Ready for pickup',
      action: 'Ready for pickup',
      finished: STATUS_SEQUENCE.indexOf("READY") <= lastStatusIndex
    });

    if (this.order.type === 'DELIVERY') {
      statusArray.push(
        {
          dbStatus: 'DELIVERING',
          status: 'Delivering',
          action: 'Out for delivery',
          finished: STATUS_SEQUENCE.indexOf("DELIVERING") <= lastStatusIndex
        }
      );
      statusArray.push(
        {
          dbStatus: 'DELIVERED',
          status: 'Delivered',
          action: 'Delivered',
          finished: STATUS_SEQUENCE.indexOf("DELIVERED") <= lastStatusIndex
        }
      );
    }
    statusArray.push({
      dbStatus: 'COMPLETED',
      status: 'Completed',
      action: 'Complete',
      finished: STATUS_SEQUENCE.indexOf("COMPLETED") <= lastStatusIndex
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
    this.onSetNewStatus.emit({ order: this.order, status: { status: status } });
  }
}
