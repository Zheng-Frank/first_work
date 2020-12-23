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
  purgedOnly = false;

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
        name: "GMB Request",
        result: null
      },
      projection: { _id: 1, "request.locationName": 1, "request.email": 1, "request.appealId": 1, "request.statusHistory": { $slice: 1 }, "request.statusHistory.status": 1, "request.statusHistory.isError": 1, canceledReason: 1 }

    }, 10000);

    const openStatusMap = {};
    const canceledStatusMap = {};

    gmbTasks.forEach(task => {
      let { status, isError } = (task.request.statusHistory || [])[0] || {} as any;
      if (status && status.startsWith("ALREADY PUBLISHED UNDER")) {
        status = "ALREADY PUBLISHED UNDER...";
      }
      if (task.canceledReason) {
        const status = task.canceledReason; // use this as status
        canceledStatusMap[status] = canceledStatusMap[status] || { isError: isError, status: status, tasks: [], canceled: true };
        canceledStatusMap[status].tasks.push(task);
      } else {
        openStatusMap[status] = openStatusMap[status] || { isError: isError, status: status, tasks: [] };
        openStatusMap[status].tasks.push(task);
      }

    });

    //order by task count
    this.rows = [...Object.values(openStatusMap), ...Object.values(canceledStatusMap)];
    this.rows.sort((a, b) => b.tasks.length - a.tasks.length);
    this.filter();

  }

  filter() {
    this.filteredRows = this.rows;
    if (this.errorsOnly) {
      this.filteredRows = this.filteredRows.filter(r => r.isError);
    }
    if (this.purgedOnly) {
      this.filteredRows = this.filteredRows.filter(r => r.canceled);
    }
    else {
      this.filteredRows = this.filteredRows.filter(r => !r.canceled);
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

  async closeRow(row) {
    if (confirm('Are you sure to close the task?')) {
      for (let task of row.tasks) {
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=task",
          [{ old: { _id: task._id }, new: { _id: task._id, result: "CLOSED", resultAt: { $date: new Date() } } }]).toPromise();
      }
      await this.populate();
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
    if (confirm('Are you sure to close the task?')) {
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

  async reloadTask(task) {
    try {
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
