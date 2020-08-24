import { Component, OnInit, Input } from '@angular/core';
import { Restaurant, Hour } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { TimezoneService } from "../../../services/timezone.service";
import { AlertType } from "../../../classes/alert-type";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Helper } from '../../../classes/helper';
import { from } from 'rxjs';

@Component({
  selector: 'app-restaurant-closed-hours',
  templateUrl: './restaurant-closed-hours.component.html',
  styleUrls: ['./restaurant-closed-hours.component.css']
})
export class RestaurantClosedHoursComponent implements OnInit {

  @Input() restaurant: Restaurant;
  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService, public _timezone: TimezoneService) {
    // this.initHourInEditing();
  }

  hourInEditing;
  editing: boolean = false;

  ngOnInit() {
  }

  initHourInEditing() {
    this.hourInEditing = new Hour();
    this.hourInEditing.occurence = 'ONE-TIME';
    const d1 = new Date();
    d1.setHours(d1.getHours() + (new Date(new Date().toLocaleString('en-US', { timeZone: this.restaurant.googleAddress.timezone })).valueOf() 
      - new Date(new Date().toLocaleString('en-US')).valueOf()) / 3600000);
    d1.setHours(0, 0, 0, 0);
    this.hourInEditing.fromTime = d1;
    this.hourInEditing.toTime = new Date(d1.valueOf());
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.initHourInEditing();
  }

  addClosedHour() {
    let newClosedHours = JSON.parse(JSON.stringify(this.restaurant.closedHours || []))
    const hourClone = new Hour(this.hourInEditing);

    hourClone.fromTime = this._timezone.transformToTargetTime(hourClone.fromTime, this.restaurant.googleAddress.timezone);
    hourClone.toTime = this._timezone.transformToTargetTime(hourClone.toTime, this.restaurant.googleAddress.timezone);

    newClosedHours.push(hourClone);
    this.toggleEditing();

    this.patch(newClosedHours, this.restaurant.closedHours);

  }

  patch(newClosedHours, oldClosedHours, ) {
    if (Helper.areObjectsEqual(newClosedHours, oldClosedHours)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...
      this._prunedPatch
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            closedHours: oldClosedHours
          }, new: {
            _id: this.restaurant['_id'],
            closedHours: newClosedHours
          }
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant.closedHours = newClosedHours.map(h => new Hour(h));
            this._global.publishAlert(
              AlertType.Success,
              "Updated successfully"
            );

          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Error updating to DB");
          }
        );
    }
  }


  remove(hour) {
    let newClosedHours = JSON.parse(JSON.stringify(this.restaurant.closedHours || []))
    newClosedHours = this.restaurant.closedHours.filter(h => h !== hour);
    this.patch(newClosedHours, this.restaurant.closedHours);
  }

  getError() {
    if (!this.hourInEditing.fromTime) {
      return 'Please select From time';
    }
    if (!this.hourInEditing.toTime) {
      return 'Please select To time';
    }
    if (this.hourInEditing.fromTime >= this.hourInEditing.toTime) {
      return 'To time must be larger than From time';
    }
  }
}