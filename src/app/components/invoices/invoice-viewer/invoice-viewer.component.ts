import { Component, OnInit, Input } from '@angular/core';
import { Invoice } from '../../../classes/invoice';

@Component({
  selector: 'app-invoice-viewer',
  templateUrl: './invoice-viewer.component.html',
  styleUrls: ['./invoice-viewer.component.css']
})
export class InvoiceViewerComponent implements OnInit {
  @Input() invoice: Invoice;
  constructor() { }

  ngOnInit() {
  }

  getRestaurantTime(time): Date {
    const t = new Date(time);
    t.setHours(t.getHours() + (this.invoice.restaurant.offsetToEST || 0));
    return t;
  }

  getValidOrders() {
    return this.invoice.orders.filter(o => !o.canceled);
  }

}
