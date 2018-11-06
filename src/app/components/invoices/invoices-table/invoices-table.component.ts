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
    return invoice.isPaymentCompleted ? 'text-success' : (invoice.isPaymentSent ? 'text-info' : (invoice.isSent ? 'text-white bg-dark' : 'text-dark'));
  }

}
