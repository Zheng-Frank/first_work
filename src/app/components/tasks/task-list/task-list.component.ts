import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Task } from '../../../classes/task';
import { Action } from '../../../classes/action';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  
  @Input() taskList = [];
  @Input() username;
  @Input() roles;

  @ViewChild('taskActionerModal') taskActionerModal: ModalComponent;

  activeTask: Task;
  activeAction: Action;

  constructor() { }

  ngOnInit() {
  }

  getRoles(task:Task) {
    return (task.roles || []).join(', ');
  }

  act(task, action) {
    this.activeAction = action;
    this.activeTask = task;
    this.taskActionerModal.show();
  }

  cancelAction(event) {
    this.activeAction = undefined;
    this.activeTask = undefined;
    this.taskActionerModal.hide();
  }

  actionDone(event) {
    this.activeAction = undefined;
    this.activeTask = undefined;
    this.taskActionerModal.hide();
    console.log(event)
  }
}
