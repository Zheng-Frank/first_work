import { Component, OnInit, EventEmitter, Output, Input, ViewChild } from '@angular/core';
import { FormEvent } from '../../../classes/form-event';
import { ApiService } from "../../../services/api.service";
import { GlobalService } from "../../../services/global.service";
import { Restaurant } from '@qmenu/ui';
import { PaymentMeans } from '../../../classes/payment-means';

@Component({
  selector: 'app-payment-means-editor',
  templateUrl: './payment-means-editor.component.html',
  styleUrls: ['./payment-means-editor.component.css']
})
export class PaymentMeansEditorComponent implements OnInit {
  @Output() cancel = new EventEmitter();
  @Output() remove = new EventEmitter<any>();
  @Output() success = new EventEmitter<any>();

  @Input() paymentMeans = {} as PaymentMeans;
  @Input() paymentMeansOriginal;
  @Input() restaurant;

  @Input() restaurantList;

  @ViewChild('myRestaurantPicker') set picker(picker) {
    this.myRestaurantPicker = picker;
  }
  myRestaurantPicker;

  paymentMeansFieldDescriptors = [
    {
      field: "direction",
      label: "Purpose for Restaurant",
      required: true,
      inputType: "single-select",
      items: [
        { object: "Send", text: "To Send Money to qMenu", selected: false },
        { object: "Receive", text: "To Receive Money from qMenu", selected: false }
      ]
    },
    {
      field: "type",
      label: "Type",
      required: true,
      inputType: "single-select",
      items: [
        { object: "Check", text: "Check to qMenu", selected: false },
        { object: "Quickbooks Invoicing", text: "Quickbooks Invoicing", selected: false },
        { object: "Quickbooks Bank Withdraw", text: "Quickbooks Bank Withdraw", selected: false },
        { object: "Credit Card", text: "Credit Card", selected: false },
        { object: "Stripe", text: "Pay Online", selected: false },
        { object: "Direct Deposit", text: "Direct Deposit (receive)", selected: false },
        { object: "Check Deposit", text: "Check Deposit (receive)", selected: false }
      ]
    }

  ];

  customerName: string;
  customerPhone: string;
  relatedOrderIds: string[];

  constructor(private _api: ApiService, private _global: GlobalService) {

  }

  ngOnInit() {
  }

  reset() {
    this.restaurant = undefined;
    if (this.myRestaurantPicker) {
      this.myRestaurantPicker.reset();
    }
  }

  clickCancel() {
    this.cancel.emit();
  }

  clickRemove(event: FormEvent) {
    this.remove.emit({
      formEvent: event,
      restaurant: this.restaurant,
      paymentMeans: this.paymentMeans
    });
  }

  select(restaurant) {
    this.restaurant = new Restaurant(restaurant);
  }

  getPhones(r: Restaurant) {
    if (!r) {
      return [];
    }
    const phones = (r.phones || []).map(p => p.phoneNumber);
    const channels = (r.channels || []).map(c => c.value);
    return Array.from(new Set(phones.concat(channels)));
  }

  resetRestaurant() {
    this.restaurant = undefined;
    setTimeout(() => this.myRestaurantPicker.reset(), 100);
  }

  submit(event: FormEvent) {
    if (!this.restaurant) {
      event.acknowledge('Please select a restaurant.');
    } else {
      this.success.emit({
        formEvent: event,
        restaurant: this.restaurant,
        paymentMeans: this.paymentMeans
      });
    }

  }

}
