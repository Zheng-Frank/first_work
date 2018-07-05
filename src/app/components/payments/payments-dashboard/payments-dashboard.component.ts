import { Component, OnInit, ViewChild } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Lead } from "../../../classes/lead";
import { AlertType } from "../../../classes/alert-type";
import { GmbInfo } from "../../../classes/gmb-info";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { CallLog } from "../../../classes/call-log";
import { User } from "../../../classes/user";
import { Helper } from "../../../classes/helper";
import { Log } from "../../../classes/log";


@Component({
  selector: 'app-payments-dashboard',
  templateUrl: './payments-dashboard.component.html',
  styleUrls: ['./payments-dashboard.component.scss']
})
export class PaymentsDashboardComponent implements OnInit {

  @ViewChild('myLogEditor') set myLogEditor(editor) {
    if (editor) {
      editor.reset();
    }
  }

  @ViewChild('logEditingModal') logEditingModal;

  searchFilter = '';
  unresolvedOnly = false;

  filteredRestaurantLogs = [];

  logInEditing = new Log();
  logInEditingOriginal;

  restaurant = undefined;
  restaurantList = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.logInEditing.time = new Date();
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        disabled: {
          $ne: true
        }
      },
      projection: {
        name: 1,
        alias: 1,
        logs: 1,
        logo: 1,
        "phones.phoneNumber": 1,
        "channels.value": 1,
        "googleAddress.formatted_address": 1
      },
      limit: 6000
    }).subscribe(
      restaurants => {
        this.restaurantList = restaurants;
        // convert log to type of Log
        this.restaurantList.map(r => {
          if (r.logs) {
            r.logs = r.logs.map(log => new Log(log));
          }
        });
        this.computeFilteredLogs();
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling restaurants"
        )
      });

  }

  ngOnInit() {
  }

  onCancelCreation() {
    this.logEditingModal.hide();
  }

  onSuccessCreation(data) {
    console.log(data);
    const oldRestaurant = this.restaurantList.filter(r => r._id === data.restaurant._id)[0];
    const updatedRestaurant = JSON.parse(JSON.stringify(oldRestaurant));
    updatedRestaurant.logs = updatedRestaurant.logs || [];
    if (!data.log.time) {
      data.log.time = new Date();
    }

    // check if the original exists
    if (oldRestaurant.logs && oldRestaurant.logs.indexOf(this.logInEditingOriginal) >= 0) {
      const index = oldRestaurant.logs.indexOf(this.logInEditingOriginal);
      updatedRestaurant.logs[index] = new Log(data.log);
    } else {
      updatedRestaurant.logs.push(new Log(data.log));
    }

    this.patch(oldRestaurant, updatedRestaurant, data.formEvent.acknowledge);

  }

  computeFilteredLogs() {
    this.filteredRestaurantLogs = [];
    this.restaurantList.map(r => {
      (r.logs || []).map(log => {
        // apply filter to reduce possible sorting
        const filter = (this.searchFilter || '').toLowerCase();
        const b1 = !this.unresolvedOnly || !log.resolved;
        const b2 = b1 && (!filter || (r.name.toLowerCase().startsWith(filter)
          || (log.callerPhone || '').startsWith(filter)
          || (r.phones && r.phones.some(p => p.phoneNumber.startsWith(filter)))
          || (r.channels && r.channels.some(c => c.value.startsWith(filter)))));
        if (b1 && b2) {
          this.filteredRestaurantLogs.push({
            restaurant: r,
            log: log
          });
        }

      });
    });

    // sort DESC by time!
    this.filteredRestaurantLogs.sort((rl1, rl2) => rl2.log.time.valueOf() - rl1.log.time.valueOf());

  }

  unresolvedOnlyChange() {
    this.computeFilteredLogs();
  }

  debounce(event) {
    this.computeFilteredLogs();
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
    console.log(restaurantLog);
    // let make a copy and preserve the original
    this.logInEditing = new Log(restaurantLog.log);
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
      this.patch(this.restaurant, updatedRestaurant, event.formEvent.acknowledge);

    } else {
      event.formEvent.acknowledge('Missing restaurant, or restaurant logs');
    }
  }

  patch(oldRestaurant, updatedRestaurant, acknowledge) {
    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: oldRestaurant, new: updatedRestaurant }]).subscribe(
      result => {
        // let's update original, assuming everything successful
        oldRestaurant.logs = updatedRestaurant.logs;
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
