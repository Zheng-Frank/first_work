import { Component, OnInit, EventEmitter, Output, Input, ViewChild, SimpleChanges } from '@angular/core';
import { FormEvent } from '../../../classes/form-event';
import { Restaurant } from '@qmenu/ui';
import { Log } from '../../../classes/log';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Task } from 'src/app/classes/tasks/task';
import { User } from '../../../classes/user';
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
  scheduledAt;
  assignee;
  predefinedTasks = Task.predefinedTasks;

  @ViewChild('myRestaurantPicker') set picker(picker) {
    this.myRestaurantPicker = picker;
  }
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

  constructor(private _api: ApiService, private _global: GlobalService) {

  }

  ngOnInit() {
    if (this._global.user.roles.some(r => r === 'ADMIN')) {
      // grab all users and make an assignee list!
      this._api
        .get(environment.adminApiUrl + "generic", {
          resource: "user",
          limit: 1000
        })
        .subscribe(
        result => {
          this.assigneeList = result.map(u => new User(u)).sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
          console.log('assigneeList', this.assigneeList);
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling users from API"
          );
        }
        );
    }


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
      if (this.hasTask) {
        // create a task!
        if (!this.selectedTaskTemplate) {
          return event.acknowledge('Please choose a task template');
        } else {
          let task = {
            comments: 'Restaurant: ' + this.restaurant.name + ', ' + this.restaurant._id + '\nProblem: ' + this.log.problem + '\nResponse: ' + this.log.response + '\nCreated By: ' + this._global.user.username,
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
          await this._api.post(environment.adminApiUrl + 'generic?resource=task', [task]).toPromise();
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

  isNewLog() {
    return !this.log.username && !this.log.time;
  }

  isAdmin() {
    return this._global.user.roles.some(r => r === 'ADMIN');
  }

  toggleIsCollection() {
    this.log.type === 'collection' ? this.log.type = undefined : this.log.type = 'collection';
  }
  toggleIsGooglePIN() {
    this.log.type === 'google-pin' ? this.log.type = undefined : this.log.type = 'google-pin';
  }

}
