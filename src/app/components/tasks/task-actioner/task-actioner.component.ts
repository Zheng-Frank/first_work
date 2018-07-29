import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { Task } from '../../../classes/task';
import { Action } from '../../../classes/action';

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


  confirming;
  confirmError;

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(simpleChanges) {
    this.confirmError = undefined;
    this.confirming = undefined;
  }

  clickCancel() {
    this.cancel.emit();
  }

  clickConfirm() {
    this.confirming = true;
    this.action.perform(this.task, null).then(data => {
      this.done.emit(data);
      this.confirming = false;
    }).catch(error => {
      this.confirmError = error;
      this.confirming = false;
      this.error.emit(error);
    });
  }

}
