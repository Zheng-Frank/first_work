import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from 'src/app/services/global.service';

@Component({
  selector: 'app-gmb-tasks',
  templateUrl: './gmb-tasks.component.html',
  styleUrls: ['./gmb-tasks.component.css']
})
export class GmbTasksComponent implements OnInit {

  apiLoading = false;
  activeTabLabel = 'Mine';
  currentAction;
  tabs = [
    { label: 'Mine', tasks: [] },
    { label: 'Non-claimed', tasks: [] },
    { label: 'My Closed', tasks: [] }
  ];

  myOpenTasks = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.setActiveTab('Mine');
  }

  setActiveTab(tab) {
    this.activeTabLabel = tab.label;
    switch (tab.label) {
      case 'Mine':
        break;
      case 'Mine':
        break;
      case 'Mine':
        break;
      default:
        break;

    }
  }

  async reload() {
    
  }

  async loadMyOpenGmbTasks() {
    const myUsername = this._global.user.username;
    this.myOpenTasks = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "task",
      query: {
        assignee: myUsername,
        name: "Apply GMB Ownership"
      },
      resultAt: null,
      limit: 10000
    }).toPromise();
    await this.sortAndFilter();
  }

  async sortAndFilter() {

  }

}
