import {Component, OnInit, EventEmitter, Output, Input, ViewChild, SimpleChanges, OnChanges} from '@angular/core';
import { FormEvent } from '../../../classes/form-event';
import { Restaurant } from '@qmenu/ui';
import { Log } from '../../../classes/log';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Task } from 'src/app/classes/tasks/task';
@Component({
  selector: 'app-log-editor',
  templateUrl: './log-editor.component.html',
  styleUrls: ['./log-editor.component.css']
})
export class LogEditorComponent implements OnInit, OnChanges {
  @Output() cancel = new EventEmitter();
  @Output() remove = new EventEmitter<any>();
  @Output() success = new EventEmitter<any>();

  @Input() log = {} as Log;
  @Input() restaurant;
  @Input() restaurantList;
  @ViewChild('myRestaurantPicker') set picker(picker) {
    this.myRestaurantPicker = picker;
  }
  hasAdjustment;
  hasTask;
  selectedTaskTemplate;
  scheduledAt;
  assignee;
  agreeToCorporate;
  qmenuExclusive;
  predefinedTasks = Task.predefinedTasks;
  hoursOfOperation;
  normalTypes = [
    {value: 'force-qmenu-collect', label: 'Force qMenu Collect'},
    {value: 'gmb-call', label: 'GMB Calls'},
    {value: 'hours-of-operation', label: 'Hours Of Operation'}
  ]
  specializedTypes = [
    {value: 'qr-dine-in', label: 'QR Dine-In'},
    {value: 'weird-data-cleanup', label: 'Weird Data Cleanup'},
    {value: 'cleanup-insisted', label: 'Insisted Link Cleanup'},
    {value: 'vip-follow-up', label: 'VIP Followup'},
    {value: 'online-agreement', label: 'Online Agreement'},
    {value: 'menu-setup', label: 'Menu Setup'},
    {value: 'payment-pickup-setup', label: 'Payment (Pickup order)'},
    {value: 'payment-delivery-setup', label: 'Payment (Delivery order)'},
    {value: 'request-complaint', label: 'Request/complaint'}
  ];
  myRestaurantPicker;
  assigneeList;

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

  showSpecialized = false;

  constructor(private _api: ApiService, private _global: GlobalService) {

  }

  ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges) {
    this.hasAdjustment = this.log && this.log.adjustmentAmount;
    this.agreeToCorporate = ((this.restaurant || {}).web || {}).agreeToCorporate;
    this.qmenuExclusive = ((this.restaurant || {}).web || {}).qmenuExclusive;
  }

  changeHasAdjustment() {
    if (!this.hasAdjustment) {
      this.log.adjustmentAmount = undefined;
      this.log.adjustmentReason = undefined;
    }
  }

  selectTemplate(event) {
    if (this.selectedTaskTemplate) {
      this.assignee = this.selectedTaskTemplate['assignee'];
    }
  }

  async changeHasTask() {
    this.assigneeList = await this._global.getCachedUserList();
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
      if (this.hasTask) {
        if (!this.selectedTaskTemplate) {
          return event.acknowledge('Please choose a task template');
        } else if (!this.assignee) {
          return event.acknowledge('Please select assignee.');
        } else {
          // create a task!
          let task = {
            comments: '<a target="_blank" href="#/restaurants/' + this.restaurant._id + '">' + this.restaurant.name + '</a>' + '\nProblem: ' + this.log.problem + '\nResponse: ' + this.log.response + '\nCreated By: ' + this._global.user.username,
            scheduledAt: this.scheduledAt || new Date(),
            creator: this._global.user.username,
            relatedMap: {
              restaurantId: this.restaurant._id
            }
          };
          Object.assign(task, this.selectedTaskTemplate);
          if (this.assignee) {
            task['assignee'] = this.assignee;
          }
          await this._api.post(environment.qmenuApiUrl + 'generic?resource=task', [task]).toPromise();
          // make it resolved because task will track its progress
          this.log.resolved = true;
          this._global.publishAlert(AlertType.Success, 'Created Task ' + task['name']);
        }
      }
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

  async handleUpdate() {
    const web = this.restaurant.web || {};
    web.agreeToCorporate = this.agreeToCorporate;
    web.qmenuExclusive = this.qmenuExclusive;
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: { _id: this.restaurant._id },
        new: { _id: this.restaurant._id, web: web }
      }]).toPromise();

      this.restaurant.web = web;

      this._global.publishAlert(AlertType.Success, 'Updated');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, error);

    }
  }

  isNewLog() {
    return !this.log.username && !this.log.time;
  }

  isAdminAndCSRManager() {
    return ['ADMIN', 'CSR_MANAGER'].some(role => this._global.user.roles.includes(role));
  }

  toggleAdjustmentType() {
    this.log.adjustmentType === 'TRANSACTION' ? this.log.adjustmentType = undefined : this.log.adjustmentType = 'TRANSACTION';
  }

  toggleType(type) {
    if (this.log.type === type) {
      this.log.type = undefined;
    } else {
      this.log.type = type;
    }
  }

}
