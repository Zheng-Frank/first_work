import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Log } from "../../../../classes/log";
import { ApiService } from "../../../../services/api.service";
import { GlobalService } from "../../../../services/global.service";
import { AlertType } from "../../../../classes/alert-type";
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-add-new-log',
  templateUrl: './add-new-log.component.html',
  styleUrls: ['./add-new-log.component.css']
})
export class AddNewLogComponent implements OnInit {
  @Input() id: string;

  editingNewCallLog = false
  restaurant = undefined;
  restaurantList = [];
  logInEditing = new Log();
  logInEditingOriginal;
  restaurantLogs = [];
  agentList = [];
  logTypes = [];
  searchFilter = '';
  unresolvedOnly = false;
  adjustmentOnly = false;
  last7DaysOnly = true;
  agent;
  type;
  filteredResult = []

  @ViewChild('myLogEditor') set myLogEditor(editor) {
    if (editor) {
      editor.reset();
    }
  }

  @ViewChild('logEditingModal') logEditingModal;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    console.log("THIS IS THE INPUT VALUE ", this.id)
  }



  async createNew() {
    console.log("THIS IS THE ID ", this.id)
    let res = await this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: { _id: { $oid: this.id } },

        limit: 1000,
      })
      .toPromise();
    console.log("THIS IS THE RES ", res)
    this.logInEditing = new Log();
    this.logInEditingOriginal = undefined;
    this.restaurant = new Restaurant(res);
    console.log("THIS RESTAURANT ", this.restaurant)
    this.logEditingModal.title = "Add New Log";
    this.logEditingModal.show();
  }
  async onSuccessCreation(data) {
    console.log("ON SUCCESS CREATION DATA", data.restaurant['0'])
    if (!data.log.time) {
      data.log.time = new Date();
    }
    if (!data.log.username) {
      data.log.username = this._global.user.username;
    }
    const log = JSON.parse(JSON.stringify(data.log)); // make it same as what' in logs array

    // need to get full logs!
    console.log("ID RES ", data.restaurant._id)
    const rtWithFullLogs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        _id: { $oid: this.id }
      },
      projection: {
        logs: 1
      },
      limit: 1
    }).toPromise();

    console.log("RT WITH FULL LOGS ", rtWithFullLogs)
    const logs = rtWithFullLogs[0].logs || [];
    console.log("LOGS ", logs)
    // check if the original exists, by testing time
    const myIndex = logs.findIndex(e => new Date(e.time).valueOf() === new Date(log.time).valueOf());
    if (myIndex >= 0) {
      logs[myIndex] = log;
    } else {
      console.log("WE PUSHED THE LOGS ", logs)
      logs.push(log);
    }

    this.patch({ _id: data.restaurant[0]._id }, { _id: data.restaurant[0]._id, logs: logs }, data.formEvent.acknowledge);

  }

  async patch(oldRestaurant, updatedRestaurant, acknowledge) {
    console.log("OLD RESTAUARANT ", oldRestaurant)
    console.log("UPDATED RESTAUANT ", updatedRestaurant)
    console.log("ENTERED PATCH ")
    let res = await this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: { _id: { $oid: this.id } },

        limit: 1000,
      })
      .toPromise();
    console.log("THIS IS THE RES ", res)
    this.restaurantList[0] = new Restaurant(res)
    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: oldRestaurant, new: updatedRestaurant }]).subscribe(
      result => {
        console.log("ENTERED SUBSCRIPTION ")
        // let's update original, assuming everything successful
        this.restaurantList.map(r => {
          console.log("RESTAURANT LIST MAPPING ", r)
          if (r[0]._id === oldRestaurant._id) {
            console.log("FOUND A MATCH")
            r.logs = updatedRestaurant.logs;
            console.log('update logs', r);
          }
        });
        this._global.publishAlert(
          AlertType.Success,
          'Successfully created new log.'
        );

        acknowledge(null);
        this.logEditingModal.hide();
        this.computeFilteredLogs();
      },
      error => {
        this._global.publishAlert(AlertType.Danger, "Error adding a log");
        acknowledge("API Error");
      }
    );
  }

  computeFilteredLogs() {
    this.restaurantLogs = [];
    this.restaurantList.map(r => {
      if (r.name === 'Demo') {
        console.log(r.logs);
      }
      (r.logs || []).map(log => {
        // apply filter to reduce possible sorting
        const filter = (this.searchFilter || '').toLowerCase();
        const b1 = !this.unresolvedOnly || !log.resolved;
        const b2 = b1 && (!filter || (r.name.toLowerCase().startsWith(filter)
          || (log.callerPhone || '').startsWith(filter)
          || (r.channels && r.channels.some(c => c.value.startsWith(filter)))));

        const date = new Date();
        date.setDate(date.getDate() - (this.last7DaysOnly ? 7 : 70000));

        const b3 = new Date(log.time).valueOf() > date.valueOf();
        if (b1 && b2 && b3) {
          this.restaurantLogs.push({
            restaurant: r,
            log: log
          });
        }
      });
    });

    // const now = new Date();
    // Hide outdated logs! (more than 60 days and resolved)
    //const visibleMs = 7 * 24 * 3600 * 1000;
    //this.filteredRestaurantLogs = this.filteredRestaurantLogs.filter(rl => !rl.log.resolved || now.valueOf() - (rl.log.time || new Date(0)).valueOf() < visibleMs);

    // sort DESC by time!
    // one without time
    this.restaurantLogs.sort((rl1, rl2) => new Date(rl2.log.time || 0).valueOf() - new Date(rl1.log.time || 0).valueOf());
    this.agentList = this.restaurantLogs.map(l => l.log.username);
    this.logTypes = this.restaurantLogs.map(l => l.log.type);
    this.agentList = Array.from(new Set(this.agentList)).sort().filter(e => e != null);
    this.logTypes = Array.from(new Set(this.logTypes)).sort().filter(e => e != null);

    this.filteredResult = this.restaurantLogs.slice(0);
  }

  async remove(event) {

    if (this.restaurant && this.restaurant.logs && this.restaurant.logs.indexOf(this.logInEditingOriginal) >= 0) {

      // need to get full logs!
      const rtWithFullLogs = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          _id: { $oid: this.restaurant._id }
        },
        projection: {
          logs: 1
        },
        limit: 1
      }).toPromise();

      const newLogs = rtWithFullLogs[0].logs.filter(log => new Date(log.time).valueOf() !== new Date(this.logInEditingOriginal.time).valueOf());
      this.patch({ _id: this.restaurant._id }, { _id: this.restaurant._id, logs: newLogs }, event.formEvent.acknowledge);

    } else {
      event.formEvent.acknowledge('Missing restaurant, or restaurant logs');
    }
  }
  onCancelCreation() {
    this.logEditingModal.hide();
  }

  select(restaurant) {
    this.restaurant = new Restaurant(restaurant);
  }
  // toggleNewCallLog() {
  //   this.editingNewCallLog = !this.editingNewCallLog;
  //   if (this.editingNewCallLog) {
  //     this.newCallLog = new CallLog();
  //     this.newCallLog.time = new Date();
  //     this.newCallLog.caller = this._global.user.username;
  //     if (this.selectedLead.phones && this.selectedLead.phones.length === 1) {
  //       this.newCallLog.phone = this.selectedLead.phones[0];
  //     }
  //   }
  // }

}
