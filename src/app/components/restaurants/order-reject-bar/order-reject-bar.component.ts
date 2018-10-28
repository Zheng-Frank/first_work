import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Order } from '@qmenu/ui';
@Component({
  selector: 'app-order-reject-bar',
  templateUrl: './order-reject-bar.component.html',
  styleUrls: ['./order-reject-bar.component.css']
})
export class OrderRejectBarComponent implements OnInit {
  @Input() order: Order;
  @Output() onSetNewStatus = new EventEmitter();

  outOfCapacity = false;
  outOfMaterial = false;
  cardDeclined = false;
  comments: string;
  constructor() { }

  ngOnInit() {
  }

  reject(order) {
    let extraComments = '';
    if (this.outOfCapacity) {
      extraComments += 'Out of capacity. ';
    }
    if (this.outOfMaterial) {
      extraComments += 'Out of material. ';
    }

    if (this.cardDeclined) {
      extraComments += 'Credit card declined. ';
    }

    if (this.comments) {
      extraComments += this.comments;
    }
    this.onSetNewStatus.emit({ order: this.order, status: 'CANCELED', comments: extraComments });
  }
}
