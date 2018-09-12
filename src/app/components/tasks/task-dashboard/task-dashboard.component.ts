import { Component, NgZone } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { User } from '../../../classes/user';
import { GmbTransfer } from '../../../classes/gmb/gmb-transfer';
import { GmbAccount } from '../../../classes/gmb/gmb-account';
import { TaskService } from '../../../services/task.service';
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-task-dashboard',
  templateUrl: './task-dashboard.component.html',
  styleUrls: ['./task-dashboard.component.css']
})
export class TaskDashboardComponent {

  myTasks: Task[] = [];
  myOpenTasks: Task[] = [];
  myAssignedTasks: Task[] = [];
  myClosedTasks: Task[] = [];

  user: User;

  refreshing = false;

  purging = false;

  groupedTasks = []; // [{name: 'mytask', 'OPEN': 3, 'ASSIGNED': 2, 'CLOSED': 2, 'CANCELED': 4}]


  currentAction = null;
  requesting = false;

  addTask() {
    setTimeout(() => this.requesting = false, 4000);
  }

  toggleAction(action) {
    this.currentAction = this.currentAction === action ? null : action;
  }

  statuses = [
    { name: 'OPEN', btnClass: 'btn-secondary' },
    { name: 'ASSIGNED', btnClass: 'btn-info' },
    { name: 'CLOSED', btnClass: 'btn-success' },
    { name: 'CANCELED', btnClass: 'btn-danger' }]

  tabs = [
    { value: 'Open', label: 'Open (0)' },
    { value: 'Mine', label: 'Mine (0)' },
    { value: 'Closed', label: 'Closed (0)' },
    { value: 'Statistics', label: 'Statistics' }
  ];

  activeTabValue = 'Open';
  constructor(private _api: ApiService, private _global: GlobalService, private _task: TaskService) {

    this.user = this._global.user;

    this.refresh();

    this.transfer = new GmbTransfer(

      { "fromEmail": "qmenu06@gmail.com" });

  }

  transfer;

  refresh() {
    this.refreshing = true;
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "task",
      query: {},
      limit: 10000,
      sort: {
        createdAt: -1
      }
    }).subscribe(tasks => {
      this.refreshing = false;
      tasks = tasks.map(t => new Task(t));
      this.myTasks = tasks.filter(t =>
        t.assignee === this._global.user.username || t.roles.some(r => this._global.user.roles.indexOf(r) >= 0));

      this.myTasks = this.myTasks.sort((a, b) => a.scheduledAt.valueOf() - b.scheduledAt.valueOf())
      // compute groupedTasks, by task name
      this.computeGroupedTasks();
    }, error => {
      this.refreshing = false;
      console.log(error);
    });
  }

  computeGroupedTasks() {
    const nameMap = {};
    this.myTasks.map(t => {
      nameMap[t.name] = nameMap[t.name] || { name: t.name };
      let status = t.getStatus();
      nameMap[t.name][status] = (nameMap[t.name][status] || 0) + 1;
    });

    // convert to groupedTasks so that we can bind to UI
    this.groupedTasks = Object.keys(nameMap).map(key => nameMap[key]);

    this.myOpenTasks = this.myTasks.filter(t => !t.result);
    this.myAssignedTasks = this.myTasks.filter(t => !t.result && t.assignee === this.user.username);
    this.myClosedTasks = this.myTasks.filter(t => t.result);

    this.tabs.map(tab => {
      switch (tab.value) {
        case 'Open':
          tab.label = 'Open (' + this.myOpenTasks.length + ')';
          break;
        case 'Mine':
          tab.label = 'Mine (' + this.myAssignedTasks.length + ')';
          break;
        case 'Closed':
          tab.label = 'Closed (' + this.myClosedTasks.length + ')';
          break;
        default:
          break;
      }
    });

  }


  updateTask(event) {
    // find and replace the task
    console.log('event!')
    console.log(event);
    for (let i = 0; i < this.myTasks.length; i++) {
      if (this.myTasks[i]._id === event.task._id) {
        // remember to use new!
        this.myTasks[i] = new Task(event.task);
      }
    }
    this.computeGroupedTasks();
  }

  setActiveTab(tab) {
    this.activeTabValue = tab.value;
  }

  async purge() {
    this.purging = true;
    try {
      const purgedTasks = await this._task.purgeTransferTasks();
      console.log('purged: ', purgedTasks)
      this._global.publishAlert(AlertType.Success, 'Purged ' + purgedTasks.length +', check console for details');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error purging tasks');
     }
    this.purging = false;
    this.refresh();
  }
}
