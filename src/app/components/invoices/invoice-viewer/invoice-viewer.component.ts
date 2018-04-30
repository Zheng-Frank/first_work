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

  getAddressLine1(address) {
    return ((address.line1 ? address.line1 : '') + (address.line2 ? ' ' + address.line2 : '')) || ((address.street_number ? address.street_number : '') +
      + (address.route ? ' ' + address.route : '') +
      (address.apt ? ', ' + address.apt : ''));
  }

  getAddressLine2(address) {
    return (address.city + ' ' + address.state + ' ' + address.zipCode) || ((address.locality ? address.locality + ', ' : (address.sublocality ? address.sublocality + ', ' : ''))
      + (address.administrative_area_level_1 ? address.administrative_area_level_1 : '')
      + ' ' + address.postal_code);
  }

}
