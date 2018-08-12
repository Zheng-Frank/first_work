import { Component, NgZone } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { User } from '../../../classes/user';

@Component({
  selector: 'app-task-dashboard',
  templateUrl: './task-dashboard.component.html',
  styleUrls: ['./task-dashboard.component.css']
})
export class TaskDashboardComponent {

  myTasks: Task[] = [];
  user: User;

  groupedTasks = []; // [{name: 'mytask', 'OPEN': 3, 'ASSIGNED': 2, 'CLOSED': 2, 'CANCELED': 4}]

  statuses = [
    { name: 'OPEN', btnClass: 'btn-secondary' },
    { name: 'ASSIGNED', btnClass: 'btn-primary' },
    { name: 'CLOSED', btnClass: 'btn-success' },
    { name: 'CANCELED', btnClass: 'btn-danger' }]

  constructor(private _api: ApiService, private _global: GlobalService) {

    this.user = this._global.user;

    this.refresh();


    // [undefined, 'gary', 'brian'].map((assignee, i) =>
    //   [undefined, 'role1', 'role2', 'role3', 'role4'].map((role, j) =>
    //     [undefined, 'CLOSED', 'CANCELED'].map((result, k) => {
    //       let random = Math.floor(Math.random() * 3);
    //       for (let i = 0; i < random; i++) {
    //         this.tasks.push(new Task({
    //           name: 'awesome tasks' + i + j,
    //           description: 'some description blah blah',
    //           assignee: assignee,
    //           roles: [role],
    //           result: result
    //         }));
    //       }

    //     })));



  }

  refresh() {
    this._api.get(environment.adminApiUrl + "generic", {
      resource: "task",
      query: {
      },
      limit: 10000
    }).subscribe(tasks => {
      console.log(tasks);
      tasks = tasks.map(t => new Task(t));
      this.myTasks = tasks.filter(t =>
        t.assignee === this._global.user.username || t.roles.some(r => this._global.user.roles.indexOf(r) >= 0));

      console.log(this.myTasks)
      // compute groupedTasks, by task name
      const nameMap = {};
      this.myTasks.map(t => {
        nameMap[t.name] = nameMap[t.name] || { name: t.name };

        let status = t.getStatus();

        nameMap[t.name][status] = (nameMap[t.name][status] || 0) + 1;
      });

      console.log(nameMap);

      // convert to groupedTasks so that we can bind to UI
      this.groupedTasks = Object.keys(nameMap).map(key => nameMap[key]);
    }, error => {
      console.log(error);
    });
  }

  generateTask() {
    Task.generate({ name: 'Call Restaurant Owner', description: '407-580-7504, Demo Restaurant', roles: ['ADMIN'] }, this._api)
      .subscribe(
        tasks => {
          console.log(tasks);
          this.refresh();
        },
        error => {
          console.log(error);
        });
  }

  updateTask(event) {
    console.log('updated task:', event);
    // find and replace the task
    for (let i = 0; i < this.myTasks.length; i++) {
      if (this.myTasks[i]._id === event.task._id) {
        this.myTasks[i] = event.task;
      }
    }
  }

}
