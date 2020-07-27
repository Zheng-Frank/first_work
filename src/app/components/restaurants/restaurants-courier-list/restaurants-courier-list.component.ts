import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { GlobalService } from "../../../services/global.service";
import { User } from '../../../classes/user';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { CallLog } from "../../../classes/call-log";
import { RestaurantWithCourier } from "../../../classes/restaurant-courier";
import { RestaurantCourierService } from "../../../services/restaurant-courier.service";

@Component({
  selector: 'app-restaurants-courier-list',
  templateUrl: './restaurants-courier-list.component.html',
  styleUrls: ['./restaurants-courier-list.component.css']
})

export class RestaurantsCourierListComponent implements OnInit {

  @Input() user: User;
  @Input() restaurantList: RestaurantWithCourier[] = [];
  @Input() restaurantCourierService: RestaurantCourierService;
  @Output() actionDone = new EventEmitter();

  @ViewChild("callModal") callModal: ModalComponent;
  @ViewChild("availabilityModal") availabilityModal: ModalComponent;
  @ViewChild("logEditorModal") logEditorModal: ModalComponent;

  now = new Date()

  pagination = true;

  filteredRestaurants: RestaurantWithCourier[] = [];

  selectedAvailability = "All";
  availabilityList = ["All", "signed up", "available", "not available", "unknown"];

  selectedTimeZone = "All";
  timeZoneList = ["PDT", "MDT", "CDT", "EDT", "HST", "AKDT"].sort();

  selectedCaller = "All";
  callerList = [];

  restaurantsColumnDescriptors = [
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
  ];

  constructor(private _global: GlobalService) { }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges) {
    console.log("Changing");
    // console.log(this.restaurantList);
    this.now = new Date();
    if (this.restaurantList) {
      this.updateCallerList();
      this.filter();
    }
  }

  updateCallerList() {
    this.callerList = Array.from(new Set([].concat(...this.restaurantList.filter(
      each => (each.callers && each.callers.length)
    ).map(
      each => each.callers
    )))).sort();
    console.log("Updating caller list.");
    console.log(this.callerList);
  }

  filter() {
    if (this.selectedAvailability === "All") {
      this.filteredRestaurants = this.restaurantList;
    }
    else if (this.selectedAvailability === "unknown") {
      this.filteredRestaurants = this.restaurantList.filter(each => !(["signed up", "available", "not available"].includes(each.availability)));
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
  }

  selectAvailability(item) {
    this.filter();
  }

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
    // console.log(restaurant);
    this.callModal.show();
  }

  editingNewCallLog = false;
  toggleNewCallLog() {
    this.editingNewCallLog = !this.editingNewCallLog;
    if (this.editingNewCallLog) {
      this.restaurantInEditing.callLogNew = new CallLog({
        caller: this._global.user.username,
        time: new Date(),
        comments: ""
      });
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
    // console.log(event.object);
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

    this.restaurantCourierService.updateMostRecentCaller(event.object);
    this.updateCallerList();

    await this.restaurantCourierService.updateProperties([event.object], ["callLogs", "callers"]);
  }

  removeNewLog(event){
    this.callModal.hide();
    this.editingNewCallLog = false;
    event.object.comments = '';
  }

  // Change log manually: logEditorModal

  logEditorFieldDescriptors = [
    {
      field: "comments",
      label: "Comments",
      required: true,
      disabled: false
    },
    {
      field: "caller", // Debug only.
      label: "User",
      required: false,
      disabled: false
    },
  ]

  logInEditing: number;
  editingLog = false;

  editLog(restaurant: RestaurantWithCourier, logIndex: number) {
    // console.log("Editing log.");
    // console.log(restaurant);
    this.restaurantInEditing = restaurant;
    this.logInEditing = logIndex;
    // restaurant.callLogNew = restaurant.callLogs[logIndex];
    // restaurant.comments = restaurant.callLogNew.comments;
    restaurant.comments = restaurant.callLogs[logIndex].comments;
    // restaurant.caller = restaurant.callLogs[logIndex].caller; // Debug only.

    this.editingLog = true;
    this.logEditorModal.show();
  }

  async logEditorSubmit(event) {
    if (!event.object.callLogs) {
      event.object.callLogs = [];
      console.log("Cannot edit log in empty list!");
      this.logEditorModal.hide();
      return;
    }
    // console.log(event.object.callLogs[this.logInEditing]);

    this.logEditorModal.hide();
    this.editingLog = false;

    // event.object.callLogNew.comments = event.object.comments;
    event.object.callLogs[this.logInEditing].comments = event.object.comments;
    event.object.callLogs[this.logInEditing].caller = event.object.caller;  // Debug only.
    event.object.comments = '';

    this.restaurantCourierService.updateMostRecentCaller(event.object);
    this.updateCallerList();

    await this.restaurantCourierService.updateProperties([event.object], ["callLogs", "callers"]);
  }

  async removeLog(event){
    // console.log(event);
    this.logEditorModal.hide();
    this.editingLog = false;

    event.object.callLogs.splice(this.logInEditing, 1);
    this.restaurantCourierService.updateCallers(event.object);
    this.updateCallerList();

    await this.restaurantCourierService.updateProperties([event.object], ["callLogs", "callers"]);
  }

  // Change availability: availabilityModal

  availabilityFieldDescriptors = [
    {
      field: "availability",
      label: "Availibility",
      required: true,
      inputType: "single-select",
      items: [
        "signed up",
        "available",
        "not available",
        "unknown"
      ].map(status => ({ object: status, text: status, selected: false }))
    },
  ]

  editingAvailability = false;
  editAvailability(restaurant: RestaurantWithCourier) {
    // console.log("Changing availability.");
    // console.log(restaurant);
    this.restaurantInEditing = restaurant;
    
    this.editingAvailability = true;
    this.availabilityModal.show();
  }

  async availabilitySubmit(event) {
    if (!event.object.callLogs) {
      event.object.callLogs = [];
    }

    this.availabilityModal.hide();
    this.editingAvailability = false;

    // event.object.availability = event.object.availabilityNew;
    event.object.callLogNew = new CallLog({
      caller: this._global.user.username,
      time: new Date(),
      comments: "availability changed to " + event.object.availability,
    })

    event.object.callLogs.unshift(event.object.callLogNew);

    this.restaurantCourierService.updateMostRecentCaller(event.object);
    this.updateCallerList();

    this.restaurantCourierService.updateProperties([event.object], ["availability", "callLogs", "callers"]);
    // console.log(event.object);
  }

  removeAvailabilityNotValid(event){
    this.availabilityModal.hide();
    this.editingAvailability = false;
  }
}
