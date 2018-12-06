import { Component, OnInit, Output, EventEmitter, Input, ViewChild } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';

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

  gmbBiz;
  restaurant;

  @ViewChild('myRestaurantPicker') myRestaurantPicker;

  selectedTemplate;

  predefinedTasks = Task.predefinedTasks;

  obj = {} as any;
  fieldDescriptors = [
    {
      field: "name", //
      label: "Name",
      required: true,
      inputType: "text"
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
      items: [
        { object: "ADMIN", text: "ADMIN", selected: false },
        { object: "ACCOUNTANT", text: "ACCOUNTANT", selected: false },
        { object: "GMB", text: "GMB", selected: false },
        { object: "MENU_EDITOR", text: "MENU_EDITOR", selected: false },
      ]
    }];

  constructor(private _api: ApiService, private _global: GlobalService) { }
  ngOnInit() {
  }

  reset() {
    this.obj.relatedMap = {};
    this.gmbBiz = undefined;
    this.restaurant = undefined;
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

      this.obj.roles = (this.selectedTemplate.roles || []).slice();
      this.fieldDescriptors.filter(f => f.field === 'roles').map(f => f.items.map(i => i.selected = this.selectedTemplate.roles.indexOf(i.object) >= 0))
    }
  }

  formSubmit(event) {
    event.acknowledge(null);
    const task = {
      name: this.obj.name,
      description: this.obj.description,
      scheduledAt: this.obj.scheduledAt || new Date(),
      assignee: this.obj.assignee,
      roles: this.obj.roles.slice(),
      comments: this.obj.comments,
      relatedMap: {
        gmbBizId: (this.gmbBiz || {})['_id']
      }
    } as Task;

    this.submit.emit(task);
  }

  formCancel() {
    this.cancel.emit();
  }

}
