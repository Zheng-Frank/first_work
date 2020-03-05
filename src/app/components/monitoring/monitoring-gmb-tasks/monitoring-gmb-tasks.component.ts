import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from 'src/app/classes/alert-type';

@Component({
  selector: 'app-monitoring-gmb-tasks',
  templateUrl: './monitoring-gmb-tasks.component.html',
  styleUrls: ['./monitoring-gmb-tasks.component.css']
})
export class MonitoringGmbTasksComponent implements OnInit {
  rows = [];
  filteredRows = [];
  errorsOnly = true;
  v5Only = false;

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
      projection: { _id: 1, processorVersion: 1, "request.statusHistory": { $slice: 1 }, "request.statusHistory.status": 1, "request.statusHistory.isError": 1 }

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
        taskIds: this.filteredRows[row][1]
      }).toPromise();

      this._global.publishAlert(AlertType.Success, 'Submitted');

    } catch (error) {
      console.log(error);
      const result = error.error || error.message || error;
      this._global.publishAlert(AlertType.Danger, JSON.stringify(result));
    }
  }

}
