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

import { Address } from '@qmenu/ui';
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

  globalCachedRestaurantList;

  currentAction = null;
  requesting = false;

  bizList = [];

  restaurantList = [];

  addTask() {
    setTimeout(() => this.requesting = false, 4000);
  }

  async toggleAction(action) {
    this.currentAction = this.currentAction === action ? null : action;
    if (action === 'ADD' && this.restaurantList.length === 0) {
      this.restaurantList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          disabled: {
            $ne: true
          }
        },
        projection: {
          name: 1,
          alias: 1,
          logo: 1,
          channels: 1,
          score: 1,
          "googleAddress.formatted_address": 1
        }
      },6000)
    }
  }

  statuses = [
    { name: 'OPEN', btnClass: 'btn-secondary' },
    { name: 'ASSIGNED', btnClass: 'btn-info' },
    { name: 'CLOSED', btnClass: 'btn-success' },
    { name: 'CANCELED', btnClass: 'btn-danger' }]

  tabs = [
    { value: 'Mine', label: 'Mine (0)' },
    { value: 'Open', label: 'Open (0)' },
    { value: 'Due', label: 'Due (0)' },
    { value: 'Closed', label: 'Closed (0)' },
    { value: 'Statistics', label: 'Statistics' },
    { value: 'Google PIN', label: 'Google PIN' }
  ];

  activeTabValue = 'Mine';
  constructor(private _api: ApiService, private _global: GlobalService, private _task: TaskService) {
    this.user = this._global.user;

    this.refresh();
  }

  hideClosedOldTasksDays = 15;

  async refresh() {
    this.refreshing = true;
    const daysAgo = function (days) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - days);
      return d;
    };

    const batchSize = 400;
    let result0 = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: "task",
        query: {
          $or: [
            {
              resultAt: null
            },
            {
              updatedAt: {
                $gt: { $date: daysAgo(this.hideClosedOldTasksDays) }
              }
            }
          ]
        },
        skip: result0.length,
        limit: batchSize
      }).toPromise();
      result0.push(...batch);
      if (batch.length === 0 || batch.length < batchSize) {
        break;
      }
    }

    console.log('result0', result0.length);

    const gmbBizBatchSize = 800;
    const result1 = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: "gmbBiz",
        query: {},
        projection: {
          qmenuId: 1,
          address: 1,
          gmbOpen: 1,
          phone: 1,
          name: 1,
          isDirectSignUp: 1,
          gmbOwner: 1
        },
        skip: result1.length,
        limit: gmbBizBatchSize
      }).toPromise();
      result1.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }

    // force refreshing global restaurant list!
    this.globalCachedRestaurantList = await this._global.getCachedVisibleRestaurantList(true);
    this.refreshing = false;
    let tasks = (result0 || []).map(t => new Task(t));
    //won't show "Apply GMB Ownership". "Transfer GMB Ownership" and "Appeal Suspended GMB" if you are not GMB_SPECIALIST
    if (this._global.user.roles.indexOf('GMB_SPECIALIST') < 0) {
      tasks = tasks.filter(t => t.assignee === this._global.user.username || (t.name !== "Apply GMB Ownership" && t.name !== "Transfer GMB Ownership" && t.name !== "Appeal Suspended GMB"))
    }

    console.log('tasks', tasks);

    // stats:
    const closedTasks = tasks.filter(t => t.result === 'CLOSED');
    console.log('closedTasks', closedTasks);
    closedTasks.sort((t2, t1) => new Date(t1.updatedAt).valueOf() - new Date(t2.updatedAt).valueOf());
    let spanDays = 1;
    if (closedTasks.length > 1) {
      spanDays = Math.ceil((new Date(closedTasks[0].updatedAt).valueOf() - new Date(closedTasks[closedTasks.length - 1].updatedAt).valueOf()) / (3600000 * 24));

    }

    const userDict = {};
    closedTasks.map(t => {
      const user = t.assignee || 'system';
      userDict[user] = (userDict[user] || 0) + 1;
    });

    console.log(`User Stats over ${spanDays} days: `);
    Object.keys(userDict).map(user => {
      console.log(`${user} ${userDict[user]} avg ${(userDict[user] / spanDays).toFixed(2)}/day`);
    });

    //if roles contains ADMIN, show all the task
    if (this._global.user.roles.indexOf('ADMIN') > -1) {
      this.myTasks = tasks;
    }
    else {
      this.myTasks = tasks.filter(t =>
        t.creator === this._global.user.username ||
        t.assignee === this._global.user.username || t.roles.some(r => this._global.user.roles.indexOf(r) >= 0));

    }


    this.myTasks = this.myTasks.sort((a, b) => a.scheduledAt.valueOf() - b.scheduledAt.valueOf());

    const bizMap = {};
    (result1).map(biz => {
      bizMap[biz._id] = biz;
    });

    tasks.map(t => {
      if (t.relatedMap && t.relatedMap.gmbBizId && bizMap[t.relatedMap.gmbBizId]) {
        t.gmbBiz = t.gmbBiz || {};
        t.gmbBiz = bizMap[t.relatedMap.gmbBizId];
        t.gmbBiz.timeZone = Address.getTimeZone(t.gmbBiz.address);
      }
    });
    // compute groupedTasks, by task name
    this.computeGroupedTasks();
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
    console.log('update task event!')
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

    await this._api.post(environment.qmenuApiUrl + 'generic?resource=task', [task]).toPromise();
    this._global.publishAlert(AlertType.Success, `Created ${task.name}`);
    this.toggleAction('ADD');
    this.refresh();
  }

}
