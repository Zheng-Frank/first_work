import { Component, OnInit, Output, EventEmitter, Input, ViewChild } from '@angular/core';
import { Task } from '../../../classes/tasks/task';

@Component({
  selector: 'app-task-generator',
  templateUrl: './task-generator.component.html',
  styleUrls: ['./task-generator.component.css']
})
export class TaskGeneratorComponent implements OnInit {
  @Output() submit = new EventEmitter<Task>();
  // for picking related restaurant
  @Input() restaurantList = [];

  @ViewChild('myRestaurantPicker') myRestaurantPicker;

  selectedTemplate;

  predefinedTasks = [
    {
      name: 'Task A',
      description: 'a description',
      roles: ['ADMIN'],
      assignee: 'gary',
      scheduledAt: new Date()
    },
    {
      name: 'Task B',
      description: 'b description',
      roles: ['ADMIN', 'MENU_EDITOR'],
      scheduledAt: new Date()
    }
  ];

  obj = {} as any;
  fieldDescriptors = [
    {
      field: "name", //
      label: "Name",
      required: true,
      inputType: "text"
    },
    {
      field: "description", //
      label: "Description",
      required: false,
      inputType: "text"
    },
    {
      field: "roles", //
      label: "Roles",
      required: false,
      inputType: "multi-select",
      items: [
        { object: "ADMIN", text: "ADMIN", selected: false },
        { object: "MENU_EDITOR", text: "MENU_EDITOR", selected: false }
      ]
    }];

  constructor() { }
  ngOnInit() {
  }

  reset() {
    this.obj.relatedMap = {};
    
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

  selectRestaurant(restaurant) {
    this.obj.relatedMap = this.obj.relatedMap || { gmbBizId: restaurant._id };
  }

  formSubmit(event) {
    event.acknowledge(null);
    this.submit.emit({
      name: this.obj.name,
      description: this.obj.description,
      scheduledAt: this.obj.scheduledAt,
      assignee: this.obj.assignee,
      roles: this.obj.roles.filter(r => r.selected).map(r => r.object),
      comments: this.obj.comments
    } as Task);
  }

}
