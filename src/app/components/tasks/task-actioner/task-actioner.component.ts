import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { Action } from '../../../classes/tasks/action';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';

@Component({
  selector: 'app-task-actioner',
  templateUrl: './task-actioner.component.html',
  styleUrls: ['./task-actioner.component.css']
})
export class TaskActionerComponent implements OnInit, OnChanges {

  @Input() task: Task;
  @Input() action: Action;

  @Output() cancel = new EventEmitter();
  @Output() done = new EventEmitter();
  @Output() error = new EventEmitter();


  taskCopy: Task;
  confirming;
  confirmError;

  selectItems = [
    { text: 'Canceld', object: 'CANCELED' },
    { text: 'Closed',  object: 'CLOSED' }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  ngOnChanges(simpleChanges) {
    this.confirmError = undefined;
    this.confirming = undefined;
    this.taskCopy = this.task ? new Task(this.task) : undefined;
    
  }

  clickCancel() {
    this.cancel.emit();
  }

  clickConfirm() {
    this.confirming = true;
    this.action.perform(this.taskCopy, this._api, {assignee: this._global.user.username}).then(updatedTask => {
      this.done.emit(updatedTask);
      this.confirming = false;
    }).catch(error => {
      this.confirmError = error;
      this.confirming = false;
      this.error.emit(error);
    });
  }

}
