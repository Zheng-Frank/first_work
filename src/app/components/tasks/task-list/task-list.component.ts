import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { GlobalService } from "../../../services/global.service";
@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit, OnChanges {

  @Input() taskList = [];
  @Input() user;
  @Output() actionDone = new EventEmitter();
  @Input() globalCachedRestaurantList;

  now = new Date();
  claimed;
  assignee: string;
  owner: string;
  onlyDirectSignUp: boolean;

  assigneeList = [];
  ownerList = [];
  gmbList = [
    "Skip All",
    "Not call yet",
    "Agree to Coorporate",
    "qMenu Exclusive",
    "Can Verify",
  ]

  gmb;

  pagination = true;

  myColumnDescriptors = [
    {
      label: 'Number'
    },
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
      paths: ['description', 'name'],
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
      label: "Owner",
      paths: ['gmbBiz', 'gmbOwner'],
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
    },
    {
      label: "Created",
      paths: ['createdAt'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    }

  ];

  taskNames = ['All'];
  selectedTaskName = 'All';

  filteredTasks = [];


  constructor(private _global: GlobalService) { }

  async ngOnInit() {

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

  hasVerificationOption(method, task) {
    return ((task.transfer || {}).verificationOptions || []).some(option => option.method === method && !option.unrecognized);
  }

  canVerify(task) {
    return ((task.transfer || {}).verificationOptions || []).length > 0;
  }

  filter() {
    if (this.selectedTaskName === 'All') {
      this.filteredTasks = this.taskList;
    } else {
      this.filteredTasks = this.taskList.filter(t => t.name === this.selectedTaskName);
    }
    if (this.onlyDirectSignUp) {
      this.filteredTasks = this.taskList.filter(t => t.gmbBiz && t.gmbBiz.isDirectSignUp)
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

    if (this.assignee && this.assignee !== "All") {
      this.filteredTasks = this.filteredTasks.filter(t => t.assignee === this.assignee);
    }

    if (this.owner && this.owner !== "All") {
      this.filteredTasks = this.filteredTasks.filter(t => t.gmbBiz && t.gmbBiz.gmbOwner === this.owner);
    }

    if (this.gmb && this.gmb !== "All") {
      this.filteredTasks = this.filteredTasks.filter(task => {
        const qmenuId = (task.relatedMap || {}).qmenuId || (task.gmbBiz || {}).qmenuId || 'none'

        let rt = this.globalCachedRestaurantList.filter(r => r._id === qmenuId)[0];
        const gmbWeb = (rt || {}).web || {};

        if (this.gmb === "Skip All") {
          if (gmbWeb.ignoreGmbOwnershipRequest) {
            return task;
          }

        } else if (this.gmb === "Agree to Coorporate") {
          if (gmbWeb.agreeToCorporate === "Yes") {
            return task;
          }
        }
        else if (this.gmb === "qMenu Exclusive") {
          if (gmbWeb.qmenuExclusive === "Yes") {
            return task;
          }
        }
        else if (this.gmb === "Not call yet") {
          if (typeof gmbWeb.agreeToCorporate === "undefined" && typeof gmbWeb.qmenuExclusive === "undefined") {
            return task;
          }
        } else if (this.gmb === "Can Verify") {
          return task && task.transfer && (task.transfer.verificationOptions);
        }
      });

    }



    this.assigneeList = this.taskList.map(t => t.assignee);
    // reuturn unique
    this.assigneeList = Array.from(new Set(this.assigneeList)).sort().filter(e => e != null);

    this.ownerList = this.taskList.map(t => t.gmbBiz && t.gmbBiz.gmbOwner);
    this.ownerList = Array.from(new Set(this.ownerList)).sort().filter(e => e != null);
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

  getGMB(id) {
    //console.log(this.restaurantList);
    if (id) {
      console.log(this.globalCachedRestaurantList.filter(r => r._id === id)[0].web)
      return this.globalCachedRestaurantList.filter(r => r._id === id)[0].web;
    }
  }


}
