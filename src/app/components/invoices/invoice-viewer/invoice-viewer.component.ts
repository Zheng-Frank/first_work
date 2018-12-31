import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Invoice } from '../../../classes/invoice';

@Component({
  selector: 'app-invoice-viewer',
  templateUrl: './invoice-viewer.component.html',
  styleUrls: ['./invoice-viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceViewerComponent implements OnInit {
  @Input() invoice: Invoice;
  constructor(private _ref: ChangeDetectorRef) { }

  ngOnInit() {
  }

  refresh() {
    this._ref.detectChanges();
  }

  getRestaurantTime(time): Date {
    const t = new Date(time);
    t.setHours(t.getHours() + (this.invoice.restaurant.offsetToEST || 0));
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

  cachedRateSchedules = [];
  getRateSchedules() {
    if (this.cachedRateSchedules.length === 0 && this.invoice && this.invoice.orders) {
      // createdAt, rate, fixed
      for (let order of this.invoice.orders) {
        const lastRateSchedule = this.cachedRateSchedules[this.cachedRateSchedules.length - 1];
        if (!lastRateSchedule || lastRateSchedule.fixed !== order.fixed || lastRateSchedule.rate !== order.rate) {
          this.cachedRateSchedules.push({
            date: new Date(order.createdAt),
            rate: order.rate,
            fixed: order.fixed
          });
        }
      }
    }

    return this.cachedRateSchedules;
  }

}
