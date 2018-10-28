import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-order-adjustment',
  templateUrl: './order-adjustment.component.html',
  styleUrls: ['./order-adjustment.component.css']
})
export class OrderAdjustmentComponent implements OnInit {

  @Output() submit = new EventEmitter();
  adjustmentAmount = null;
  adjustmentReason = null;
  isTipAdjustment = false;

  submitClicked = false;
  constructor() { }

  ngOnInit() {
  }

  okAdjust() {
    this.submitClicked = true;
    if (this.adjustmentAmount && (this.isTipAdjustment || this.adjustmentReason)) {
      this.submit.emit({
        amount: +this.adjustmentAmount,
        reason: this.adjustmentReason,
        type: this.isTipAdjustment ? 'Tip' : 'Item'
      });
    }
  }
}
