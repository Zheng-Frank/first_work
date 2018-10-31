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
import { zip } from 'rxjs';

import { Address} from '@qmenu/ui';
@Component({
  selector: 'app-task-dashboard',
  templateUrl: './task-dashboard.component.html',
  styleUrls: ['./task-dashboard.component.css']
})
export class TaskDashboardComponent {

  myTasks: Task[] = [];
  myOpenTasks: Task[] = [];
  myDueTasks: Task[] = [];
  myAssignedTasks: Task[] = [];
  myClosedTasks: Task[] = [];

  user: User;

  refreshing = false;

  purging = false;

  groupedTasks = []; // [{name: 'mytask', 'OPEN': 3, 'ASSIGNED': 2, 'CLOSED': 2, 'CANCELED': 4}]


  currentAction = null;
  requesting = false;

  bizList = [];

  restaurantList = [];

  addTask() {
    setTimeout(() => this.requesting = false, 4000);
  }

  async toggleAction(action) {
    this.currentAction = this.currentAction === action ? null : action;
    if(action === 'ADD' && this.restaurantList.length === 0) {
      this.restaurantList = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          disabled: {
            $ne: true
          }
        },
        projection: {
          name: 1,
          alias: 1,
          logs: 1,
          logo: 1,
          "phones.phoneNumber": 1,
          "channels.value": 1,
          "googleAddress.formatted_address": 1
        },
        limit: 6000
      }).toPromise();
    }
  }

  statuses = [
    { name: 'OPEN', btnClass: 'btn-secondary' },
    { name: 'ASSIGNED', btnClass: 'btn-info' },
    { name: 'CLOSED', btnClass: 'btn-success' },
    { name: 'CANCELED', btnClass: 'btn-danger' }]

  tabs = [
    { value: 'Open', label: 'Open (0)' },
    { value: 'Due', label: 'Due (0)' },
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
    zip(this._api.get(environment.adminApiUrl + "generic", {
      resource: "task",
      query: {},
      limit: 10000,
      sort: {
        createdAt: -1
      }
    }),
      this._api.get(environment.adminApiUrl + "generic", {
        resource: "gmbBiz",
        query: {},
        projection: {
          address: 1,
          gmbOpen: 1,
          phone: 1,
          name: 1
        },
        limit: 10000
      }),
    ).subscribe(results => {
      this.bizList = results;
      this.refreshing = false;
      const tasks = results[0].map(t => new Task(t));
      this.myTasks = tasks.filter(t =>
        t.assignee === this._global.user.username || t.roles.some(r => this._global.user.roles.indexOf(r) >= 0));

      this.myTasks = this.myTasks.sort((a, b) => a.scheduledAt.valueOf() - b.scheduledAt.valueOf());

      const bizMap = {};
      results[1].map(biz => {
        bizMap[biz._id] = biz;
      });

      tasks.map(t => {
        if (t.relatedMap && t.relatedMap.gmbBizId && bizMap[t.relatedMap.gmbBizId]) {
          t.gmbBiz = t.gmbBiz || {};
          t.gmbBiz = bizMap[t.relatedMap.gmbBizId];
          // if(t.gmbBiz.address){
          //   t.gmbBiz.timeZone = Address.getTimeZone(t.gmbBiz.address);
          // }
        }
      });
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

    const now = new Date();
    const bufferTime = 0 * 24 * 3600000;
    this.myDueTasks = this.myTasks.filter(t => !t.result && t.scheduledAt && t.scheduledAt.valueOf() && t.scheduledAt.valueOf() < now.valueOf() + bufferTime);

    this.tabs.map(tab => {
      switch (tab.value) {
        case 'Open':
          tab.label = 'Open (' + this.myOpenTasks.length + ')';
          break;
        case 'Due':
          tab.label = 'Due (' + this.myDueTasks.length + ')';
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
      this._global.publishAlert(AlertType.Success, 'Purged ' + purgedTasks.length + ' Transfer Tasks, check console for details');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error purging tasks');
    }

    try {
      const purgedTasks = await this._task.purgeAppealTasks();
      console.log('purged: ', purgedTasks)
      this._global.publishAlert(AlertType.Success, 'Purged ' + purgedTasks.length + ' Appeal Tasks, check console for details');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error purging tasks');
    }

    try {
      const purgedTasks = await this._task.purgeApplyTasks();
      console.log('purged: ', purgedTasks)
      this._global.publishAlert(AlertType.Success, 'Purged ' + purgedTasks.length + ' Apply Tasks, check console for details');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error purging tasks');
    }

    try {
      const purgedTasks = await this._task.deleteOutdatedTasks();
      console.log('purged: ', purgedTasks)
      this._global.publishAlert(AlertType.Success, 'Deleted ' + purgedTasks.length);
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error purging tasks');
    }

    try {
      const purgedTasks = await this._task.deleteMissingBizIdTasks();
      console.log('purged: ', purgedTasks)
      this._global.publishAlert(AlertType.Success, 'Deleted ' + purgedTasks.length);
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error purging tasks');
    }


    this.purging = false;
    this.refresh();
  }

  

  async createNewTask(task) {
    const taskCloned = JSON.parse(JSON.stringify(task));
    if (taskCloned.scheduledAt) {
      taskCloned.scheduledAt = { $date: taskCloned.scheduledAt }
    }
    
    await this._api.post(environment.adminApiUrl + 'generic?resource=task', [task]).toPromise();
    this._global.publishAlert(AlertType.Success, `Created ${task.name}`);
    this.toggleAction('ADD');
    this.refresh();
  }

}
