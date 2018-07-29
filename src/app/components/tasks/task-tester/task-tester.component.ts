import { Component, NgZone } from '@angular/core';
import { Task } from '../../../classes/task';

@Component({
  selector: 'app-task-tester',
  templateUrl: './task-tester.component.html',
  styleUrls: ['./task-tester.component.css']
})
export class TaskTesterComponent {
  tasks: Task[] = [];
  myTasks: Task[] = [];

  groupedTasks = []; // [{name: 'mytask', 'OPEN': 3, 'ASSIGNED': 2, 'CLOSED': 2, 'CANCELED': 4}]

  myName = 'gary';
  myRoles = ['role1', 'role3'];

  statuses = [
    { name: 'OPEN', btnClass: 'btn-secondary' },
    { name: 'ASSIGNED', btnClass: 'btn-primary' },
    { name: 'CLOSED', btnClass: 'btn-success' },
    { name: 'CANCELED', btnClass: 'btn-danger' }]

  constructor(_zone: NgZone) {

    [undefined, 'gary', 'brian'].map((assignee, i) =>
      [undefined, 'role1', 'role2', 'role3', 'role4'].map((role, j) =>
        [undefined, 'CLOSED', 'CANCELED'].map((result, k) => {
          let random = Math.floor(Math.random() * 3);
          for (let i = 0; i < random; i++) {
            this.tasks.push(new Task({
              name: 'awesome tasks' + i + j,
              description: 'some description blah blah',
              assignee: assignee,
              roles: [role],
              result: result
            }));
          }

        })));

    this.myTasks = this.tasks.filter(t =>
      t.assignee === this.myName || t.roles.some(r => this.myRoles.indexOf(r) >= 0));

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

  }

}
