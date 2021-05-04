import { PDFDocument } from 'pdf-lib';
import { Helper } from 'src/app/classes/helper';
import { GlobalService } from 'src/app/services/global.service';
import { Order, Restaurant } from '@qmenu/ui';
import { Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { Log } from 'src/app/classes/log';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-restaurant-invoice-adjustment',
  templateUrl: './restaurant-invoice-adjustment.component.html',
  styleUrls: ['./restaurant-invoice-adjustment.component.css']
})
export class RestaurantInvoiceAdjustmentComponent implements OnInit {

  @Input() log: Log;
  @Input() restaurant: Restaurant;
  @Input() order: Order;
  @ViewChild('adjustmentReason') adjustmentReason: ElementRef;
  @ViewChild('percentageInput') percentageInput: ElementRef;
  @ViewChild('numberInput') numberInput: ElementRef;
  @Output() onAdjustInvoice = new EventEmitter();
  @Output() onCancel = new EventEmitter(); // hide the q-modal
  @Output() success = new EventEmitter<any>();
  percentage = true;
  percentageAdjustmentAmount = 0;
  adjustmentAmount = 0; // when we input a number rather than a percentage we should use this field to reset the log.ajustmentAmount 
  constructor(private _global: GlobalService) { }

  ngOnInit() {

  }

  toggleAdjustmentType() {
    this.log.adjustmentType === 'TRANSACTION' ? this.log.adjustmentType = undefined : this.log.adjustmentType = 'TRANSACTION';
  }
  getSubmittedTime(order: Order) {
    if (order.createdAt) {
      return new Date(order.createdAt);
    } else {
      return new Date();
    }
  }
  // check whether a number is 2 digit demical 
  isNumberValid(number) {
    let num_Str = String(number);
    let x = num_Str.indexOf('.') + 1;
    let y = num_Str.length - x; // the length after decimal point
    if (x === 0) { // integer
      return true;
    } else {
      return y <= 2;
    }

  }

  // the function is used to calculate invoice adjustment and give percentage field a limit between 0 and 100%
  calcAdjustmentAmount() {
    if (this.percentage) {
      if (Math.abs(this.percentageAdjustmentAmount) > 100) {
        this._global.publishAlert(AlertType.Danger, 'The adjustment value entered is too large or too negative. Please try again !');
        this.percentageAdjustmentAmount = this.percentageAdjustmentAmount < 0 ? -100 : 100;
      }
      if (this.isNumberValid(this.percentageAdjustmentAmount)) {
        // 19.5*27.5/100=5.3625*100=536.25 =>round =>536 =>5.36
        this.log.adjustmentAmount = Math.round((this.order.getSubtotal() * this.percentageAdjustmentAmount / 100) * 100) / 100;
        this.changeReasonText();
      } else {
        this._global.publishAlert(AlertType.Danger, 'Please input a valid percentage number !');
      }

    } else {
      if (Math.abs(this.adjustmentAmount) > this.order.getSubtotal()) {
        this._global.publishAlert(AlertType.Danger, 'The adjustment value entered is too large or too negative. Please try again !');
        this.adjustmentAmount = this.adjustmentAmount < 0 ? -this.order.getSubtotal() : this.order.getSubtotal();
      }
      if (this.isNumberValid(this.adjustmentAmount)) {
        this.log.adjustmentAmount = this.adjustmentAmount;
        this.changeReasonText();
      } else {
        this._global.publishAlert(AlertType.Danger, 'Please input a valid adjustment amount !');
      }
    }
  }
  // we should change input value by default when q-toggle was toggled.
  changeDefaultValue() {
    if (this.percentage) {
      this.percentageAdjustmentAmount = 0;
      this.percentageInput.nativeElement.value = this.percentageAdjustmentAmount;
    } else {
      this.adjustmentAmount = 0;
      this.numberInput.nativeElement.value = this.adjustmentAmount;
    }
  }
  // change textarea showed text and actual adjustment reason.
  changeReasonText() {
    try {
      let date = Helper.adjustDate(this.order.createdAt, this.restaurant.googleAddress.timezone).toString().split(' ');
      let dateStr = date.slice(0, 4).join(' ');
      if (this.percentage) {
        this.adjustmentReason.nativeElement.focus = true;
        if (this.percentageAdjustmentAmount < 0) {
          this.log.adjustmentReason = "Debit $" + (-this.log.adjustmentAmount) + " to restaurant (" + this.percentageAdjustmentAmount + "% of refund subtotal $" + this.order.getSubtotal() + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
        } else {
          this.log.adjustmentReason = "Credit $" + this.log.adjustmentAmount + " to restaurant (" + this.percentageAdjustmentAmount + "% of refund subtotal $" + this.order.getSubtotal() + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
        }
        this.log.response = this.log.adjustmentReason; // make the log can be editable and storable
        this.log.problem = this.log.adjustmentReason;
      } else {
        this.adjustmentReason.nativeElement.focus = true;
        if (this.adjustmentAmount < 0) {
          this.log.adjustmentReason = "Debit $" + (-this.log.adjustmentAmount) + " to restaurant (" + (this.log.adjustmentAmount / this.order.getSubtotal() * 100).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal() + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
        } else {
          this.log.adjustmentReason = "Credit $" + this.log.adjustmentAmount + " to restaurant (" + (this.log.adjustmentAmount / this.order.getSubtotal() * 100).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal() + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
        }
        this.log.response = this.log.adjustmentReason;
        this.log.problem = this.log.adjustmentReason;
      }
    } catch (err) {
      console.log(err);
    }
  }

  ensureAdjustmentAmount() {
    // prevent somebody input value at random , ensure adjsutment is correct 
    try {
      if (this.percentage) {
        this.percentageInput.nativeElement.value = this.percentageAdjustmentAmount;
      } else {
        this.numberInput.nativeElement.value = this.adjustmentAmount;
      }
    } catch (err) {
      this._global.publishAlert(AlertType.Danger, 'Please input a valid number ! ' + err);
    }

  }

  isStripeDispute() {
    return !(this.order.payment.method === 'CASH' || this.order.payment.method === 'KEY_IN' || this.order.payment.method === 'IN_PERSON');
  }

  submitAdjustInvoice() {
    if (!this.log.adjustmentAmount) {
      this._global.publishAlert(AlertType.Danger, 'The log.adjustmentAmount can not be null !');
      return;
    }
    if (this.percentageAdjustmentAmount === 0 && this.percentage) {
      this._global.publishAlert(AlertType.Danger, 'Please input a valid percentage number (the percentage number can not be zero) !');
      return;
    }
    if (this.adjustmentAmount === 0 && !this.percentage) {
      this._global.publishAlert(AlertType.Danger, 'Please input a valid adjustment amount (the adjustment amount can not be zero) !');
      return;
    }
    this.onAdjustInvoice.emit({
      restaurant: this.restaurant,
      log: this.log
    });
  }
  cancel() {
    this.onCancel.emit();
  }

}
