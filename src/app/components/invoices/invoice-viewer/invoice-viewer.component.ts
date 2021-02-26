import { tap } from 'rxjs/operators';
import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { Invoice } from '../../../classes/invoice';
import { FeeSchedule, ChargeBasis } from '@qmenu/ui';

interface keyValue {
  key: string,
  value: number,
  style?: string
}

@Component({
  selector: 'app-invoice-viewer',
  templateUrl: './invoice-viewer.component.html',
  styleUrls: ['./invoice-viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceViewerComponent implements OnInit, OnChanges {
  @Input()
  invoice: Invoice;
  leftRows: keyValue[] = [];
  rightRows: keyValue[] = [];

  orderTypes = new Set();
  orderPaymentMethods = new Set();

  couriers = new Set();
  // Transaction breakdowns,a table to show order bill more briefly
  Cash = { // 支付方式(payment way)
    tip: 0,
    tax: 0,
    subtotal: 0, //食物花的钱
    total: 0,
    deliveryCharge:0
  };
  swipeInPerson = {
    tip: 0,
    tax: 0,
    subtotal: 0,
    total: 0,
    deliveryCharge:0
  };
  keyIn = {
    tip: 0,
    tax: 0,
    subtotal: 0,
    total: 0,
    deliveryCharge:0
  };
  restaurantStripe = {
    tip: 0,
    tax: 0,
    subtotal: 0,
    total: 0,
    deliveryCharge:0
  };
  qmenuCollected = {
    tip: 0,
    tax: 0,
    subtotal: 0,
    total: 0,
    deliveryCharge:0
  };
  total = {
    tip: 0,
    tax: 0,
    subtotal: 0,
    total: 0,
    deliveryCharge:0
  };
  constructor(private _ref: ChangeDetectorRef) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.invoice) {
      this.computeData();
    }
  }

  isActualDate(date) {
    // fake date which is 2020-01-01 and having 
    return new Date(date).valueOf() !== new Date("2020-01-01").valueOf();
  }
 /***
  * the function is used of xxx
  */
  computeData() {
    this.orderTypes = new Set();
    this.orderPaymentMethods = new Set();
    //computer the transaction breakdowns
    const valid_order = this.invoice.orders.filter(o => !o.canceled);
    valid_order.forEach(io => {
      // console.log("io" + JSON.stringify(io));
      if (io.paymentType == "CASH") {
        // console.log("io.paymentType == CASH: " + ",io.tip:" + io.tip + ",io.tax:" + io.tax + ",io.subtotal:" + io.subtotal + ",io.total:" + io.total);
        this.Cash.tip += (io.tip == null || io.tip == undefined ? 0 : Math.round(io.tip*100)/10);
        this.Cash.tax += (io.tax == null || io.tax == undefined ? 0 :Math.round(io.tax*100)/100);
        this.Cash.subtotal += (io.subtotal == null || io.subtotal == undefined ? 0 : io.subtotal);
        this.Cash.total += (io.total == null || io.total == undefined ? 0 : Math.round(io.total*100)/100);
        this.Cash.deliveryCharge+=(io.deliveryCharge==null||io.deliveryCharge==undefined?0:io.deliveryCharge);
        // console.log("io.paymentType == CASH: "+this.Cash.tax);
      } else if (io.paymentType == 'CREDITCARD') {
        if (io.creditCardProcessingMethod == 'IN_PERSON') {//SWIPE
          // console.log("io.creditCardProcessingMethod==SWIPE:" + ",io.tip:" + io.tip + ",io.tax:" + io.tax + ",io.subtotal:" + io.subtotal + ",io.total:" + io.total);
          this.swipeInPerson.tip += (io.tip == null || io.tip == undefined ? 0 : Math.round(io.tip*100)/100);
          this.swipeInPerson.tax += (io.tax == null || io.tax == undefined ? 0 : Math.round(io.tax*100)/100);
          this.swipeInPerson.subtotal += (io.subtotal == null || io.subtotal == undefined ? 0 : io.subtotal);
          this.swipeInPerson.total += (io.total == null || io.total == undefined ? 0 : Math.round(io.total*100)/100 );
          this.swipeInPerson.deliveryCharge+=(io.deliveryCharge==null||io.deliveryCharge==undefined?0:io.deliveryCharge);
          // console.log("io.paymentType == IN_PERSON: "+this.swipeInPerson.tax);
        }
        if (io.creditCardProcessingMethod == 'KEY_IN') {
          // console.log("io.creditCardProcessingMethod==KEY_IN:" + ",io.tip:" + io.tip + ",io.tax:" + io.tax + ",io.subtotal:" + io.subtotal + ",io.total:" + io.total);
          this.keyIn.tip += (io.tip == null || io.tip == undefined ? 0 : Math.round(io.tip*100)/100);
          this.keyIn.tax += (io.tax == null || io.tax == undefined ? 0 : Math.round(io.tax*100)/100);
          this.keyIn.subtotal += (io.subtotal == null || io.subtotal == undefined ? 0 : io.subtotal);
          this.keyIn.total += (io.total == null || io.total == undefined ? 0 : Math.round(io.total*100)/100);
          this.keyIn.deliveryCharge+=(io.deliveryCharge==null||io.deliveryCharge==undefined?0:io.deliveryCharge);
          // console.log("io.paymentType == KEY_IN: "+this.keyIn.tax);
        }
        if (io.creditCardProcessingMethod == "QMENU") {
          // console.log("io.creditCardProcessingMethod == 'QMENU':" + ",io.tip:" + io.tip + ",io.tax:" + io.tax + ",io.subtotal:" + io.subtotal + ",io.total:" + io.total);
          this.qmenuCollected.tip += (io.tip == null || io.tip == undefined ? 0 : Math.round(io.tip*100)/100);
          this.qmenuCollected.tax += (io.tax == null || io.tax == undefined ? 0 : Math.round(io.tax*100)/100);
          this.qmenuCollected.subtotal += (io.subtotal == null || io.subtotal == undefined ? 0 : io.subtotal);
          this.qmenuCollected.total += (io.total == null || io.total == undefined ? 0 : Math.round(io.total*100)/100);
          this.qmenuCollected.deliveryCharge+=(io.deliveryCharge==null||io.deliveryCharge==undefined?0:io.deliveryCharge);
          // console.log("io.paymentType == QMENU: "+this.qmenuCollected.tax);
        }
        if (io.creditCardProcessingMethod == "STRIPE") {
          // console.log("io.creditCardProcessingMethod == STRIPE:" + ",io.tip:" + io.tip + ",io.tax:" + io.tax + ",io.subtotal:" + io.subtotal + ",io.total:" + io.total);
          this.restaurantStripe.tip += (io.tip == null || io.tip == undefined ? 0 : Math.round(io.tip*100)/100);
          this.restaurantStripe.tax += (io.tax == null || io.tax == undefined ? 0 : Math.round(io.tax*100)/100);
          this.restaurantStripe.subtotal += (io.subtotal == null || io.subtotal == undefined ? 0 : io.subtotal);
          this.restaurantStripe.total += (io.total == null || io.total == undefined ? 0 : Math.round(io.total*100)/100);
          this.restaurantStripe.deliveryCharge+=(io.deliveryCharge==null||io.deliveryCharge==undefined?0:io.deliveryCharge);
          // console.log("io.paymentType == STRIPE: "+this.restaurantStripe.tax);
        }
      }

    });
    // console.log("Cash.total:"+this.Cash.total);
    // console.log("this.swipeInPerson.total:"+this.swipeInPerson.total);
    // console.log("this.keyIn.total"+this.keyIn.total);
    // console.log("this.qmenuCollected.total:"+this.qmenuCollected.total);
    // console.log("this.restaurantStripe.total"+this.restaurantStripe.total);
    // this.total.tip = this.Cash.tip + this.qmenuCollected.tip + this.restaurantStripe.tip + this.swipeInPerson.tip + this.keyIn.tip;
    // this.total.tax = this.Cash.tax + this.qmenuCollected.tax + this.restaurantStripe.tax + this.swipeInPerson.tax + this.keyIn.tax;
    // this.total.subtotal = this.Cash.subtotal + this.qmenuCollected.subtotal + this.restaurantStripe.subtotal
    //   + this.swipeInPerson.subtotal + this.keyIn.subtotal;
    // this.total.total = this.Cash.total + this.qmenuCollected.total + this.restaurantStripe.total
    //   + this.swipeInPerson.total + this.keyIn.total;
    this.total.tip=this.invoice.tip;
    this.total.tax=this.invoice.tax;
    this.total.subtotal=this.invoice.subtotal;
    this.total.total=this.invoice.total;
    this.total.deliveryCharge=this.Cash.deliveryCharge + this.qmenuCollected.deliveryCharge + this.restaurantStripe.deliveryCharge
      + this.swipeInPerson.deliveryCharge + this.keyIn.deliveryCharge;
    // console.log("this.total.deliveryCharge:"+this.total.deliveryCharge);
    this.invoice.orders.map(o => {
      this.orderTypes.add(o.type);
      this.orderPaymentMethods.add(o.paymentType); //only CASH or CREDITCARD
      this.orderPaymentMethods.add(o.creditCardProcessingMethod);

      if (o.type === 'DELIVERY') {
        this.couriers.add(o.deliveryBy ? 'qMenu' : 'restaurant');
      }
    });
    const invoice = this.invoice;
    this.leftRows = [
      {
        key: 'Orders Subtotal',
        value: invoice.subtotal
      },
      {
        key: 'Tax',
        value: invoice.tax
      },
      {
        key: 'Delivery',
        value: invoice.deliveryCharge
      },
      {
        key: 'Tip',
        value: invoice.tip
      },
      invoice.ccProcessingFee && {
        key: 'CC Fee Collected',
        value: invoice.ccProcessingFee
      },
      invoice.surcharge && {
        key: `Surcharge`,
        value: invoice.surcharge
      },

      invoice.feesForRestaurant && {
        key: `Customer Paid Fees to Restaurant`,
        value: invoice.feesForRestaurant
      },

      invoice.feesForQmenu && {
        key: `Customer Paid Fees to qMenu`,
        value: invoice.feesForQmenu
      },
      {
        key: 'Orders Total',
        value: invoice.total,
        class: 'subtotal', // css class for this row
      }
    ].filter(kv => kv);


    this.rightRows = [
      invoice.previousInvoiceId && {
        key: `Previous ${invoice.previousBalance >= 0 ? 'Balance' : 'Credit'}`,
        value: Math.abs(invoice.previousBalance || 0)
      },
      invoice.previousInvoiceId && {
        key: `${invoice.getPreviousPayments() >= 0 ? 'You Paid' : 'qMenu Paid You'}`,
        value: Math.abs(invoice.getPreviousPayments() || 0)
      },
      // {
      //   key: `Restaurant Collected`,
      //   value: invoice.cashCollected + invoice.restaurantCcCollected
      // },
      invoice.qMenuCcCollected && {
        key: `qMenu CC Collected (Prepaid)`,
        value: invoice.qMenuCcCollected
      },

      invoice.stripeFee && {
        key: `CC Processing Fee`,
        value: invoice.stripeFee
      },
      // commission goes here...

      invoice.commission && {
        key: `Commissions to qMenu *`,
        value: invoice.commission
      },

      invoice.feesForQmenu && {
        key: `Customer Paid Fees to qMenu`,
        value: invoice.feesForQmenu
      },

      // adjustment
      invoice.adjustment && {
        key: `Adjustments (${invoice.adjustment >= 0 ? 'credit' : 'debit'})`,
        value: invoice.adjustment
      },

      // third party delivery
      (invoice.thirdPartyDeliveryCharge || invoice.thirdPartyDeliveryTip) && {
        key: `Pay Third Party Delivery Fee`,
        value: invoice.thirdPartyDeliveryCharge
      },

      (invoice.thirdPartyDeliveryCharge || invoice.thirdPartyDeliveryTip) && {
        key: `Pay Third Party Delivery Tip (CC)`,
        value: invoice.thirdPartyDeliveryTip
      },

      (invoice.thirdPartyDeliveryCharge || invoice.thirdPartyDeliveryTip) && {
        key: `Pay Third Party Delivery Total`,
        value: (invoice.thirdPartyDeliveryCharge || 0) + (invoice.thirdPartyDeliveryTip || 0)
      },

      {
        key: `Pay ${invoice.balance >= 0 ? 'qMenu' : 'Restaurant'}`,
        value: Math.abs(invoice.balance),
        class: 'subtotal'
      },


    ].filter(kv => kv);


  }

  refresh() {
    this._ref.detectChanges();
  }

  getValidOrders() {
    return this.invoice.orders.filter(o => !o.canceled);
  }

  getAddressLine() {
    return this.invoice.restaurant.address.formatted_address.replace(', USA', '');
  }

  getRateSchedules() {
    const rateSchedules = [...this.invoice.restaurant.rateSchedules || []];
    rateSchedules.sort((rs1, rs2) => new Date(rs1.date).valueOf() - new Date(rs2.date).valueOf());
    // remove ones that were being replaced before invoice start
    for (let i = rateSchedules.length - 1; i >= 0; i--) {
      const rs = rateSchedules[i];
      const newerOnes = rateSchedules.slice(i + 1);
      const inFuture = new Date(rs.date).valueOf() > new Date(this.invoice.toDate).valueOf();
      const replacedByNewer = newerOnes.some(rsNew => new Date(rsNew.date).valueOf() < new Date(this.invoice.fromDate).valueOf() && (rsNew.orderType || 'ALL') === (rs.orderType || "ALL"));
      if (inFuture || replacedByNewer) {
        rateSchedules.splice(i, 1);
      }
    }

    return rateSchedules;
  }

  getFeeSchedules() {
    // date, payer, payee, orderTypes, orderPaymentMethods
    const feeSchedules = this.invoice.restaurant.feeSchedules || this.convertRateSchedulesToFeeSchedules(this.invoice.restaurant.rateSchedules || []);
    // filter: only show applicable ones
    const applicableOnes = feeSchedules.filter(fs => {
      const inFuture = new Date(fs.fromTime) > new Date(this.invoice.toDate);
      const inPast = new Date(fs.toTime) < new Date(this.invoice.fromDate);
      const orderTypesOk = !fs.orderTypes || fs.orderTypes.length === 0 || fs.orderTypes.some(ot => this.orderTypes.has(ot));
      const orderPaymentMethodsOk = !fs.orderPaymentMethods || fs.orderPaymentMethods.length === 0 || fs.orderPaymentMethods.some(pm => this.orderPaymentMethods.has(pm));
      return orderTypesOk && orderPaymentMethodsOk && fs.payer !== 'QMENU' && /*fs.payee === 'QMENU' && fs.payer === 'RESTAURANT' &&*/ (!fs.toTime || !(inFuture || inPast));
    });
    return applicableOnes.map(fs => new FeeSchedule(fs));
  }

  private convertRateSchedulesToFeeSchedules(rateSchedules) {

    // REFER to apex implementation of migrating rateSchedules to feeSchedules
    // orderType: "PICKUP", date: "2020-06-16", rate: 0.03, agent: "sui", commission: 0, fixed: 0
    const sortedRateSchedules = rateSchedules.filter(rs => rs && rs.date).sort((rs1, rs2) => new Date(rs1.date).valueOf() - new Date(rs2.date).valueOf());


    // prep: split all by order types
    const splittedRateSchedules = [];
    sortedRateSchedules.map(rs => {
      if (rs.orderType && rs.orderType !== 'ALL') {
        splittedRateSchedules.push(rs);
      } else {
        ['PICKUP', 'DELIVERY', 'DINE-IN'].map(orderType => {
          const newRs = JSON.parse(JSON.stringify(rs));
          newRs.orderType = orderType;
          splittedRateSchedules.push(newRs);
        });
      }
    });

    // put an end date to old ones
    for (let i = 1; i < splittedRateSchedules.length; i++) {
      const oldOnes = splittedRateSchedules.slice(0, i);
      const currOne = splittedRateSchedules[i];
      oldOnes.map(ors => {
        if (!ors.endDate && ors.orderType === currOne.orderType) {
          ors.endDate = currOne.date;
        }
      });
    }

    // merge by {date, endDate, rate, fixed, agent, commission} but different orderType
    const keyMap = {};
    splittedRateSchedules.map(rs => {
      const key = '' + rs.date + rs.endDate + rs.rate + rs.fixed + rs.agent + rs.commission;
      keyMap[key] = keyMap[key] || [];
      keyMap[key].push(rs);
    });

    const feeSchedules = Object.values(keyMap).map(rsList => {
      const orderTypes = (rsList as any).map(rs => rs.orderType);
      const orderTypesObj = orderTypes.length < 3 ? { orderTypes: orderTypes } : {}; // no need to limit since it applies to ALL types
      // from RT to QMENU
      return ({
        payer: 'RESTAURANT',
        payee: 'QMENU',
        fromTime: new Date(rsList[0].date),
        ...rsList[0].endDate ? { toTime: new Date(rsList[0].endDate) } : {},
        chargeBasis: 'ORDER_SUBTOTAL',
        id: performance.now().toString(), // poorman's ID
        ...orderTypesObj,
        rate: rsList[0].rate || 0,
        amount: rsList[0].fixed || 0
      });

    });
    return feeSchedules;
  }

}
