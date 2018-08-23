import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { Action } from '../../../classes/tasks/action';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from '../../../../environments/environment';
import { Log } from '../../../classes/log';

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

  showDetails = false;

  selectItems = [
    { text: 'Canceld', object: 'CANCELED' },
    { text: 'Closed', object: 'CLOSED' }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  ngOnChanges(simpleChanges) {
    this.confirmError = undefined;
    this.confirming = undefined;
    this.taskCopy = this.task ? new Task(this.task) : undefined;

    if (this.task && this.action) {
      this.refreshRelated();
    }
  }

  clickCancel() {
    this.cancel.emit();
  }

  clickConfirm() {

    const paramsObj = {} as any;
    // we always has comments available
    paramsObj.comments = this.taskCopy.comments;

    switch (this.action.name) {
      case "Assign to Me":
        paramsObj.assignee = this._global.user.username;
        break;
      case "Release":
        paramsObj.assignee = undefined;
        break;
      case "Update":
        paramsObj.scheduledAt = { $date: this.taskCopy.scheduledAt };
        break;
      case "Close":
        if (!this.taskCopy.result) {
          // error should already show in UI
          return;
        }
        paramsObj.result = this.taskCopy.result;
        paramsObj.resultAt = { $date: new Date() };
        break;
      default:
        alert('action not implemented yet');
        return;
    }

    this.confirming = true;
    this.action.perform(this.task, this._api, paramsObj).then(updatedTask => {
      // we'd better revert updatedTask back to without $date thing!
      this.done.emit(updatedTask);
      this.confirming = false;
    }).catch(error => {
      this.confirmError = error;
      this.confirming = false;
      this.error.emit(error);
    });
  }

  plusDay(i) {
    const scheduledAt = new Date(Date.parse(this.taskCopy.scheduledAt as any));
    scheduledAt.setDate(scheduledAt.getDate() + i);
    this.taskCopy.scheduledAt = scheduledAt;
  }


  gmbBiz;
  gmbRequest;
  gmbAccount;
  restaurantLogs: Log[] = [];
  refreshRelated() {
    this.restaurantLogs = [];
    ['gmbBiz', 'gmbRequest', 'gmbAccount'].forEach(obj => {
      this[obj] = undefined;
      if (this.task.relatedMap[obj + 'Id']) {
        this._api.get(environment.adminApiUrl + "generic", {
          resource: obj,
          query: {
            _id: { $oid: this.task.relatedMap[obj + 'Id'] }
          },
          limit: 1
        }).subscribe(results => {
          this[obj] = results[0];
          if (obj === 'gmbBiz' && results[0] && results[0].qmenuId) {
            this.refreshLogs();
          }
        });
      }
    });
  }

  refreshLogs() {
    this.restaurantLogs = [];
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        _id: { $oid: this.gmbBiz.qmenuId }
      },
      projection: {
        logs: 1
      },
      limit: 1
    }).subscribe(
      results => {
        if (results[0] && results[0].logs) {
          this.restaurantLogs = results[0].logs.map(log => new Log(log));
          // sort DESC
          this.restaurantLogs = this.restaurantLogs.sort((a, b) => b.time.valueOf() - b.time.valueOf());
        }
      });
  }

}
