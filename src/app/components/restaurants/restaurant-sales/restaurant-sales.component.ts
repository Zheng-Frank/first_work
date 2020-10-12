import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { PrunedPatchService } from "../../../services/prunedPatch.service";
import { AlertType } from "../../../classes/alert-type";
import { ModalComponent, FormBuilderComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { FormSubmit } from '@qmenu/ui/classes';
import { TimezoneHelper } from 'src/app/classes/timezone-helper';

@Component({
  selector: 'app-restaurant-sales',
  templateUrl: './restaurant-sales.component.html',
  styleUrls: ['./restaurant-sales.component.css']
})
export class RestaurantSalesComponent implements OnInit {
  @ViewChild('modalRateSchedule') modalRateSchedule: ModalComponent;

  @Input() restaurant: Restaurant;
  @Input() users = [];

  rateScheduleInEditing: any = {};


  fieldDescriptors = [
    {
      field: "date",
      label: "Date (起始日期)",
      required: true,
      inputType: "date"
    },
    {
      field: "agent",
      label: "Agent Name",
      required: true,
      inputType: "text",
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
  }

  dateChanged(date) {
  }

  edit(rateSchedule?) {
    if (rateSchedule) {
      // insert an id if it didn't have one
      rateSchedule.id = rateSchedule.id || new Date().valueOf().toString();
      this.rateScheduleInEditing = JSON.parse(JSON.stringify(rateSchedule));
    } else {
      this.rateScheduleInEditing = {};
    }
    this.modalRateSchedule.show();
  }

  isDisabled(user) {
    return !this.users.some(u => u.username === user && !u.disabled);
  }


  async submit(event) {
    this.modalRateSchedule.hide();
    const myRs = JSON.parse(JSON.stringify(this.rateScheduleInEditing));

    // this rs can be either new or old (same agent, replacing)
    const newRateSchedules = JSON.parse(JSON.stringify(this.restaurant.rateSchedules || []));
    let foundAndReplaced = false;
    newRateSchedules.map(rs => {
      if (rs.agent === myRs.agent) {
        rs.date = myRs.date;
        foundAndReplaced = true;
      }
    });
    if (!foundAndReplaced) {
      newRateSchedules.push(myRs);
    }
    await this.saveNewRateSchedulesToDbAndAcknowledge(newRateSchedules, event.acknowledge);
  }

  cancel(event) {
    this.modalRateSchedule.hide();
  }
  async remove(event: FormSubmit) {
    const newRateSchedules = this.restaurant.rateSchedules.filter(rs => rs.id !== this.rateScheduleInEditing.id);
    await this.saveNewRateSchedulesToDbAndAcknowledge(newRateSchedules, event.acknowledge);
  }

  async saveNewRateSchedulesToDbAndAcknowledge(newRateSchedules, acknowledge) {
    try {
      await this._prunedPatch.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
        {
          old: { _id: this.restaurant._id, rateSchedules: [...(this.restaurant.rateSchedules || [])] },
          new: { _id: this.restaurant._id, rateSchedules: newRateSchedules },
        }]);
      this.restaurant.rateSchedules = newRateSchedules;
      acknowledge(null);
      this.modalRateSchedule.hide();
    }
    catch (error) {
      acknowledge(JSON.stringify(error));
    }
  }


  // update() {
  //   this.rateSchedulesInEditing.map(rs => {
  //     rs.rate = (+rs.rate) ? +rs.rate : 0;
  //     rs.fixed = (+rs.fixed) ? +rs.fixed : 0;
  //     rs.commission = (+rs.commission) ? +rs.commission : 0;
  //     rs.agent = (rs.agent || '').trim().toLowerCase();
  //   });

  //   const oldR = { _id: this.restaurant.id || this.restaurant['_id'] };
  //   const newR: any = { _id: this.restaurant.id || this.restaurant['_id'] };
  //   newR.rateSchedules = this.rateSchedulesInEditing.filter(rs => rs.date);

  //   const enabledOrderTypes = (this.restaurant.serviceSettings || []).filter(ss => (ss.paymentMethods || []).length > 0).map(ss => ss.name.toUpperCase());
  //   // validation: making sure all service types are covered!
  //   const uncoveredOrderTypes = enabledOrderTypes.filter(ot => !newR.rateSchedules.some(rs => rs.orderType === ot) && !newR.rateSchedules.some(rs => !rs.orderType || rs.orderType === 'ALL'));
  //   if (uncoveredOrderTypes.length > 0) {
  //     alert('FAILED: no rate schedules for order types ' + uncoveredOrderTypes.join(', '));
  //     return;
  //   }
  //   this._prunedPatch
  //     .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
  //       {
  //         old: oldR,
  //         new: newR
  //       }])
  //     .subscribe(
  //       result => {
  //         // let's update original, assuming everything successful
  //         this._global.publishAlert(
  //           AlertType.Success,
  //           "Updated successfully"
  //         );
  //         this.restaurant.rateSchedules = newR.rateSchedules;
  //         this.editing = false;
  //         this.rateSchedulesInEditing = [];
  //       },
  //       error => {
  //         this._global.publishAlert(AlertType.Danger, "Error updating to DB");
  //       }
  //     );
  // }

}
