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
import { CallLog } from "../../../classes/call-log";
import { RestaurantWithCourier } from "../../../classes/restaurant-courier";
import { RestaurantCourierService } from "../../../services/restaurant-courier.service";

@Component({
  selector: 'app-restaurants-courier-list',
  templateUrl: './restaurants-courier-list.component.html',
  styleUrls: ['./restaurants-courier-list.component.css']
})

export class RestaurantsCourierListComponent implements OnInit {

  @Input() restaurantList: RestaurantWithCourier[] = [];
  @Input() user: User;
  @Output() actionDone = new EventEmitter();
  @Input() restaurantCourierService: RestaurantCourierService;
  // @Input() skeletalRestaurants;

  @ViewChild("callModal") callModal: ModalComponent;
  @ViewChild("availabilityModal") availabilityModal: ModalComponent;
  @ViewChild("logEditorModal") logEditorModal: ModalComponent;


  now = new Date()
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

  selectedTimeZone = "All";
  timeZoneList = ["PDT", "MDT", "CDT", "EDT", "HST", "AKDT"].sort();

  selectedCaller = "All";
  callerList = [];

  myColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Time Zone",
      paths: ['timeZone'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Score",
      paths: ['score'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
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
      label: "Checked at",
      paths: ['checkedAt'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Last called by",
      // paths: ['callers[0]'],
      // sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Phone"
    },
    {
      label: "Logs",
    },

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

  filteredRestaurants: RestaurantWithCourier[] = [];


  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges) {
    console.log("Changing");
    console.log(this.restaurantList);
    console.log("Still changing");
    if (this.restaurantList) {
      this.updateCallerList();
      // this.taskNames = ['All', ...Array.from(new Set(this.restaurantList.map(t => t.availability)))];
      // if (this.taskNames.indexOf(this.selectedTaskName) < 0) {
      //   this.selectedTaskName = 'All';
      // }
      this.filter();
    }
  }

  // hasBadScanStatus(task) {
  //   const status = (((task.transfer || {}).statusHistory || [])[0] || {}).status;
  //   return ['Timeout', 'LOCATION REMOVED FROM ACCOUNT', 'no matching restaurant'].some(error => (JSON.stringify(status) || '').indexOf(error) >= 0);
  // }

  // hasGoodScanStatus(task) {
  //   const status = (((task.transfer || {}).statusHistory || [])[0] || {}).status;
  //   return status === null || [KnownError.GMB_WAITING_FOR_APPEAL, KnownError.GMB_UI_NOT_VERIFIABLE, 'SHOULD USE PHONE_CALL TO VERIFY', 'WAIT', 'NO AUTO POPULATION', 'null'].some(error => (JSON.stringify(status) || '').indexOf(error) >= 0);
  // }

  updateCallerList() {
    this.callerList = Array.from(new Set([].concat(this.restaurantList.filter(each => (each.callers && each.callers.length)).map(each => each.callers))));
    console.log("Updating caller list.");
    console.log(this.callerList);
  }

  filter() {
    if (this.selectedAvailability === "All") {
      this.filteredRestaurants = this.restaurantList;
    }
    else {
      this.filteredRestaurants = this.restaurantList.filter(each => each.availability === this.selectedAvailability);
    }
    if (this.selectedTimeZone && this.selectedTimeZone !== "All") {
      this.filteredRestaurants = this.filteredRestaurants.filter(t => t.timeZone === this.selectedTimeZone);
    }
    if (this.selectedCaller && this.selectedCaller !== "All") {
      this.filteredRestaurants = this.filteredRestaurants.filter(t => (t.callers && t.callers.indexOf(this.selectedCaller) >= 0));
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













  // getGMB(id) {
  //   //console.log(this.restaurantList);
  //   if (id) {
  //     console.log(this.skeletalRestaurants.filter(r => r._id === id)[0].web)
  //     return this.skeletalRestaurants.filter(r => r._id === id)[0].web;
  //   }
  // }


  // New call log.
  restaurantInEditing = new RestaurantWithCourier(); //???
  call(restaurant: RestaurantWithCourier) {
    console.log("Calling restaurant:");
    console.log(restaurant);
    this.restaurantInEditing = restaurant;
    // this.restaurantInEditing.callLogNew = new CallLog();
    // this.restaurantInEditing.callLogNew.time = new Date();
    // this.restaurantInEditing.callLogNew.caller = this._global.user.username;
    // this.restaurantInEditing.callLogNew.comments = "";
    console.log(restaurant);
    this.callModal.show();
  }

  editingNewCallLog = false;
  toggleNewCallLog() {
    this.editingNewCallLog = !this.editingNewCallLog;
    if (this.editingNewCallLog) {
      this.restaurantInEditing.callLogNew = new CallLog();
      this.restaurantInEditing.callLogNew.time = new Date();
      this.restaurantInEditing.callLogNew.caller = this._global.user.username;
      this.restaurantInEditing.callLogNew.comments = "";
      // if (this.selectedLead.phones && this.selectedLead.phones.length === 1) {
      //   this.newCallLog.phone = this.selectedLead.phones[0];
      // }
    }
    this.restaurantInEditing.comments = this.restaurantInEditing.callLogNew.comments;
    console.log(this.restaurantInEditing);
  }

  newLogFieldDescriptors = [
    {
      field: "comments", //callLogNew.comments does not work with required???
      label: "Comments",
      required: true, //Why??????????
      disabled: false
    },
    {
      field: "callLogNew.caller", // Debug only.
      label: "User",
      required: false,
      disabled: false
    },
  ]

  formRemove(event) { }

  async newLogSubmit(event) {
    console.log(event.object);
    event.object.callLogNew.comments = event.object.comments;
    if (!event.object.callLogNew.comments) {
      return event.acknowledge("Must input comments");
    }
    if (!event.object.callLogs) {
      event.object.callLogs = [];
    }
    this.callModal.hide();
    this.editingNewCallLog = false;
    event.object.callLogs.unshift(event.object.callLogNew);
    event.object.comments = '';
    this.restaurantCourierService.updateCallers(event.object);
    this.updateCallerList();
    await this.restaurantCourierService.patchOneCallLogsChange(event.object);
  }

  // Change log manually: logEditorModal

  logEditorFieldDescriptors = [
    {
      field: "comments",
      label: "Comments",
      required: false,
      disabled: false
    },
  ]
  logInEditing: number;
  editingLog = false;
  editLog(restaurant: RestaurantWithCourier, logIndex: number) {
    console.log("Editing log.");
    console.log(restaurant);
    this.restaurantInEditing = restaurant;
    this.logInEditing = logIndex;
    // restaurant.callLogNew = restaurant.callLogs[logIndex];
    // restaurant.comments = restaurant.callLogNew.comments;
    restaurant.comments = restaurant.callLogs[logIndex].comments;
    // this.selectedtask = task;
    this.editingLog = true;
    this.logEditorModal.show();
  }

  async logEditorSubmit(event) {
    // event.object.callLogNew.comments = event.object.comments;
    if (!event.object.callLogs) {
      event.object.callLogs = [];
      console.log("Cannot edit log in empty list!");
      this.logEditorModal.hide();
      return;
    }
    console.log(event.object.callLogs[this.logInEditing]);

    this.logEditorModal.hide();
    this.editingLog = false;

    event.object.callLogs[this.logInEditing].comments = event.object.comments;
    event.object.comments = '';
    await this.restaurantCourierService.patchOneCallLogsChange(event.object);
    console.log(event.object);
  }
  // Change availability: availabilityModal

  // availabilityFieldDescriptors = [
  //   {
  //     field: "availabilityNew",
  //     label: "Availibility",
  //     required: false,
  //     inputType: "single-select",
  //     items: [
  //       "signed up",
  //       "available",
  //       "not available",
  //       "unknown"
  //     ].map(status => ({ object: status, text: status, selected: false }))
  //   },
  // ]

  // changeAvail(task) {
  //   console.log("Changing availability.");
  //   console.log(task);
  //   this.restaurantInEditing = task;
  //   // this.selectedtask = task;
  //   this.availabilityModal.show();
  // }

  // async availabilitySubmit(event) {
  //   if (!event.object.callLogs) {
  //     event.object.callLogs = [];
  //   }

  //   event.object.availability = event.object.availabilityNew;
  //   const newLog = {
  //     caller: this._global.user.username,
  //     time: (new Date()).toISOString(),
  //     comments: "availability changed to " + event.object.availabilityNew,
  //   }

  //   event.object.callLogs.unshift(newLog);
  //   // post to database!!!
  //   // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=postmates', [{ old: { _id: event.object._id }, new: event.object }]).toPromise();
  //   await this._api.patch(environment.qmenuApiUrl + 'generic?resource=postmates', [{ old: { _id: event.object._id }, new: { _id: event.object._id, callLogs: event.object.callLogs, availability: event.object.availabilityNew } }]).toPromise();
  //   console.log(event.object);
  //   this.availabilityModal.hide(); // move to first line later???
  // }



  //New start:


  selectAvailability(item) {
    this.filter();
  }
}
