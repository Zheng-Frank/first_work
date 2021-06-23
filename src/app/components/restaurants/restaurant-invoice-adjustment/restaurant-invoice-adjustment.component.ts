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
  @ViewChild('additionalExplanationTextArea') additionalExplanationTextArea: ElementRef;
  @ViewChild('percentageInput') percentageInput: ElementRef;
  @ViewChild('numberInput') numberInput: ElementRef;
  @Output() onAdjustInvoice = new EventEmitter();
  @Output() onCancel = new EventEmitter(); // hide the q-modal
  @Output() success = new EventEmitter<any>();
  percentage = true;
  percentageAdjustmentAmount = 20;
  // it's 20% of order's subtotal by default ,but we just defined 0 to prevent undefined condition.
  adjustmentAmount = 0; // when we input a number rather than a percentage we should use this field to reset the log.ajustmentAmount 
  additionalExplanation = '';
  percentageAmountReason = '';
  amountReason = '';
  percentageStripeReason = ''
  stripeReason = '';
  constructor(private _global: GlobalService) { }

  ngOnInit() {

  }

  toggleAdjustmentType() {
    this.calculateNetAmountAndSetReason();
    this.log.adjustmentType === 'TRANSACTION' ? this.log.adjustmentType = undefined : this.log.adjustmentType = 'TRANSACTION';
  }

  // to calculate net [credit/debit] to restaurant of $X.
  calculateNetAmountAndSetReason() {
    // if the percentage or amount is zero,we don't show stripe dispute what is net to restaurant of $x
    if (this.percentage) {
      if (this.percentageAdjustmentAmount && this.percentageAdjustmentAmount != 0) {
        // it's percentage case or not
        let amount = this.percentage ? this.moneyTransform(this.order.getSubtotal() * this.percentageAdjustmentAmount / 100) : this.adjustmentAmount;

        // generate net to restaurant reason
        if (this.percentageAdjustmentAmount > 0) { // credit to restaurant
          if (amount <= 15) {
            let netToRestaurantAmount = this.moneyTransform(15 - amount);
            this.percentageStripeReason = "Net debit to restaurant of $" + netToRestaurantAmount.toFixed(2) + ".";// 净亏损
          } else {
            let netToRestaurantAmount = this.moneyTransform(amount - 15);
            this.percentageStripeReason = "Net credit to restaurant of $" + netToRestaurantAmount.toFixed(2) + ".";// 净赚
          }

        } else {// debit to restaurant
          let netToRestaurantAmount = this.moneyTransform(15 - amount); // amount is negtive number and the restaurant should refund to us all money includes $15 and amount in total.
          this.percentageStripeReason = "Net debit to restaurant of $" + netToRestaurantAmount.toFixed(2) + ".";// 净亏损
        }
      }
    } else {
      if (this.adjustmentAmount && this.adjustmentAmount != 0) {
        // it's percentage case or not
        let amount = this.percentage ? this.moneyTransform(this.order.getSubtotal() * this.percentageAdjustmentAmount / 100) : this.adjustmentAmount;

        if (this.adjustmentAmount > 0) { // credit to restaurant
          if (amount <= 15) {
            let netToRestaurantAmount = this.moneyTransform(15 - amount);
            this.stripeReason = "Net debit to restaurant of $" + netToRestaurantAmount.toFixed(2) + ".";// 净亏损
          } else {
            let netToRestaurantAmount = this.moneyTransform(amount - 15);
            this.stripeReason = "Net credit to restaurant of $" + netToRestaurantAmount.toFixed(2) + ".";// 净赚
          }

        } else {// debit to restaurant
          let netToRestaurantAmount = this.moneyTransform(15 - amount); // amount is negtive number and the restaurant should refund to us all money includes $15 and amount in total.
          this.stripeReason = "Net debit to restaurant of $" + netToRestaurantAmount.toFixed(2) + ".";// 净亏损
        }

      }
    }

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
      let total = this.order.getTotal();
      let subtotal = this.order.getSubtotal();
      let deltaPercentage = Number((total / subtotal * 100).toFixed(2));
      let isPercentageMore = false;
      if (Math.abs(this.percentageAdjustmentAmount) >= deltaPercentage) {
        this._global.publishAlert(AlertType.Danger, 'The adjustment value entered is too large or too negative. Please try again !');
        this.percentageAdjustmentAmount = this.percentageAdjustmentAmount < 0 ? -deltaPercentage : deltaPercentage;
        isPercentageMore = true;
      }
      if (this.isNumberValid(this.percentageAdjustmentAmount)) {
        // 19.5*27.5/100=5.3625*100=536.25 =>round =>536 =>5.36
        this.log.adjustmentAmount = Number(this.moneyTransform(this.order.getSubtotal() * this.percentageAdjustmentAmount / 100));
        if (this.log.adjustmentType === 'TRANSACTION') {
          this.calculateNetAmountAndSetReason();
        }
        if (this.percentageAdjustmentAmount && this.percentageAdjustmentAmount != 0) {
          this.changeReasonText(isPercentageMore);
        } else {
          this.percentageAmountReason = '';
          this.percentageStripeReason = '';
        }
      } else {
        this._global.publishAlert(AlertType.Danger, 'Please input a valid percentage number !');
      }

    } else {
      let isAmountMore = false;
      if(Math.abs(this.adjustmentAmount) > this.order.getTotal()){
        this._global.publishAlert(AlertType.Danger, 'The adjustment value entered is too large or too negative. Please try again !');
      }
      if (Math.abs(this.adjustmentAmount) >= this.order.getTotal()) {
        let total = this.adjustmentAmount < 0? -this.moneyTransform(this.order.getTotal()):this.moneyTransform(this.order.getTotal());
        this.adjustmentAmount = total;
        isAmountMore = true;
      }
      if (this.isNumberValid(this.adjustmentAmount)) {
        this.log.adjustmentAmount = Number(this.moneyTransform(this.adjustmentAmount));
        if (this.log.adjustmentType === 'TRANSACTION') {
          this.calculateNetAmountAndSetReason();
        }
        if (this.adjustmentAmount && this.adjustmentAmount != 0) {
          this.changeReasonText(isAmountMore);
        } else {
          this.amountReason = '';
          this.stripeReason = '';
        }
      } else {
        this._global.publishAlert(AlertType.Danger, 'Please input a valid adjustment amount !');
      }
    }
  }

  // change textarea showed text and actual adjustment reason.
  changeReasonText(moreFlag) {
    try {
      let date = Helper.adjustDate(this.order.createdAt, this.restaurant.googleAddress.timezone).toString().split(' ');
      let dateStr = date.slice(0, 4).join(' ');
      if (this.percentage) {
        if (moreFlag) {
          if (this.percentageAdjustmentAmount < 0) {
            this.percentageAmountReason = "Debit $" + (-this.log.adjustmentAmount).toFixed(2) + " to restaurant (order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          } else {
            this.percentageAmountReason = "Credit $" + this.log.adjustmentAmount.toFixed(2) + " to restaurant (order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          }
        } else {
          if (this.percentageAdjustmentAmount < 0) {
            this.percentageAmountReason = "Debit $" + (-this.log.adjustmentAmount).toFixed(2) + " to restaurant (" + -(this.percentageAdjustmentAmount = this.percentageAdjustmentAmount === null ? 0 : this.percentageAdjustmentAmount).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          } else {
            this.percentageAmountReason = "Credit $" + this.log.adjustmentAmount.toFixed(2) + " to restaurant (" + (this.percentageAdjustmentAmount = this.percentageAdjustmentAmount === null ? 0 : this.percentageAdjustmentAmount).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          }
        }
      } else {
        if (moreFlag) {
          if (this.adjustmentAmount < 0) {
            this.amountReason = "Debit $" + (-this.log.adjustmentAmount).toFixed(2) + " to restaurant (order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          } else {
            this.amountReason = "Credit $" + this.log.adjustmentAmount.toFixed(2) + " to restaurant (order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          }
        } else {
          if (this.adjustmentAmount < 0) {
            this.amountReason = "Debit $" + (-this.log.adjustmentAmount).toFixed(2) + " to restaurant (" + -(this.log.adjustmentAmount / this.order.getSubtotal() * 100).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          } else {
            this.amountReason = "Credit $" + this.log.adjustmentAmount.toFixed(2) + " to restaurant (" + (this.log.adjustmentAmount / this.order.getSubtotal() * 100).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
  // money transform from money pipe 
  moneyTransform(value: any): any {
    if (value && +value > 0) {
      return Number((+value).toFixed(2));
    } else if (value && +value < 0) {
      return -Number(Math.abs(+value).toFixed(2));
    }
    return 0.0;
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
    // The adjustment reason is handled uniformly at the time of submission
    if (this.percentage) {
      if (this.log.adjustmentType === 'TRANSACTION') {
        this.log.adjustmentReason = this.percentageAmountReason + "A $15 dispute fee will be debited to the restaurant." + this.percentageStripeReason + this.additionalExplanation;
      } else {
        this.log.adjustmentReason = this.percentageAmountReason + this.additionalExplanation;
      }
    } else {
      if (this.log.adjustmentType === 'TRANSACTION') {
        this.log.adjustmentReason = this.amountReason + "A $15 dispute fee will be debited to the restaurant." + this.stripeReason + this.additionalExplanation;
      } else {
        this.log.adjustmentReason = this.amountReason + this.additionalExplanation;
      }
    }
    this.log.response = this.log.adjustmentReason; // make the log can be editable and storable
    this.log.problem = this.log.adjustmentReason;

    this.onAdjustInvoice.emit({
      restaurant: this.restaurant,
      log: this.log
    });
  }
  cancel() {
    this.onCancel.emit();
  }
  // we should allow CSR can submit even if percentageAdjustmentAmount or adjustmentAmount is zero.
  isDisabled() {
    if (this.log.adjustmentType === 'TRANSACTION') {
      return false;
    }
    if (this.percentage) {
      return !(this.percentageAdjustmentAmount && this.percentageAdjustmentAmount != 0);
    } else {
      return !(this.adjustmentAmount && this.adjustmentAmount != 0);
    }
  }

}
