import { Component, OnInit, Input } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-restaurant-rate-schedules',
  templateUrl: './restaurant-rate-schedules.component.html',
  styleUrls: ['./restaurant-rate-schedules.component.css']
})
export class RestaurantRateSchedulesComponent implements OnInit {

  @Input() restaurant: Restaurant;
  editing = false;
  rateSchedulesInEditing = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  dateChanged(date) {
    console.log(date);
  }

  toggleEditing() {
    this.editing = !this.editing;
    this.rateSchedulesInEditing = JSON.parse(JSON.stringify(this.restaurant.rateSchedules || []));
    // put empty settings to make it 4 (hardcoded max)
    for (let i = this.rateSchedulesInEditing.length; i < 5; i++) {
      this.rateSchedulesInEditing.push({});
    }
  }

  update() {
    this.rateSchedulesInEditing.map(rs => {
      rs.rate = (+rs.rate) ? +rs.rate : 0;
      rs.fixed = (+rs.fixed) ? +rs.fixed : 0;
      rs.commission = (+rs.commission) ? +rs.commission : 0;
      rs.agent = (rs.agent || '').trim().toLowerCase();
    });

    const oldR = { _id: this.restaurant.id || this.restaurant['_id'] };
    const newR: any = { _id: this.restaurant.id || this.restaurant['_id'] };
    newR.rateSchedules = this.rateSchedulesInEditing.filter(rs => rs.date);

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: oldR,
          new: newR
        }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );
          this.restaurant.rateSchedules = newR.rateSchedules;
          this.editing = false;
          this.rateSchedulesInEditing = [];
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
  }

}
