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
  selector: 'app-csr-dashboard',
  templateUrl: './csr-dashboard.component.html',
  styleUrls: ['./csr-dashboard.component.scss']
})
export class CsrDashboardComponent implements OnInit {

  @ViewChild('myLogEditor') set myLogEditor(editor) {
    if (editor) {
      editor.reset();
    }
  }
  addingNewLog = false;
  searchFilter = '';
  unresolvedOnly = false;

  filteredRestaurantLogs = [];

  logInEditing = new Log();
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

  toggleNew() {
    this.addingNewLog = !this.addingNewLog;
    this.logInEditing = new Log();
    this.restaurant = undefined;
  }

  onCancelCreation() {
    this.addingNewLog = false;
  }

  onSuccessCreation(data) {
    console.log(data);
    const oldRestaurant = this.restaurantList.filter(r => r._id === data.restaurant._id)[0];
    const updatedRestaurant = JSON.parse(JSON.stringify(oldRestaurant));
    updatedRestaurant.logs = updatedRestaurant.logs || [];
    data.log.time = new Date();
    updatedRestaurant.logs.push(new Log(data.log));

    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{ old: oldRestaurant, new: updatedRestaurant }]).subscribe(
      result => {
        // let's update original, assuming everything successful
        oldRestaurant.logs = oldRestaurant.logs || [];
        oldRestaurant.logs.push(new Log(data.log));
        this._global.publishAlert(
          AlertType.Success,
          'Successfully created new log.'
        );

        data.formEvent.acknowledge(null);
        this.addingNewLog = false;
        this.computeFilteredLogs();
      },
      error => {
        this._global.publishAlert(AlertType.Danger, "Error adding a log");
        data.formEvent.acknowledge("API Error");
      }
    );
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
            log: new Log(log)
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

  edit(restaurantLog) {
    console.log(restaurantLog)
  }

}
