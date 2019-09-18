import { Component, OnInit, ViewChild } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { Log } from "../../../classes/log";
@Component({
  selector: 'app-logs-dashboard',
  templateUrl: './logs-dashboard.component.html',
  styleUrls: ['./logs-dashboard.component.scss']
})
export class LogsDashboardComponent implements OnInit {

  @ViewChild('myLogEditor') set myLogEditor(editor) {
    if (editor) {
      editor.reset();
    }
  }

  @ViewChild('logEditingModal') logEditingModal;

  searchFilter = '';
  unresolvedOnly = false;
  adjustmentOnly = false;
  agent;
  type;

  restaurantLogs = [];
  logsList;
  agentList = [];
  logTypes = [];


  logInEditing = new Log();
  logInEditingOriginal;
  filteredResult=[]

  restaurant = undefined;
  restaurantList = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.populate();
  }

  async populate() {
    try {
      // var date = new Date();
      // date.setDate(date.getDate() - 90);

      // this.restaurantList = await this._api.get(environment.qmenuApiUrl + "generic", {
      //   resource: "restaurant",
      //   query: {
      //     disabled: {
      //       $ne: true
      //     },
      //     "logs": {
      //       "$elemMatch": {
      //         "time": {
      //           "$gt": date
      //         }
      //       }
      //     }
      //   },
      //   projection: {
      //     name: 1,
      //     alias: 1,
      //     logs: { $slice: -5 },
      //     logo: 1,
      //     channels: 1,
      //     "googleAddress.formatted_address": 1
      //   },
      //   limit: 6000
      // }).toPromise();

      //Retrieve all the logs inseat of limit out old logs
      const restaurantBatchSize = 800;
      let restaurantSkip = 0;
  
      while (true) {
        const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant',
        projection: {
          name: 1,
          alias: 1,
          logs: { $slice: -5 },
          logo: 1,
          channels: 1,
          "googleAddress.formatted_address": 1
        },
          skip: restaurantSkip,
          limit: restaurantBatchSize
        }).toPromise();
  
        this.restaurantList.push(...batch);
  
        if (batch.length === 0) {
          break;
        }
        restaurantSkip += restaurantBatchSize;
      }

      // convert log to type of Log
      this.restaurantList.map(r => {
        if (r.logs) {
          r.logs = r.logs.map(log => new Log(log));
        }
      });

      // sort logs
      this.computeFilteredLogs();
    } catch (error) {
      this._global.publishAlert(
        AlertType.Danger,
        "Error pulling restaurants"
      )
    }
  }

  ngOnInit() {
  }

  onCancelCreation() {
    this.logEditingModal.hide();
  }

  onSuccessCreation(data) {
    console.log(data);
    const oldRestaurant = data.restaurant;
    const updatedRestaurant = JSON.parse(JSON.stringify(oldRestaurant));
    updatedRestaurant.logs = updatedRestaurant.logs || [];
    if (!data.log.time) {
      data.log.time = new Date();
    }
    if (!data.log.username) {
      data.log.username = this._global.user.username;
    }

    // check if the original exists
    if (oldRestaurant.logs && oldRestaurant.logs.indexOf(this.logInEditingOriginal) >= 0) {
      const index = oldRestaurant.logs.indexOf(this.logInEditingOriginal);
      updatedRestaurant.logs[index] = new Log(data.log);
    } else {
      updatedRestaurant.logs.push(new Log(data.log));
    }
    this.patch({ _id: oldRestaurant._id }, { _id: oldRestaurant._id, logs: updatedRestaurant.logs }, data.formEvent.acknowledge);

  }

  computeFilteredLogs() {
    this.restaurantLogs = [];
    this.restaurantList.map(r => {
      (r.logs || []).map(log => {
        // apply filter to reduce possible sorting
        const filter = (this.searchFilter || '').toLowerCase();
        const b1 = !this.unresolvedOnly || !log.resolved;
        const b2 = b1 && (!filter || (r.name.toLowerCase().startsWith(filter)
          || (log.callerPhone || '').startsWith(filter)
          || (r.channels && r.channels.some(c => c.value.startsWith(filter)))));
        if (b1 && b2) {
          this.restaurantLogs.push({
            restaurant: r,
            log: log
          });
        }
      });
    });

    const now = new Date();
    // Hide outdated logs! (more than 60 days and resolved)
    //const visibleMs = 7 * 24 * 3600 * 1000;
    //this.filteredRestaurantLogs = this.filteredRestaurantLogs.filter(rl => !rl.log.resolved || now.valueOf() - (rl.log.time || new Date(0)).valueOf() < visibleMs);

    // sort DESC by time!
    // one without time
    this.restaurantLogs.sort((rl1, rl2) => (rl2.log.time || new Date(0)).valueOf() - (rl1.log.time || new Date(0)).valueOf());
    this.logsList = this.restaurantLogs;
    this.agentList = this.restaurantLogs.map(l => l.log.username);
    this.logTypes = this.restaurantLogs.map(l => l.log.type);
    this.agentList = Array.from(new Set(this.agentList)).sort().filter(e => e != null);
    this.logTypes = Array.from(new Set(this.logTypes)).sort().filter(e => e != null);

    this.filteredResult = this.restaurantLogs.slice(0);
  }

  unresolvedOnlyChange() {
    this.computeFilteredLogs();
  }

  debounce(event) {
    this.computeFilteredLogs();
  }

  filterBySelection() {
    this.filteredResult = this.restaurantLogs.slice(0);
    if (this.agent && this.agent !== "All") {
      this.filteredResult = this.filteredResult.filter(l => l.log.username === this.agent);
    }
    if (this.adjustmentOnly) {
      this.filteredResult = this.filteredResult.filter(l => l.log.adjustmentAmount);
    }
    if(this.unresolvedOnly){
      this.filteredResult = this.filteredResult.filter(l => !l.log.resolved);
    }
    if (this.type && this.type !== "All") {
      this.filteredResult = this.filteredResult.filter(l => l.log.type === this.type);
    }
    

  }


  getAddress(restaurant) {
    if (restaurant.googleAddress && restaurant.googleAddress.formatted_address) {
      return restaurant.googleAddress.formatted_address.replace(', USA', '');
    }
    return '';
  }

  createNew() {

    this.logInEditing = new Log();
    this.logInEditingOriginal = undefined;
    this.restaurant = null;
    this.logEditingModal.title = "Add New Log";
    this.logEditingModal.show();
  }

  edit(restaurantLog) {
    // let make a copy and preserve the original
    this.logInEditing = new Log(restaurantLog.log);
    // fix: sometimes log time is missing
    if (!this.logInEditing.time) {
      this.logInEditing.time = new Date();
    }
    this.logInEditingOriginal = restaurantLog.log;

    this.restaurant = restaurantLog.restaurant;
    this.logEditingModal.title = "Edit Log";
    this.logEditingModal.show();
  }

  remove(event) {

    if (this.restaurant && this.restaurant.logs && this.restaurant.logs.indexOf(this.logInEditingOriginal) >= 0) {
      const newLogs = this.restaurant.logs.filter(log => log !== this.logInEditingOriginal);

      const updatedRestaurant = JSON.parse(JSON.stringify(this.restaurant));
      updatedRestaurant.logs = newLogs;
      this.patch({ _id: this.restaurant._id }, { _id: this.restaurant._id, logs: newLogs }, event.formEvent.acknowledge);

    } else {
      event.formEvent.acknowledge('Missing restaurant, or restaurant logs');
    }
  }

  patch(oldRestaurant, updatedRestaurant, acknowledge) {
    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: oldRestaurant, new: updatedRestaurant }]).subscribe(
      result => {
        // let's update original, assuming everything successful
        this.restaurantList.map(r => {
          if (r._id === oldRestaurant._id) {
            r.logs = updatedRestaurant.logs;
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

}
