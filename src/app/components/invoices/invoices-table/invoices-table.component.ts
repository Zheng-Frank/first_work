import { Component, OnInit, Input } from '@angular/core';
import { Invoice } from '../../../classes/invoice';

@Component({
  selector: 'app-invoices-table',
  templateUrl: './invoices-table.component.html',
  styleUrls: ['./invoices-table.component.css']
})
export class InvoicesTableComponent implements OnInit {
  @Input() invoices: Invoice[] = [];
  showCanceled = false;
  constructor() { }

  ngOnInit() {
  }

  getCssClass(invoice: Invoice) {
    return invoice.isPaymentCompleted ? 'text-success' : (invoice.isPaymentSent ? 'text-info' : (invoice.isSent ? 'text-light bg-dark' : 'text-dark'));
  }

  getPreviousInvoice(currentInvoice: Invoice) {
    return (this.invoices || []).filter(i => (i.id || i['_id']) === (currentInvoice.previousInvoiceId || 'non-exist'))[0];
  }

  getFilteredInvoices() {
    if (this.showCanceled) {
      return this.invoices;
    } else {
      return (this.invoices || []).filter(i => !i.isCanceled);
    }
  }

}
