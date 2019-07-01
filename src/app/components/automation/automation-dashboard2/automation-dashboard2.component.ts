import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { GlobalService } from 'src/app/services/global.service';
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-automation-dashboard2',
  templateUrl: './automation-dashboard2.component.html',
  styleUrls: ['./automation-dashboard2.component.css']
})
export class AutomationDashboard2Component implements OnInit {

  taskRows = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.loadTasks();
  }

  ngOnInit() {
  }

  async loadTasks() {
    const tasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      query: {},
      resource: 'task',
      limit: 8000
    }).toPromise();
    this.taskRows = tasks.map(task => ({
      task: task
    }));
    this.computeRowStatuses();
  }

  computeRowStatuses() {
    this.taskRows = this.taskRows.map(row => ({
      task: row.task,
      shouldShowStart: !row.task.executions || row.task.executions.length === 0,
      shouldShowStop: !row.task.result && row.task.executions && row.task.executions.length > 0,
      shouldShowResume: !row.task.result && row.task.executions && row.task.executions.length > 0 && row.task.executions[row.task.executions.length - 1].running === false
    }));
  }

  consoleOut(taskRow) {
    console.log(taskRow);
    this._global.publishAlert(AlertType.Info, 'Check console for task details');
  }

  async start(row) {
    // making sure it's not running!
    const updatedRow = this.refresh(row);

    const executions = row.task.executions || [];
    if (executions.length > 0) {
      this._global.publishAlert(AlertType.Info, 'Already run');
      return;
    }

    // call run and refresh
    this.refresh(row);
  }

  async refresh(row) {
    const taskFromDb = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      query: {
        _id: { $oid: row.task._id }
      },
      resource: 'task',
      limit: 1
    }).toPromise())[0];
    if (taskFromDb) {
      for (let i = 0; i < this.taskRows.length; i++) {
        if (this.taskRows[i].task._id === taskFromDb._id) {
          this.taskRows[i].task = taskFromDb;
        }
      }
    }

    this.computeRowStatuses();
    return row;
  }
}
