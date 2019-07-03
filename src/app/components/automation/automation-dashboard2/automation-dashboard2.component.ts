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
      shouldShowStart: !row.task.executions || row.task.executions.length === 0 || row.task.executions.slice(-1)[0].status && row.task.executions.slice(-1)[0].status !== 200,
      shouldShowStop: !row.task.result && row.task.executions && row.task.executions.length > 0 && row.task.executions.slice(-1)[0].running,
      executions: (row.task.executions || []).map(exec => ({ time: exec.time, response: exec.response, status: exec.status || (exec.running ? 'running' : '') }))
    }));
  }

  consoleOut(taskRow) {
    console.log(taskRow);
    this._global.publishAlert(AlertType.Info, 'Check console for task details');
  }

  async start(row) {
    // making sure it's not running!
    this.refresh(row);
    this._api.post(environment.taskUrl + 'start', { _id: row.task._id }).subscribe(
      response => {
        console.log('response=', response);
        this.refresh(row);
      },
      error => {
        this._global.publishAlert(AlertType.Danger, 'Error: ' + JSON.stringify(error));
        this.refresh(row);
      });

    // give api a chance to flip status around, then refresh
    setTimeout(() => {
      this.refresh(row);
    }, 1000);

  }

  async stop(row) {
    // making sure it's not running!
    this.refresh(row);

    const executions = row.task.executions || [];

    const lastExecution = executions.slice(-1)[0];
    if (!lastExecution || !lastExecution.running) {
      this._global.publishAlert(AlertType.Info, 'No running execution found');
      return;
    }

    // emulate running
    setTimeout(async () => {
      lastExecution.running = false;
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=task', [{
        old: {
          _id: row.task._id
        },
        new: {
          _id: row.task._id,
          executions: executions
        }
      }]).toPromise();
    }, 0);

    // call run and refresh
    setTimeout(() => {
      this.refresh(row);
    }, 1000);
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

  showDetails(execution) {
    alert(JSON.stringify(execution, null, 2));
  }
}
