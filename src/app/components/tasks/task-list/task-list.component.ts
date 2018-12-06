import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit, OnChanges {

  @Input() taskList = [];
  @Input() user;
  @Output() actionDone = new EventEmitter();

  now = new Date();
  claimed;
  assignee: string;

  assigneeList=[];
  myColumnDescriptors = [
    {
      label: "Scheduled At",
      paths: ['scheduledAt'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    },
    // {
    //   label: "Closed At",
    //   paths: ['resultAt'],
    //   sort: (a, b) => (a || new Date(0)).valueOf() - (b || new Date(0)).valueOf()
    // },
    {
      label: "Task",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Time Zone",
      paths: ['gmbBiz', 'timeZone'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Listing",
      paths: ['gmbBiz', 'gmbOpen'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Group"
    },
    {
      label: "Assignee",
      paths: ['assignee'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Comments"
    },
    {
      label: "Actions"
    }
  ];

  taskNames = ['All'];
  selectedTaskName = 'All';

  filteredTasks = [];


  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.taskList) {
      this.taskNames = ['All', ...Array.from(new Set(this.taskList.map(t => t.name)))];
      if (this.taskNames.indexOf(this.selectedTaskName) < 0) {
        this.selectedTaskName = 'All';
      }
      this.filter();
    }
  }

  filter() {
    if (this.selectedTaskName === 'All') {
      this.filteredTasks = this.taskList;
    } else {
      this.filteredTasks = this.taskList.filter(t => t.name === this.selectedTaskName);
    }

    switch (this.claimed) {
      case 'Claimed':
        this.filteredTasks = this.filteredTasks.filter(t => t.assignee);
        break;
      case 'Not Claimed':
        this.filteredTasks = this.filteredTasks.filter(t => !t.assignee);
        break;
      case 'Any':
        this.filteredTasks = this.filteredTasks;
        break;
      default:
        break;
    }

    if (this.assignee && this.assignee !== "Any") {
      this.filteredTasks = this.filteredTasks.filter(t => t.assignee == this.assignee);
    }

    this.assigneeList = this.filteredTasks.map(t => t.assignee);
    // reuturn unique
    this.assigneeList= Array.from(new Set(this.assigneeList)).sort().filter(e => e != null);
  }


  getTaskClass(task) {
    const day = 24 * 3600 * 1000;
    const diff = this.now.valueOf() - task.scheduledAt.valueOf();
    if (diff > day) {
      return 'danger';
    }

    if (diff > 0) {
      return 'warning';
    }

    if (diff > -1 * day) {
      return 'info';
    }
    return 'success';
  }

  getRoles(task: Task) {
    return (task.roles || []).join(', ');
  }

  triggerActionDone(event) {
    this.actionDone.emit(event);
  }

  selectTask(item) {
    this.filter();
  }


}
