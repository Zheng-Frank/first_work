import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Task } from '../../../classes/tasks/task';
import { ApiService } from "../../../services/api.service";
import { GlobalService } from "../../../services/global.service";
import { User } from '../../../classes/user';
import { environment } from "../../../../environments/environment";
import { KnownError } from 'src/app/classes/know-errors';
import {
  ModalComponent,
  AddressPickerComponent,
  FormBuilderComponent
} from "@qmenu/ui/bundles/qmenu-ui.umd";

@Component({
  selector: 'app-restaurants-courier-list',
  templateUrl: './restaurants-courier-list.component.html',
  styleUrls: ['./restaurants-courier-list.component.css']
})

export class RestaurantsCourierListComponent implements OnInit {

  @Input() restaurantList = [];
  @Input() user: User;
  @Output() actionDone = new EventEmitter();
  // @Input() skeletalRestaurants;

  @ViewChild("callModal") callModal: ModalComponent;
  @ViewChild("availabilityModal") availabilityModal: ModalComponent;
  @ViewChild("logEditorModal") logEditorModal: ModalComponent;
  

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
    "Verifiable",
    "Should Call",
    "Postcard Sent",
    "Has Email",
  ]

  gmb;

  pagination = true;

  selectedAvailability = "All";
  availabilityList = ["All", "signed up", "available", "not available", "unknown"];

  timeZone = "All";
  timeZoneList = ["PDT", "MDT", "CDT", "EDT", "HST", "AKDT"].sort();

  myColumnDescriptors = [
    {
      label: 'Number'
    },
    // {
    //   label: "_id",
    //   paths: ['_id'],
    //   sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    //   // sort: 
    // },
    // {
    //   label: "cid",
    //   paths: ['cid'],
    //   sort: (a, b) => Number(a) - Number(b)
    // },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    // {
    //   label: "address",
    //   paths: ['address'],
    //   sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    // },
    {
      label: "Availability",
      paths: ['availability'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Phone"
    },
    {
      label: "Log",
    },
    // {
    //   label: "Score",
    //   paths: ['name'],
    //   sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    //   // sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    // },
    // {
    //   label: "Group"
    // },
    // {
    //   label: "Assignee",
    //   paths: ['name'],
    //   sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    // },
    // {
    //   label: "Comments"
    // },
    // {
    //   label: "Actions"
    // },
    // {
    //   label: "Created",
    //   paths: ['name'],
    //   sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    //   // sort: (a, b) => a.valueOf() - b.valueOf()
    // },
    // {
    //   label: "Closed At",
    //   paths: ['name'],
    //   sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    //   // sort: (a, b) => (a || new Date(0)).valueOf() - (b || new Date(0)).valueOf()
    // },

  ];

  taskNames = ['All'];
  selectedTaskName = 'All';

  filteredRestaurants = [];


  constructor(private _api: ApiService, private _global: GlobalService) {
    console.log("Constructing");
    console.log(this.restaurantList);
  }

  async ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges) {
    console.log("Changing");
    console.log(this.restaurantList);
    console.log("Still changing");
    if (this.restaurantList) {
      this.taskNames = ['All', ...Array.from(new Set(this.restaurantList.map(t => t.availability)))];
      if (this.taskNames.indexOf(this.selectedTaskName) < 0) {
        this.selectedTaskName = 'All';
      }
      this.filter();
    }
  }

  hasBadScanStatus(task) {
    const status = (((task.transfer || {}).statusHistory || [])[0] || {}).status;
    return ['Timeout', 'LOCATION REMOVED FROM ACCOUNT', 'no matching restaurant'].some(error => (JSON.stringify(status) || '').indexOf(error) >= 0);
  }

  hasGoodScanStatus(task) {
    const status = (((task.transfer || {}).statusHistory || [])[0] || {}).status;
    return status === null || [KnownError.GMB_WAITING_FOR_APPEAL, KnownError.GMB_UI_NOT_VERIFIABLE, 'SHOULD USE PHONE_CALL TO VERIFY', 'WAIT', 'NO AUTO POPULATION', 'null'].some(error => (JSON.stringify(status) || '').indexOf(error) >= 0);
  }

  filter() {
    if (this.selectedAvailability === "All") {
      this.filteredRestaurants = this.restaurantList;
    }
    else {
      this.filteredRestaurants = this.restaurantList.filter(each => each.availability === this.selectedAvailability);
    }
    // if (this.selectedTaskName === 'All') {
    //   this.filteredTasks = this.restaurantList;
    // } else {
    //   this.filteredTasks = this.restaurantList.filter(t => t.name === this.selectedTaskName);
    // }
    // if (this.onlyDirectSignUp) {
    //   this.filteredTasks = this.restaurantList.filter(t => t.gmbBiz && t.gmbBiz.isDirectSignUp)
    // }

    // switch (this.claimed) {
    //   case 'Claimed':
    //     this.filteredTasks = this.filteredTasks.filter(t => t.assignee);
    //     break;
    //   case 'Not Claimed':
    //     this.filteredTasks = this.filteredTasks.filter(t => !t.assignee);
    //     break;
    //   case 'Any':
    //     this.filteredTasks = this.filteredTasks;
    //     break;
    //   default:
    //     break;
    // }

    // if (this.assignee && this.assignee !== "All") {
    //   this.filteredTasks = this.filteredTasks.filter(t => t.assignee === this.assignee);
    // }

    // if (this.owner && this.owner !== "All") {
    //   this.filteredTasks = this.filteredTasks.filter(t => t.gmbBiz && t.gmbBiz.gmbOwner === this.owner);
    // }

    // if (this.gmb && this.gmb !== "All") {
    //   this.filteredTasks = this.filteredTasks.filter(task => {
    //     const qmenuId = (task.relatedMap || {}).qmenuId || (task.gmbBiz || {}).qmenuId || 'none'

    //     let rt = this.skeletalRestaurants.filter(r => r._id === qmenuId)[0];
    //     const gmbWeb = (rt || {}).web || {};

    //     if (this.gmb === "Skip All") {
    //       if (gmbWeb.ignoreGmbOwnershipRequest) {
    //         return task;
    //       }

    //     } else if (this.gmb === "Agree to Coorporate") {
    //       if (gmbWeb.agreeToCorporate === "Yes") {
    //         return task;
    //       }
    //     }
    //     else if (this.gmb === "qMenu Exclusive") {
    //       if (gmbWeb.qmenuExclusive === "Yes") {
    //         return task;
    //       }
    //     }
    //     else if (this.gmb === "Not call yet") {
    //       if (typeof gmbWeb.agreeToCorporate === "undefined" && typeof gmbWeb.qmenuExclusive === "undefined") {
    //         return task;
    //       }
    //     } else if (this.gmb === "Verifiable") {
    //       return task && task.transfer && task.transfer.verificationOptions;
    //     } else if (this.gmb === "Should Call") {
    //       return task && task.transfer && task.transfer.verificationOptions && task.transfer.verificationOptions.some(vo => vo.method === 'PHONE_CALL') && !task.transfer.verificationOptions.some(vo => vo.method === 'ADDRESS' && vo.verificationResponse);
    //     } else if (this.gmb === "Postcard Sent") {
    //       return task && task.transfer && task.transfer.verificationOptions && task.transfer.verificationOptions.some(vo => vo.method === 'ADDRESS' && vo.verificationResponse);
    //     } else if (this.gmb === "Has Email") {
    //       return task && task.transfer && task.transfer.verificationOptions && task.transfer.verificationOptions.some(vo => vo.method === 'EMAIL' && vo.verificationResponse);
    //     }
    //   });
    // }

    // if (this.timeZone && this.timeZone !== "All") {
    //   this.filteredTasks = this.filteredTasks.filter(t => t.gmbBiz && t.gmbBiz.timeZone === this.timeZone);
    // }

    // this.assigneeList = this.restaurantList.map(t => t.assignee);
    // // reuturn unique
    // this.assigneeList = Array.from(new Set(this.assigneeList)).sort().filter(e => e != null);

    // this.ownerList = this.restaurantList.map(t => t.gmbBiz && t.gmbBiz.gmbOwner);
    // this.ownerList = Array.from(new Set(this.ownerList)).sort().filter(e => e != null);
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

  // getGMB(id) {
  //   //console.log(this.restaurantList);
  //   if (id) {
  //     console.log(this.skeletalRestaurants.filter(r => r._id === id)[0].web)
  //     return this.skeletalRestaurants.filter(r => r._id === id)[0].web;
  //   }
  // }



  taskInEditing = { name: '' }; //???
  call(task) {
    console.log("Calling task:");
    console.log(task);
    this.taskInEditing = task;
    // this.selectedtask = task;
    this.callModal.show();
  }

  editingNewCallLog = false;
  toggleNewCallLog() {
    this.editingNewCallLog = !this.editingNewCallLog;
    // if (this.editingNewCallLog) {
    //   this.newCallLog = new CallLog();
    //   this.newCallLog.time = new Date();
    //   this.newCallLog.caller = this._global.user.username;
    //   if (this.selectedLead.phones && this.selectedLead.phones.length === 1) {
    //     this.newCallLog.phone = this.selectedLead.phones[0];
    //   }
    // }
  }

  formFieldDescriptors = [
    {
      field: "comments",
      label: "Comments",
      required: true,
      disabled: false
    },
  ]


  formRemove(event) { }

  async scanSubmit(event) {
    if (!event.object.comments) {
      return event.acknowledge("Must input comments");
    }
    if (!event.object.log) {
      event.object.log = [];
    }
    const newLog = {
      caller: this._global.user.username,
      time: (new Date()).toISOString(),
      comments: event.object.comments,
    }

    event.object.log.unshift(newLog);
    event.object.comments = '';
    // post to database!!!
    // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=postmates', [{ old: { _id: event.object._id }, new: event.object }]).toPromise();
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=postmates', [{ old: { _id: event.object._id }, new: { _id: event.object._id, log: event.object.log, testField: "test" } }]).toPromise();
    console.log(event.object);
    this.callModal.hide();
  }

  // Change log manually: logEditorModal

  logEditorFieldDescriptors = [
    {
      field: "comments",
      label: "Comments",
      required: true,
      disabled: false
    },
  ]
  logInEditing: number;
  editLog(task, logIndex: number) {
    console.log("Editing log.");
    console.log(task);
    this.taskInEditing = task;
    this.logInEditing = logIndex;
    task.comments = task.log[logIndex].comments;
    // this.selectedtask = task;
    this.logEditorModal.show();
  }

  async logEditorSubmit(event) {
    if (!event.object.log) {
      event.object.log = [];
      console.log("Cannot edit log in empty list!");
      this.logEditorModal.hide();
      return;
    }
    // const newLog = {
    //   caller: this._global.user.username,
    //   time: (new Date()).toISOString(),
    //   comments: event.object.comments,
    // }

    event.object.log[this.logInEditing].comments = event.object.comments;
    event.object.comments = '';
    // post to database!!!
    // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=postmates', [{ old: { _id: event.object._id }, new: event.object }]).toPromise();
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=postmates', [{ old: { _id: event.object._id }, new: { _id: event.object._id, log: event.object.log, testField: "test" } }]).toPromise();
    console.log(event.object);
    this.logEditorModal.hide();
  }
  // Change availability: availabilityModal

  availabilityFieldDescriptors = [
    {
      field: "availabilityNew",
      label: "Availibility",
      required: false,
      inputType: "single-select",
      items: [
        "signed up",
        "available",
        "not available",
        "unknown"
      ].map(status => ({ object: status, text: status, selected: false }))
    },
  ]

  changeAvail(task) {
    console.log("Changing availability.");
    console.log(task);
    this.taskInEditing = task;
    // this.selectedtask = task;
    this.availabilityModal.show();
  }

  async availabilitySubmit(event) {
    if (!event.object.log) {
      event.object.log = [];
    }

    event.object.availability = event.object.availabilityNew;
    const newLog = {
      caller: this._global.user.username,
      time: (new Date()).toISOString(),
      comments: "availability changed to " + event.object.availabilityNew,
    }

    event.object.log.unshift(newLog);
    // post to database!!!
    // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=postmates', [{ old: { _id: event.object._id }, new: event.object }]).toPromise();
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=postmates', [{ old: { _id: event.object._id }, new: { _id: event.object._id, log: event.object.log, availability: event.object.availabilityNew } }]).toPromise();
    console.log(event.object);
    this.availabilityModal.hide(); // move to first line later???
  }
}
