import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';

import { Task } from '../../../classes/tasks/task';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { Restaurant } from '@qmenu/ui';
import { Log } from '../../../classes/log';
import { TaskService } from 'src/app/services/task.service';
import { Gmb3Service } from 'src/app/services/gmb3.service';

@Component({
  selector: 'app-task-gmb-appeal-suspended',
  templateUrl: './task-gmb-appeal-suspended.component.html',
  styleUrls: ['./task-gmb-appeal-suspended.component.css']
})
export class TaskGmbAppealSuspendedComponent implements OnInit, OnChanges {

  @Output() ok = new EventEmitter();
  @Output() cancel = new EventEmitter();

  @Input() task: Task;

  showDetails = false;

  gmbBiz: GmbBiz;
  gmbAccount;
  restaurant: Restaurant;
  restaurantLogs: Log[] = [];

  gmbAppealing = false;

  // comments and result are only updated when clicking OK
  comments;
  result;

  now = new Date();

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb: Gmb3Service) {
    // to refresh 'now' every minute
    setInterval(() => {
      this.now = new Date();
    }, 60000);
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    this.now = new Date();
    if (this.task) {
      this.comments = this.task.comments;
      this.result = this.task.result;
      if (!this.task.etc) {
        this.task.etc = {};
      }
      this.populateGmbBiz();
      this.refreshRelated();
    }
  }

  refreshRelated() {
    this.restaurantLogs = [];
    ['gmbBiz', 'gmbRequest', 'gmbAccount'].forEach(obj => {
      this[obj] = undefined;
      if (this.task.relatedMap && this.task.relatedMap[obj + 'Id']) {
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

  populateGmbBiz() {
    // query gmbBiz
    if (this.task.relatedMap['gmbBizId']) {
      this._api.get(environment.adminApiUrl + "generic", {
        resource: 'gmbBiz',
        query: {
          _id: { $oid: this.task.relatedMap['gmbBizId'] }
        },
        limit: 1
      }).subscribe(results => {
        this.gmbBiz = results[0];
        this.populateRestaurant();
      });
    }
  }

  populateRestaurant() {
    // let's also request qmenu database's restaurant obj: logs, contacts etc.
    if (this.gmbBiz && this.gmbBiz.qmenuId) {
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: 'restaurant',
        query: {
          _id: { $oid: this.gmbBiz.qmenuId }
        },
        projection: {
          people: 1
        },
        limit: 1
      }).subscribe(results => {
        this.restaurant = results[0];
      });
    }
  }


  async appeal() {
    await this._gmb.appeal([this.task]);
  }



  plusDay(i) {

    const newDate = new Date();
    newDate.setDate(newDate.getDate() + i);
    this.task.scheduledAt = newDate;

    this.scheduledAtUpdated();
  }

  scheduledAtUpdated() {
    // update the task scheduledAt
    const oldTask = {
      _id: this.task._id
    }

    const newTask = {
      _id: this.task._id,
      scheduledAt: { $date: this.task.scheduledAt }
    };

    this.saveTask(oldTask, newTask);
  }

  saveTask(oldTask, newTask) {

    this._api
      .patch(environment.adminApiUrl + "generic?resource=task", [{ old: oldTask, new: newTask }])
      .subscribe(
        result => {
          this._global.publishAlert(AlertType.Success, 'Updated Task');
          Object.keys(newTask).map(k => {
            this.task[k] = newTask[k]['$date'] || newTask[k];
          });

        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error Updating Task :(');
        }
      );
  }

  clickOk() {
    let updated = false;
    const oldTask = { _id: this.task._id } as any;
    const newTask = { _id: this.task._id } as any;

    if (this.result && this.result !== this.task.result) {
      newTask.result = this.result;
      newTask.resultAt = { $date: new Date() }
      updated = true;
    }
    if (this.comments !== this.task.comments) {
      newTask.comments = this.comments;
      updated = true;
    }
    if (updated) {
      this.saveTask(oldTask, newTask)
    }
    this.ok.emit();
  }

}
