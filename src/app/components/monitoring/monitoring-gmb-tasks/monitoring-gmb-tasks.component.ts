import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from 'src/app/classes/alert-type';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { ThrowStmt } from '@angular/compiler';
@Component({
  selector: 'app-monitoring-gmb-tasks',
  templateUrl: './monitoring-gmb-tasks.component.html',
  styleUrls: ['./monitoring-gmb-tasks.component.css']
})
export class MonitoringGmbTasksComponent implements OnInit {
  rows = [];
  filteredRows = [];
  errorsOnly = false;
  v5Only = false;
  scriptStatus;

  now = new Date();
  @ViewChild('taskModal') taskModal: ModalComponent;
  selectedTask;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.populate();
  }

  async populate() {
    const gmbTasks = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        "name": "GMB Request",
        // "request.statusHistory.0.isError": true,
        "result": null
      },
      projection: { _id: 1, processorVersion: 1, "request.email": 1, "request.appealId": 1, "request.statusHistory": { $slice: 1 }, "request.statusHistory.status": 1, "request.statusHistory.isError": 1 }

    }, 100000);

    const statusMap = {};

    gmbTasks.forEach(task => {
      let { status, isError } = (task.request.statusHistory || [])[0] || {} as any;
      if (status && status.startsWith("ALREADY PUBLISHED UNDER")) {
        status = "ALREADY PUBLISHED UNDER...";
      }
      statusMap[status] = statusMap[status] || { isError: isError, status: status, tasks: [], versions: [] };
      statusMap[status].tasks.push(task);
      if (!statusMap[status].versions.some(v => v === task.processorVersion)) {
        statusMap[status].versions.push(task.processorVersion);
      }
    });

    //order by task count
    this.rows = Object.values(statusMap);
    this.rows.sort((a, b) => b.tasks.length - a.tasks.length);
    this.filter();

    // retrieve v5 last scan and time consumed
    this.scriptStatus = (await this._api.get(
      environment.qmenuApiUrl + 'generic', {
      resource: 'script-report',
      query: { name: "gmb-refresh-no-pin-tasks" },
      limit: 1,
      sort: { createdAt: -1 }
    }).toPromise())[0];

  }

  filter() {
    this.filteredRows = this.rows;
    if (this.errorsOnly) {
      this.filteredRows = this.filteredRows.filter(r => r.isError);
    }

    if (this.v5Only) {
      this.filteredRows = this.filteredRows.map(row => ({
        ...row,
        tasks: row.tasks.filter(t => t.processorVersion === "v5")
      })).filter(r => r.tasks.length > 0);
    }
  }

  getTotalTasks() {
    return this.filteredRows.reduce((sum, row) => sum + row.tasks.length, 0);
  }

  async rerun(row) {
    try {
      await this._api.post(environment.gmbNgrok + 'task/refresh', {
        taskIds: row.tasks.map(task => task._id)
      }).toPromise();

      this._global.publishAlert(AlertType.Success, 'Submitted');

    } catch (error) {
      console.log(error);
      const result = error.error || error.message || error;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
    }
  }

  async resetError(row) {
    try {
      // pull every task and put a reset status to it
      for (let task of row.tasks) {
        const taskWithStatusHistory = (await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'task',
          query: { _id: { $oid: task._id } },
          projection: {
            "request.statusHistory": 1
          }
        }).toPromise())[0];

        const oldOne = { _id: task._id, request: {} };
        const newStatusHistory = taskWithStatusHistory.request.statusHistory || [];
        newStatusHistory.unshift({ time: new Date(), status: "MANUAL RESET" });
        const newOne = { _id: task._id, request: { statusHistory: newStatusHistory } };
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=task", [{ old: oldOne, new: newOne }]).toPromise();

      }

      this._global.publishAlert(AlertType.Success, 'Success');
      this.populate();
    } catch (error) {
      console.log(error);
      const result = error.error || error.message || error;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
    }
  }
  async showDetails(task) {

    this.taskModal.show();
    const tasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: { _id: { $oid: task._id } }
    }).toPromise();
    this.selectedTask = tasks[0];
  }

  async rerunV5(task) {
    try {
      await this._api.post(environment.appApiUrl + "gmb/generic", {
        name: "process-one-task",
        payload: {
          taskId: task._id,
          forceRefresh: true
        }
      }).toPromise();
      await this.showDetails(task);
      this._global.publishAlert(AlertType.Success, "Success");
      this.populate();
    }
    catch (error) {
      console.error(error);
      await this.showDetails(task);
      this._global.publishAlert(AlertType.Danger, error);
    }
  }


  async closeTask(task) {
    try {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=task",
        [{ old: { _id: task._id }, new: { _id: task._id, result: "CLOSED", resultAt: { $date: new Date() } } }]).toPromise();

      await this.showDetails(task);
      this._global.publishAlert(AlertType.Success, "Success");
      this.populate();
    }
    catch (error) {
      console.error(error);
      await this.showDetails(task);
      this._global.publishAlert(AlertType.Danger, error);
    }
  }
}
