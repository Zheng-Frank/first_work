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
        let amount = this.log.adjustmentAmount;
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
        let amount = this.log.adjustmentAmount;
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

  /**
   *Make the absolute vale of total (not subtotal) the upper/lower limit of invoice adjustment
    Also take into account taxes, percentage fess, and commission
   *
   * @memberof RestaurantInvoiceAdjustmentComponent
   */
  calcAdjustmentAmount() {
    if (this.percentage) {
      if (Math.abs(this.percentageAdjustmentAmount) > 100) {
        this._global.publishAlert(AlertType.Danger, 'The adjustment value entered is too large or too negative. Please try again !');
        this.percentageAdjustmentAmount = this.percentageAdjustmentAmount < 0 ? -100 : 100;
      }
      if (this.isNumberValid(this.percentageAdjustmentAmount)) {
        // 19.5*27.5/100=5.3625*100=536.25 =>round =>536 =>5.36
        if (this.restaurant.feeSchedules) {
          let feeSchedules = this.restaurant.feeSchedules.filter(feeSchedule => (feeSchedule.name === 'service fee' || feeSchedule.name === 'commission') && feeSchedule.payer === 'RESTAURANT' && feeSchedule.payee === 'QMENU' && feeSchedule.chargeBasis === 'ORDER_SUBTOTAL' && feeSchedule.rate > 0);
          let taxRate = this.restaurant.taxRate;
          let otherRates = [];
          feeSchedules.filter(feeSchedule => {
            otherRates.push({ name: feeSchedule.name, rate: feeSchedule.rate });
          });
          let toRestaurantSubtotal = Number(this.moneyTransform(this.order.getSubtotal() * this.percentageAdjustmentAmount / 100));
          let delta = this.order.getSubtotal() - toRestaurantSubtotal;
          let sumRate = 0;
          sumRate += taxRate;
          otherRates.forEach(otherRate => {
            sumRate += otherRate.rate;
          });
          let amount = toRestaurantSubtotal + Number((delta * sumRate).toFixed(2));
          let reasonOptions = {
            taxRate: taxRate,
            otherRates: otherRates,
            delta: delta,
            toRestaurantSubtotal: toRestaurantSubtotal
          }
          this.log.adjustmentAmount = Number(amount);
          if (this.log.adjustmentType === 'TRANSACTION') {
            this.calculateNetAmountAndSetReason();
          }
          if (this.percentageAdjustmentAmount && this.percentageAdjustmentAmount != 0) {
            this.changeReasonText(true, reasonOptions);
          } else {
            this.percentageAmountReason = '';
            this.percentageStripeReason = '';
          }
        } else if (this.restaurant.rateSchedules) {
          let rateSchedules = this.restaurant.rateSchedules.filter(rateSchedule => { });
          this.log.adjustmentAmount = Number(this.moneyTransform(this.order.getSubtotal() * this.percentageAdjustmentAmount / 100));
          if (this.log.adjustmentType === 'TRANSACTION') {
            this.calculateNetAmountAndSetReason();
          }
          if (this.percentageAdjustmentAmount && this.percentageAdjustmentAmount != 0) {
            this.changeReasonText(false, {});
          } else {
            this.percentageAmountReason = '';
            this.percentageStripeReason = '';
          }
        }
      } else {
        this._global.publishAlert(AlertType.Danger, 'Please input a valid percentage number !');
      }

    } else {
      // Make the absolute vale of total (not subtotal) the upper/lower limit of invoice adjustment.
      if (Math.abs(this.adjustmentAmount) > this.order.getSubtotal()) {
        this._global.publishAlert(AlertType.Danger, 'The adjustment value entered is too large or too negative. Please try again !');
        let total = this.moneyTransform(this.order.getSubtotal());
        this.adjustmentAmount = total;
      }
      if (this.isNumberValid(this.adjustmentAmount)) {
        if (this.restaurant.feeSchedules) {
          let feeSchedules = this.restaurant.feeSchedules.filter(feeSchedule => (feeSchedule.name === 'service fee' || feeSchedule.name === 'commission') && feeSchedule.payer === 'RESTAURANT' && feeSchedule.payee === 'QMENU' && feeSchedule.chargeBasis === 'ORDER_SUBTOTAL' && feeSchedule.rate > 0);
          let taxRate = this.restaurant.taxRate;
          let otherRates = [];
          feeSchedules.filter(feeSchedule => {
            otherRates.push({ name: feeSchedule.name, rate: feeSchedule.rate });
          });
          let toRestaurantSubtotal = this.adjustmentAmount;
          let delta = this.order.getSubtotal() - toRestaurantSubtotal;
          let sumRate = 0;
          sumRate += taxRate;
          otherRates.forEach(otherRate => {
            sumRate += otherRate.rate;
          });
          let amount = toRestaurantSubtotal + Number((delta * sumRate).toFixed(2))
          let reasonOptions = {
            taxRate: taxRate,
            otherRates: otherRates,
            delta: delta,
            toRestaurantSubtotal: toRestaurantSubtotal
          }
          this.log.adjustmentAmount = Number(this.moneyTransform(amount));
          if (this.log.adjustmentType === 'TRANSACTION') {
            this.calculateNetAmountAndSetReason();
          }
          if (this.adjustmentAmount && this.adjustmentAmount != 0) {
            this.changeReasonText(true, reasonOptions);
          } else {
            this.amountReason = '';
            this.stripeReason = '';
          }
        } else if (this.restaurant.rateSchedules) {
          let rateSchedules = this.restaurant.rateSchedules.filter(rateSchedule => { });
          this.log.adjustmentAmount = Number(this.moneyTransform(this.adjustmentAmount));
          if (this.log.adjustmentType === 'TRANSACTION') {
            this.calculateNetAmountAndSetReason();
          }
          if (this.adjustmentAmount && this.adjustmentAmount != 0) {
            this.changeReasonText(false, {});
          } else {
            this.amountReason = '';
            this.stripeReason = '';
          }
        }

      } else {
        this._global.publishAlert(AlertType.Danger, 'Please input a valid adjustment amount !');
      }
    }
  }

  // change textarea showed text and actual adjustment reason.
  changeReasonText(isFeeSchedules, reasonOptions) {
    try {
      let date = Helper.adjustDate(this.order.createdAt, this.restaurant.googleAddress.timezone).toString().split(' ');
      let dateStr = date.slice(0, 4).join(' ');
      if (this.percentage) {
        if (isFeeSchedules) {
          if (this.percentageAdjustmentAmount < 0) {
            //this.percentageAmountReason = "Debit $" + (-this.log.adjustmentAmount).toFixed(2) + " to restaurant (" + -(this.percentageAdjustmentAmount = this.percentageAdjustmentAmount === null ? 0 : this.percentageAdjustmentAmount).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
            this.percentageAmountReason = "It has these follow bill details:<br/>";
            this.percentageAmountReason += "Debit $" + (-this.log.adjustmentAmount).toFixed(2) + " to restaurant with order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.<br/>";
            this.percentageAmountReason += "The subtotal of order is $" + this.order.getSubtotal().toFixed(2) + ".<br/>";
            this.percentageAmountReason += "The refund percentage fee(by calculating with percentage) of subtotal is $"+(-reasonOptions.toRestaurantSubtotal).toFixed(2)+".<br/>";
            this.percentageAmountReason += "The refund tax of subtotal is $" + (-reasonOptions.delta * reasonOptions.taxRate).toFixed(2) + ".<br/>";
            reasonOptions.otherRates.forEach(otherRate => {
              this.percentageAmountReason += "The refund " + otherRate.name + " of subtotal is $" + (-reasonOptions.delta * otherRate.rate).toFixed(2) + ".<br/>";
            });
          } else {
            // this.percentageAmountReason = "Credit $" + this.log.adjustmentAmount.toFixed(2) + " to restaurant (" + (this.percentageAdjustmentAmount = this.percentageAdjustmentAmount === null ? 0 : this.percentageAdjustmentAmount).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
            this.percentageAmountReason = "It has these follow bill details:<br/>";
            this.percentageAmountReason += "Credit $" + (this.log.adjustmentAmount).toFixed(2) + " to restaurant with order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.<br/>";
            this.percentageAmountReason += "The subtotal of order is $" + this.order.getSubtotal().toFixed(2) + ".<br/>";
            this.percentageAmountReason += "The refund percentage fee(by calculating with percentage) of subtotal is $"+reasonOptions.toRestaurantSubtotal.toFixed(2)+".<br/>";
            this.percentageAmountReason += "The refund tax of subtotal is $" + (reasonOptions.delta * reasonOptions.taxRate).toFixed(2) + ".<br/>";
            reasonOptions.otherRates.forEach(otherRate => {
              this.percentageAmountReason += "The refund " + otherRate.name + " of subtotal is $" + (reasonOptions.delta * otherRate.rate).toFixed(2) + ".<br/>";
            });
          }
        } else {
          if (this.percentageAdjustmentAmount < 0) {
            this.percentageAmountReason = "Debit $" + (-this.log.adjustmentAmount).toFixed(2) + " to restaurant (" + -(this.percentageAdjustmentAmount = this.percentageAdjustmentAmount === null ? 0 : this.percentageAdjustmentAmount).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          } else {
            this.percentageAmountReason = "Credit $" + this.log.adjustmentAmount.toFixed(2) + " to restaurant (" + (this.percentageAdjustmentAmount = this.percentageAdjustmentAmount === null ? 0 : this.percentageAdjustmentAmount).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
          }
        }

      } else {
        if (isFeeSchedules) {
          if (this.adjustmentAmount < 0) {
            //  this.amountReason = "Debit $" + (-this.log.adjustmentAmount).toFixed(2) + " to restaurant (" + -(this.log.adjustmentAmount / this.order.getSubtotal() * 100).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
            this.percentageAmountReason = "It has these follow bill details:<br/>";
            this.percentageAmountReason += "Debit $" + (-this.log.adjustmentAmount).toFixed(2) + " to restaurant with order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.\n";
            this.percentageAmountReason += "The subtotal of order is $" + this.order.getSubtotal().toFixed(2) +".<br/>";
            this.percentageAmountReason += "The refund amount fee(by calculating with number) of subtotal is $"+(-reasonOptions.toRestaurantSubtotal).toFixed(2)+".<br/>";
            this.percentageAmountReason += "The refund tax of subtotal is $" + (-reasonOptions.delta * reasonOptions.taxRate).toFixed(2) +".<br/>";
            reasonOptions.otherRates.forEach(otherRate => {
              this.percentageAmountReason += "The refund " + otherRate.name + " of subtotal is $" + (-reasonOptions.delta * otherRate.rate).toFixed(2) +".<br/>";
            });
          } else {
            // this.amountReason = "Credit $" + this.log.adjustmentAmount.toFixed(2) + " to restaurant (" + (this.log.adjustmentAmount / this.order.getSubtotal() * 100).toFixed(2) + "% of refund subtotal $" + this.order.getSubtotal().toFixed(2) + " order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.";
            this.percentageAmountReason = "It has these follow bill details:\n";
            this.percentageAmountReason += "Credit $" + (this.log.adjustmentAmount).toFixed(2) + " to restaurant with order #" + this.order.orderNumber + " on " + dateStr + ") to coming invoice.<br/>";;
            this.percentageAmountReason += "The refund amount fee(by calculating with number) of subtotal is $"+reasonOptions.toRestaurantSubtotal.toFixed(2)+".<br/>";
            this.percentageAmountReason += "The subtotal of order is $" + this.order.getSubtotal().toFixed(2) +".<br/>";
            this.percentageAmountReason += "The refund tax of subtotal is $" + (reasonOptions.delta * reasonOptions.taxRate).toFixed(2) +".<br/>";
            reasonOptions.otherRates.forEach(otherRate => {
              this.percentageAmountReason += "The refund " + otherRate.name + " of subtotal is $" + (reasonOptions.delta * otherRate.rate).toFixed(2) +".<br/>";
            });
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
    this.log.adjustmentReason = this.log.adjustmentReason.replace(/<br\/>/g,'');
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
