import { Component, OnInit, EventEmitter, Output, Input, ViewChild, SimpleChanges } from '@angular/core';
import { FormEvent } from '../../../classes/form-event';

import { Restaurant } from '@qmenu/ui';
import { Log } from '../../../classes/log';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Task } from 'src/app/classes/tasks/task';
import { User } from 'src/app/classes/user';

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
  hasTask;
  selectedTaskTemplate;

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

  constructor(private _api: ApiService, private _global: GlobalService) {

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

  changeHasTask() {
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

  resetRestaurant() {
    this.restaurant = undefined;
    setTimeout(() => this.myRestaurantPicker.reset(), 100);
  }

  async submit(event: FormEvent) {
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
      console.log('log: this.log', this.log);
      this.success.emit({
        formEvent: event,
        restaurant: this.restaurant,
        log: this.log
      });
    }

  }

  isNewLog() {
    return !this.log.username && !this.log.time;
  }

  toggleIsCollection() {
    this.log.type === 'collection' ? this.log.type = undefined : this.log.type = 'collection';
  }
  toggleIsGooglePIN() {
    this.log.type === 'google-pin' ? this.log.type = undefined : this.log.type = 'google-pin';
  }

  async createNewTask(task) {
    const taskCloned = JSON.parse(JSON.stringify(task));
    if (taskCloned.scheduledAt) {
      taskCloned.scheduledAt = { $date: taskCloned.scheduledAt }
    }

    await this._api.post(environment.adminApiUrl + 'generic?resource=task', [task]).toPromise();
    this._global.publishAlert(AlertType.Success, `Created ${task.name}`);

    // make it resolved because task will track its progress
    this.log.resolved = true;
    this._global.publishAlert(AlertType.Success, 'Created Task ' + task['name']);


  }

}
