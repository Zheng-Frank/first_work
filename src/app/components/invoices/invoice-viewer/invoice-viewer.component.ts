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
  @Input() invoice: Invoice;

  leftRows: keyValue[] = [];
  rightRows: keyValue[] = [];
  // for displaying
  chargeBasisMap = {
    [ChargeBasis.Monthly]: 'monthly',
    [ChargeBasis.OrderSubtotal]: 'order subtotal',
    [ChargeBasis.OrderPreTotal]: 'order total',
    [ChargeBasis.PaidInvoiceCommission]: 'commission',
  };

  orderTypes = new Set();
  orderPaymentMethods = new Set();

  couriers = new Set();

  constructor(private _ref: ChangeDetectorRef) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.invoice) {
      this.computeData();
    }
  }

  computeData() {
    this.orderTypes = new Set();
    this.orderPaymentMethods = new Set();
    this.invoice.orders.map(o => {
      this.orderTypes.add(o.type);
      this.orderPaymentMethods.add(o.paymentType);
      if (o.type === 'DELIVERY') {
        this.couriers.add(o.deliveryBy ? 'qMenu' : 'restaurant');
      }
    });
    console.log(this.orderTypes);
    console.log(this.orderPaymentMethods)
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
        key: `Restaurant Fees`,
        value: invoice.feesForRestaurant
      },

      invoice.feesForQmenu && {
        key: `qMenu Fees`,
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

      invoice.stripeFee && {
        key: `Commissions to qMenu`,
        value: invoice.commission
      },

      invoice.feesForQmenu && {
        key: `Customer paid fees to qMenu`,
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
      const orderTypesOk = !fs.orderTypes || fs.orderTypes.some(ot => this.orderTypes.has(ot));
      const orderPaymentMethodsOk = !fs.orderPaymentMethods || fs.orderPaymentMethods.some(pm => this.orderPaymentMethods.has(pm));
      return orderTypesOk && orderPaymentMethodsOk && fs.payee === 'QMENU' && fs.payer === 'RESTAURANT' && (!fs.toTime || !(inFuture || inPast));
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
