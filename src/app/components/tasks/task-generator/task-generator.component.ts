import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Task } from '../../../classes/tasks/task';

@Component({
  selector: 'app-task-generator',
  templateUrl: './task-generator.component.html',
  styleUrls: ['./task-generator.component.css']
})
export class TaskGeneratorComponent implements OnInit {
  @Output() submit = new EventEmitter<Task>();

  selectedTemplate;

  predefinedTasks = [
    {
      name: 'Task A',
      description: 'a description',
      roles: ['ADMIN'],
      defaultAssignee: 'gary'
    },
    {
      name: 'Task B',
      description: 'b description',
      roles: ['ADMIN']
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
        { object: "ADMIN", text: "Incoming Orders", selected: false },
        { object: "MENU_EDITOR", text: "Invoice", selected: false }
      ]
    }];
  
  constructor() { }
  ngOnInit() {
  }

  selectTemplate(event) {

  }

  formSubmit(event) {
    console.log(event);
  }

}
