import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Invoice } from '../../../classes/invoice';
import { TimezoneService } from '../../../services/timezone.service';

@Component({
  selector: 'app-invoice-viewer',
  templateUrl: './invoice-viewer.component.html',
  styleUrls: ['./invoice-viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceViewerComponent implements OnInit {
  @Input() invoice: Invoice;
  constructor(private _ref: ChangeDetectorRef, private _timezone: TimezoneService) { }

  ngOnInit() {
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
