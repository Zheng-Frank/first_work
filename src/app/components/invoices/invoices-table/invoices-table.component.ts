import { Component, OnInit, Input } from '@angular/core';
import { Invoice } from '../../../classes/invoice';

@Component({
  selector: 'app-invoices-table',
  templateUrl: './invoices-table.component.html',
  styleUrls: ['./invoices-table.component.css']
})
export class InvoicesTableComponent implements OnInit {
  @Input() invoices: Invoice[] = [];
  constructor() { }

  ngOnInit() {
  }

  getCssClass(invoice: Invoice) {
    return invoice.isCanceled ? 'text-danger' : (invoice.isPaymentCompleted ? 'text-success' : (invoice.isPaymentSent ? 'text-warning' : (invoice.isSent ? 'text-info' : 'text-seconday')));
  }

}
