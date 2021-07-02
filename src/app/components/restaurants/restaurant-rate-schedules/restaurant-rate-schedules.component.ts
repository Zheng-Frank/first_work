import { Component, OnInit, Input } from '@angular/core';
import {FeeSchedule, Restaurant} from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { AlertType } from "../../../classes/alert-type";

@Component({
  selector: 'app-restaurant-rate-schedules',
  templateUrl: './restaurant-rate-schedules.component.html',
  styleUrls: ['./restaurant-rate-schedules.component.css']
})
export class RestaurantRateSchedulesComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @Input() users = [];
  editing = false;
  rateSchedulesInEditing = [];

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
  }

  converting = false;
  async convertToFeeSchedules() {
    this.converting = true;
    try {
      const results = await this._api.post(environment.appApiUrl + "lambdas/data", {
        name: "migrate-fee-schedules",
        payload: {
          restaurantIds: [this.restaurant._id],
        }
      }).toPromise();
      const [rtFeeSchedules] = results;
      console.log("converted", rtFeeSchedules);
      this.restaurant.feeSchedules = rtFeeSchedules.feeSchedules;
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, "Failed!");
    }
    this.converting = false;
  }

  dateChanged(date) {
  }

  isCsrOrMarkter() {
    const roles = this._global.user.roles || [];
    // const roles = ['CSR', 'MARKTER'];
    // todo: how to judge csr
    return roles.includes('CSR') && !roles.includes('ADMIN');
  }

  toggleEditing() {
    // todo: remove last column may have issue when edit
    this.editing = !this.editing;
    this.rateSchedulesInEditing = JSON.parse(JSON.stringify(this.restaurant.rateSchedules || []));
    // put empty settings to make it 4 (hardcoded max)
    for (let i = this.rateSchedulesInEditing.length; i < 5; i++) {
      this.rateSchedulesInEditing.push({});
    }
  }

  isDisabled(user) {
    return !this.users.some(u => u.username === user && !u.disabled);
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

    const enabledOrderTypes = (this.restaurant.serviceSettings || []).filter(ss => (ss.paymentMethods || []).length > 0).map(ss => ss.name.toUpperCase());
    // validation: making sure all service types are covered!
    const uncoveredOrderTypes = enabledOrderTypes.filter(ot => !newR.rateSchedules.some(rs => rs.orderType === ot) && !newR.rateSchedules.some(rs => !rs.orderType || rs.orderType === 'ALL'));
    if (uncoveredOrderTypes.length > 0) {
      alert('FAILED: no rate schedules for order types ' + uncoveredOrderTypes.join(', '));
      return;
    }
    this._prunedPatch
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
