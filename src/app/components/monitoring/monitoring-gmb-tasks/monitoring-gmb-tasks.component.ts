import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-monitoring-gmb-tasks',
  templateUrl: './monitoring-gmb-tasks.component.html',
  styleUrls: ['./monitoring-gmb-tasks.component.css']
})
export class MonitoringGmbTasksComponent implements OnInit {
  rows = [];
  filteredRows = [];
  errorMap = new Map();
  count = 0;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.populate();
  }

  async populate() {

    const matchingTasks = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'task',
      query: {
        "request.statusHistory.0.isError": true,
        "result": null
      },
      projection: { _id: 1, "request.statusHistory": { $slice: 1 } },
      limit: 1000000 //todo
    }).toPromise();

    this.count = matchingTasks.length;
    console.log(`found ${this.count} gmb tasks with error`);

    matchingTasks.forEach(task => {
      const status = task.request.statusHistory[0].status;
      let ids = this.errorMap.get(status);
      if (!ids) {
        ids = [];
        this.errorMap.set(status, ids);
      };
      ids.push(task._id.toString());
    });

    //order by id count
    this.rows = Array.from(this.errorMap).sort((a, b) => b[1].length - a[1].length);
    
    this.filter();
  }

  filter() {
    const now = new Date();
    this.filteredRows = this.rows;
    // if (this.showOnlyPublished) {
    //   this.filteredRows = this.filteredRows.filter(row => !row.restaurant.disabled && (row.location && row.location.status == 'Published'));
    // }
  }
  

}
