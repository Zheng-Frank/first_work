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
  constructor() { }

  ngOnInit() {
  }

  getRoles(task: Task) {
    return (task.roles || []).join(', ');
  }

  triggerActionDone(event) {
    this.actionDone.emit(event);
  }

}
