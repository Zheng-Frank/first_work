import { AlertType } from './../../../classes/alert-type';
import { GlobalService } from 'src/app/services/global.service';
import { ViewChild } from '@angular/core';
import { Log } from 'src/app/classes/log';
import { environment } from './../../../../environments/environment';
import { ApiService } from './../../../services/api.service';
import { Component, OnInit } from '@angular/core';
import { PrunedPatchService } from 'src/app/services/prunedPatch.service';

@Component({
  selector: 'app-weird-data',
  templateUrl: './weird-data.component.html',
  styleUrls: ['./weird-data.component.css']
})
export class WeirdDataComponent implements OnInit {

  @ViewChild('logEditingModal') logEditingModal;
  weridDataListObj = {
    pickupTimeEstimateExtremeList: [],
    deliveryTimeEstimateExtremeList: [],
    taxRateExtremeList: [],
    ccMinimumChargeExtremeList: [],
    pickupMinimumExtremeList: [],
    deliveryMaxDistanceExtremeList: [],
    ccProcessingFlatFeeExtremeList: [],
    ccProcessingRateExtremeList: [],
    surchargeAmountExtremeList: []
  }
  weridDataListProjection = {
    pickupTimeEstimateExtremeList: {
      projection: { _id: 1, "name": 1, "pickupTimeEstimate": 1, "logs": 1 },
      sort: { "pickupTimeEstimate": -1 }
    },
    deliveryTimeEstimateExtremeList: {
      projection: { _id: 1, "name": 1, "deliveryTimeEstimate": 1, "logs": 1 },
      sort: { "deliveryTimeEstimate": -1 }
    },
    taxRateExtremeList: {
      projection: { _id: 1, "name": 1, "taxRate": 1, "logs": 1 },
      sort: { "taxRate": -1 }
    },
    ccMinimumChargeExtremeList: {
      projection: { _id: 1, "name": 1, "ccMinimumCharge": 1, "logs": 1 },
      sort: { "ccMinimumCharge": -1 }
    },
    pickupMinimumExtremeList: {
      projection: { _id: 1, "name": 1, "pickupMinimum": 1, "logs": 1 },
      sort: { "pickupMinimum": -1 }
    },
    deliveryMaxDistanceExtremeList: {
      projection: { _id: 1, "name": 1, "deliveryMaxDistance": 1, "logs": 1 },
      sort: { "deliveryMaxDistance": -1 }
    },
    ccProcessingFlatFeeExtremeList: {
      projection: { _id: 1, "name": 1, "ccProcessingFlatFee": 1, "logs": 1 },
      sort: { "ccProcessingFlatFee": -1 }
    },
    ccProcessingRateExtremeList: {
      projection: { _id: 1, "name": 1, "ccProcessingRate": 1, "logs": 1 },
      sort: { "ccProcessingRate": -1 }
    },
    surchargeAmountExtremeList: {
      projection: { _id: 1, "name": 1, "surchargeAmount": 1, "logs": 1 },
      sort: { "surchargeAmount": -1 }
    }
  }
  logInEditing = new Log();
  restaurant;
  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) { }

  ngOnInit() {
    this.populateExtremeData();
  }
  // return a format title to use in h2
  getWeridDataKey(key) {
    return key.substring(0, key.length - 11);
  }

  async addLog(rt) {
    this.logInEditing = new Log();
    this.logInEditing.type = 'weird-data-cleanup';
    this.restaurant = rt;
    this.logEditingModal.show();
  }

  onCancelAddLog() {
    this.logEditingModal.hide();
  }

  onSuccessAddLog(data) {
    const oldRestaurant = JSON.parse(JSON.stringify(this.restaurant));
    const updatedRestaurant = JSON.parse(JSON.stringify(oldRestaurant));
    updatedRestaurant.logs = updatedRestaurant.logs || [];
    if (!data.log.time) {
      data.log.time = new Date();
    }
    if (!data.log.username) {
      data.log.username = this._global.user.username;
    }

    updatedRestaurant.logs.push(new Log(data.log));

    this.patchLog(oldRestaurant, updatedRestaurant, data.formEvent.acknowledge);
  }

  patchLog(oldRestaurant, updatedRestaurant, acknowledge) {
    this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{ old: { _id: oldRestaurant._id }, new: { _id: updatedRestaurant._id, logs: updatedRestaurant.logs } }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.restaurant.logs = updatedRestaurant.logs;
          this._global.publishAlert(
            AlertType.Success,
            'Success Add a new log.'
          );

          acknowledge(null);
          this.logEditingModal.hide();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error');
          acknowledge('API Error');
        }
      );
  }

  // note:some restaurant has some Extreme problem data,we should could the data and fix it
  async populateExtremeData() {
    for (const key in this.weridDataListObj) {
      this.weridDataListObj[key] = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        aggregate: [
          { '$match': { disabled: { $ne: true } } },
          { '$project': this.weridDataListProjection[key].projection },
          { '$sort': this.weridDataListProjection[key].sort },
          { '$limit': 30 }
        ]
      }).toPromise();
    }
  }


}
