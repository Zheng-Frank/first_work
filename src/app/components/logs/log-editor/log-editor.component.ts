import { Component, OnInit, EventEmitter, Output, Input, ViewChild, SimpleChanges } from '@angular/core';
import { FormEvent } from '../../../classes/form-event';

import { Restaurant } from '@qmenu/ui';
import { Log } from '../../../classes/log';

@Component({
  selector: 'app-log-editor',
  templateUrl: './log-editor.component.html',
  styleUrls: ['./log-editor.component.css']
})
export class LogEditorComponent implements OnInit {
  @Output() cancel = new EventEmitter();
  @Output() remove = new EventEmitter<any>();
  @Output() success = new EventEmitter<any>();

  @Input() log = {} as Log;
  @Input() restaurant;
  @Input() restaurantList;

  hasAdjustment;
  @ViewChild('myRestaurantPicker') set picker(picker) {
    this.myRestaurantPicker = picker;
  }
  myRestaurantPicker;

  logFieldDescriptors = [
    {
      field: "callerName",
      label: "Caller Name",
      required: false,
      inputType: "text"
    },
    {
      field: "callerPhone",
      label: "Caller Phone",
      required: false,
      inputType: "tel"
    },
    {
      field: "relatedOrders",
      label: "Related Order Numbers",
      required: false,
      inputType: "text"
    },
    {
      field: "problem",
      label: "Problem",
      required: true,
      inputType: "textarea"
    },
    {
      field: "response",
      label: "Response",
      required: true,
      inputType: "textarea"
    }

  ];

  customerName: string;
  customerPhone: string;
  relatedOrderIds: string[];

  constructor() {

  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    this.hasAdjustment = this.log && this.log.adjustmentAmount;
  }

  changeHasAdjustment() {
    if (!this.hasAdjustment) {
      this.log.adjustmentAmount = undefined;
      this.log.adjustmentReason = undefined;
    }
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
      log: this.log
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
    } else if (this.hasAdjustment && !this.log.adjustmentAmount) {
      event.acknowledge('Please input adjustment amount.');
    } else if (this.hasAdjustment && !this.log.adjustmentReason) {
      event.acknowledge('Please input adjustment reason.');
    } else {
      // alway make it unresolved if it is adjustment
      if (this.hasAdjustment) {
        this.log.resolved = false;
      }
      this.success.emit({
        formEvent: event,
        restaurant: this.restaurant,
        log: this.log
      });
    }

  }

}
