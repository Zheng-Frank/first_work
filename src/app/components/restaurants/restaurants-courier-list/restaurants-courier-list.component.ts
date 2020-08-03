import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { GlobalService } from "../../../services/global.service";
import { User } from '../../../classes/user';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { CallLog } from "../../../classes/call-log";
import { RestaurantWithCourier } from "../../../classes/restaurant-courier";
import { RestaurantCourierService } from "../../../classes/restaurant-courier-service";

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
      label: "Scaned at",
      paths: ['checkedAt'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Last called by",
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

  restaurantInEditing = new RestaurantWithCourier();
  call(restaurant: RestaurantWithCourier) {
    this.restaurantInEditing = restaurant;
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
  }

  newLogFieldDescriptors = [
    {
      field: "comments", //callLogNew.comments does not work with required: true
      label: "Comments",
      required: true,
      disabled: false
    }
  ]

  async newLogSubmit(event) {
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
    }
  ]

  logInEditing: number;
  editingLog = false;

  editLog(restaurant: RestaurantWithCourier, logIndex: number) {
    this.restaurantInEditing = restaurant;
    this.logInEditing = logIndex;
    if (this._global.user.username !== restaurant.callLogs[logIndex].caller){
      return;
    }
    restaurant.comments = restaurant.callLogs[logIndex].comments;

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

    this.logEditorModal.hide();
    this.editingLog = false;

    event.object.callLogs[this.logInEditing].comments = event.object.comments;
    event.object.comments = '';

    await this.restaurantCourierService.updateProperties([event.object], ["callLogs"]);
  }

  async removeLogNotAllowed(event){
    this.logEditorModal.hide();
    this.editingLog = false;
  }
}
