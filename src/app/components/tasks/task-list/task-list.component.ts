import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {

  @Input() taskList = [];
  @Input() user;
  @Output() actionDone = new EventEmitter();

  now = new Date();
  myColumnDescriptors = [
    {
      label: "Scheduled At",
      paths: ['scheduledAt'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    },
    // {
    //   label: "Closed At",
    //   paths: ['resultAt'],
    //   sort: (a, b) => (a || new Date(0)).valueOf() - (b || new Date(0)).valueOf()
    // },
    {
      label: "Task",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Group"
    },
    {
      label: "Assignee",
      paths: ['assignee'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Comments"
    },
    {
      label: "Actions"
    }
  ];

  constructor() { }

  ngOnInit() {
  }

  getTaskClass(task) {
    const day = 24 * 3600 * 1000;
    const diff = this.now.valueOf() - task.scheduledAt.valueOf();
    if (diff > 0) {
      return 'danger';
    }

    if (diff > -day) {
      return 'warning';
    }

    if (diff > -2 * day) {
      return 'info';
    }
    return 'success';
  }

  getRoles(task: Task) {
    return (task.roles || []).join(', ');
  }

  triggerActionDone(event) {
    this.actionDone.emit(event);
  }

}
