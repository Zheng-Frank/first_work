import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { Invoice } from '../../../classes/invoice';

@Component({
  selector: 'app-invoice-editor',
  templateUrl: './invoice-editor.component.html',
  styleUrls: ['./invoice-editor.component.css']
})
export class InvoiceEditorComponent implements OnInit {
  @Output() onNewInvoice = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  fromDate = this.formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  toDate = this.formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

  @Input() restaurant: Restaurant = new Restaurant();

  constructor() { }

  ngOnInit() {
  }

  createNewInvoice() {
    // do some cheap validation here.It should be done as form validation
    if (!this.fromDate || !this.toDate) {
      return alert('From Date and To Date are required!');
    }

    if (new Date(this.fromDate) > new Date(this.toDate)) {
      return alert('From Date must be smaller than To Date');
    }

    if (!this.restaurant) {
      return alert('Missing restaurant');
    }

    const i = {
      restaurant: this.restaurant,
      fromDate: this.fromDate,
      toDate: this.toDate
    };
    this.onNewInvoice.emit(i);
  }

  // return 2017-2-12
  private formatDate(d) {
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) { month = '0' + month; }
    if (day.length < 2) { day = '0' + day; }
    return [year, month, day].join('-');
  }


  setRestaurant(r) {
    this.restaurant = r;
  }

  getRateSchedules() {
    if (this.restaurant && this.restaurant.rateSchedules) {
      return this.restaurant.rateSchedules;
    }
    return [];
  }

  getError() {
    if (new Date(this.fromDate).valueOf() > new Date(this.toDate).valueOf()) {
      return 'From date can not be greater than to date';
    }
    if (!this.fromDate) {
      return 'From date is required';
    }
    if (!this.toDate) {
      return 'To date is required';
    }
    return null;
  }

  getTotalOrders() {
    if (this.fromDate && this.toDate && this.restaurant && this.restaurant.orders) {
      return this.restaurant.orders.filter(o => o.createdAt.valueOf() >= new Date(this.fromDate).valueOf() && o.createdAt.valueOf() <= new Date(this.toDate).valueOf()).length;
    }
    return 0;
  }

  cancel() {
    this.onCancel.emit();
  }

}
