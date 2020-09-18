import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { Invoice } from '../../../classes/invoice';
import { TimezoneService } from '../../../services/timezone.service';
import { KeyValue } from '@angular/common';

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

  constructor(private _ref: ChangeDetectorRef, public _timezone: TimezoneService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.invoice) {
      this.computeTabularData();
    }
  }

  computeTabularData() {
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



    //   <tr>
    //     <td>
    //       <b>Commission</b>
    //       <span *ngIf="getRateSchedules().length === 1">
    //         <span
    //           *ngIf="getRateSchedules()[0].rate || !getRateSchedules()[0].fixed">{{getRateSchedules()[0].rate | percentage }}</span>
    //         <span *ngIf="getRateSchedules()[0].rate && getRateSchedules()[0].fixed">+</span>
    //         <span
    //           *ngIf="getRateSchedules()[0].fixed">{{getRateSchedules()[0].fixed | currency:'USD':'symbol' }}</span>
    //       </span>

    //       <span *ngIf="getRateSchedules().length > 1">
    //         <div *ngFor="let rs of getRateSchedules()">
    //           <span *ngIf="rs.rate || !rs.fixed">{{rs.rate || 0 | percentage }}</span>
    //           <span *ngIf="rs.rate && rs.fixed">+</span>
    //           <span *ngIf="rs.fixed">{{rs.fixed | currency:'USD':'symbol' }}</span>
    //           since <span>{{rs.date | adjustedDate: 'shortDate' : 'America/New_York'}}</span>

    //           <span *ngIf="rs.orderType"> for {{rs.orderType}}</span>
    //         </div>
    //       </span>
    //     </td>
    //     <td class="text-right">{{invoice.commission | currency:'USD':'symbol' }}</td>
    //   </tr>

  }

  refresh() {
    this._ref.detectChanges();
  }

  getRestaurantTime(time): Date {
    const t = new Date(time);
    t.setHours(t.getHours() + this._timezone.getOffsetToEST(this.invoice.restaurant.address.timezone));
    return t;
  }

  getAbs(value) {
    return Math.abs(value);
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

}
