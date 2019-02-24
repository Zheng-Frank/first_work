import { Component, OnInit, Output, EventEmitter, Input, ViewChild } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { User } from '../../../classes/user';
@Component({
  selector: 'app-task-generator',
  templateUrl: './task-generator.component.html',
  styleUrls: ['./task-generator.component.css']
})
export class TaskGeneratorComponent implements OnInit {
  @Output() submit = new EventEmitter<Task>();
  @Output() cancel = new EventEmitter();
  // for picking related restaurant
  @Input() restaurantList = [];
  @Input() restaurant;

  gmbBiz;

  @ViewChild('myRestaurantPicker') myRestaurantPicker;

  selectedTemplate;
  assigneeList;
  assignee;

  obj = {} as any;
  predefinedTasks = Task.predefinedTasks;
  fieldDescriptors = [
    {
      field: "name", //
      label: "Name",
      required: true,
      inputType: "text",
      disabled: true,
    },
    // {
    //   field: "description", //
    //   label: "Description",
    //   required: false,
    //   inputType: "text"
    // },
    {
      field: "roles", //
      label: "Roles",
      required: false,
      inputType: "multi-select",
      disabled: true,
      items: [
        { object: "ADMIN", text: "ADMIN", selected: false },
        { object: "ACCOUNTANT", text: "ACCOUNTANT", selected: false },
        { object: "GMB", text: "GMB", selected: false },
        { object: "MENU_EDITOR", text: "MENU_EDITOR", selected: false },
      ]
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }
  ngOnInit() {
    // grab all users and make an assignee list!
    // get all users
    this._api
      .get(environment.adminApiUrl + "generic", {
        resource: "user",
        limit: 1000
      })
      .subscribe(
      result => {
        this.assigneeList = result.map(u => new User(u)).sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
        //console.log('assigneeList', this.assigneeList);
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling users from API"
        );
      }
      );
  }

  reset() {
    this.obj.relatedMap = {};
    this.gmbBiz = undefined;
    this.restaurant = undefined;
  }

  isAdmin() {
    return this._global.user.roles.some(r => r === 'ADMIN');
  }

  async selectRestaurant(restaurant) {
    this.restaurant = restaurant;
    this.gmbBiz = (await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {
        qmenuId: restaurant._id || restaurant.id
      }
    }).toPromise())[0];
  }

  resetRestaurant() {
    this.reset();
  }

  selectTemplate(event) {
    if (this.selectedTemplate) {
      ['name', 'description', 'assignee', 'scheduledAt'].map(k => {
        this.obj[k] = this.selectedTemplate[k];
      });

      this.assignee = this.selectedTemplate['assignee'];
      this.obj.roles = (this.selectedTemplate.roles || []).slice();
      this.fieldDescriptors.filter(f => f.field === 'roles').map(f => f.items.map(i => i.selected = this.selectedTemplate.roles.indexOf(i.object) >= 0))
    }
  }
  selectAssignee(event) {
  }

  formSubmit(event) {
    if (!this.restaurant) {
      event.acknowledge('Please select a restaurant.');
    }
    else if (!this.selectedTemplate) {
      event.acknowledge('Please select a template.');
    } else if (!this.assignee) {
      event.acknowledge('Please select a assignee.');
    }
    else {
      const task = {
        name: this.obj.name,
        description: this.obj.description,
        scheduledAt: this.obj.scheduledAt || new Date(),
        assignee: this.obj.assignee || this.assignee,
        roles: this.obj.roles.slice(),
        comments: this.obj.comments,
        creator: this._global.user.username,
        relatedMap: {
          gmbBizId: (this.gmbBiz || {})['_id'],
          restaurantId: (this.restaurant || {})['_id'] || (this.restaurant || {})['id']
        }
      } as Task;

      if (this.restaurant) {
        task.comments += '\n' + this.restaurant.name + ', ' + (this.restaurant.id || this.restaurant._id);
      }
      task.comments += '\nCreated By ' + this._global.user.username;
      this.submit.emit(task);
    }
  }

  formCancel() {
    this.cancel.emit();
  }

}
