import { Component, OnInit, Input } from '@angular/core';
import { Restaurant, Hour } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { TimezoneService } from "../../../services/timezone.service";
import { AlertType } from "../../../classes/alert-type";
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { Helper } from '../../../classes/helper';

@Component({
  selector: 'app-restaurant-delivery-closed-hours',
  templateUrl: './restaurant-delivery-closed-hours.component.html',
  styleUrls: ['./restaurant-delivery-closed-hours.component.css']
})
export class RestaurantDeliveryClosedHoursComponent implements OnInit {

  @Input() restaurant: Restaurant;
  constructor(private _api: ApiService, private _global: GlobalService, public _timezone: TimezoneService) {
    // this.initHourInEditing();
  }
  showExpired = false;
  now = new Date(); // to tell if a delivery hours is expired
  hourInEditing;
  editing: boolean = false;

  ngOnInit() {
  }

  isDeliveryClosedHoursExpired(closedHour) {
    return closedHour.toTime && this.now > closedHour.toTime;
  }

  getDeliveryExpiredClosedHours() {
    return this.restaurant.deliveryClosedHours.filter(ch => this.isDeliveryClosedHoursExpired(ch));
  }

  initHourInEditing() {
    const d1 = new Date();
    d1.setHours(d1.getHours() + (new Date(new Date().toLocaleString('en-US', { timeZone: this.restaurant.googleAddress.timezone })).valueOf()
      - new Date(new Date().toLocaleString('en-US')).valueOf()) / 3600000);
    d1.setHours(0, 0, 0, 0);
    this.hourInEditing = new Hour({
      occurence: 'ONE-TIME',
      fromTime: d1,
      toTime: new Date(d1.valueOf())
    });
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.initHourInEditing();
  }

  addClosedHour() {
    let newDeliveryClosedHours = JSON.parse(JSON.stringify(this.restaurant.deliveryClosedHours || []))
    const hourClone = new Hour(this.hourInEditing);

    // correct offsetToEST, hour-picker is only for your LOCAL browser. We need to translate it to restaurant's hour settings
    hourClone.fromTime = this._timezone.transformToTargetTime(hourClone.fromTime, this.restaurant.googleAddress.timezone);
    hourClone.toTime = this._timezone.transformToTargetTime(hourClone.toTime, this.restaurant.googleAddress.timezone);

    newDeliveryClosedHours.push(hourClone);
    this.toggleEditing();

    this.patch(newDeliveryClosedHours, this.restaurant.deliveryClosedHours);

  }

  patch(newDeliveryClosedHours, oldDeliveryClosedHours,) {
    if (Helper.areObjectsEqual(newDeliveryClosedHours, oldDeliveryClosedHours)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...
      this._api
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            deliveryClosedHours: oldDeliveryClosedHours
          }, new: {
            _id: this.restaurant['_id'],
            deliveryClosedHours: newDeliveryClosedHours
          }
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant.deliveryClosedHours = newDeliveryClosedHours.map(h => new Hour(h));
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
    let newDeliveryClosedHours = JSON.parse(JSON.stringify(this.restaurant.deliveryClosedHours || []))
    newDeliveryClosedHours = this.restaurant.deliveryClosedHours.filter(h => h !== hour);
    this.patch(newDeliveryClosedHours, this.restaurant.deliveryClosedHours);
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