import { environment } from './../../../../environments/environment';
import { ApiService } from './../../../services/api.service';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-weird-data',
  templateUrl: './weird-data.component.html',
  styleUrls: ['./weird-data.component.css']
})
export class WeirdDataComponent implements OnInit {

  pickupTimeEstimateExtremeList: any;
  deliveryTimeEstimateExtremeList: any;
  taxRateExtremeList: any;
  ccMinimumChargeExtremeList: any;
  pickupMinimumExtremeList: any;
  deliveryMinimumExtremeList: any;
  deliveryMaxDistanceExtremeList: any;
  ccProcessingFlatFeeExtremeList: any;
  ccProcessingRateExtremeList: any;
  surchargeAmountExtremeList: any;

  constructor(private _api: ApiService, private _router: Router) { }

  ngOnInit() {
    this.populateExtremeData();
  }
  //note:some restaurant has some Extreme problem data,we should could the data and fix it
  async populateExtremeData() {
    this.pickupTimeEstimateExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "pickupTimeEstimate": 1 },
      sort: { "pickupTimeEstimate": -1 },
      limit: 20
    },10);

    this.deliveryTimeEstimateExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "deliveryTimeEstimate": 1 },
      sort: { "deliveryTimeEstimate": -1 },
      limit: 20
    },10);

    this.taxRateExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "taxRate": 1 },
      sort: { "taxRate": -1 },
      limit: 20
    },10);

    this.ccMinimumChargeExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "ccMinimumCharge": 1 },
      sort: { "ccMinimumCharge": -1 },
      limit: 20
    },10);

    this.pickupMinimumExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "pickupMinimum": 1 },
      sort: { "pickupMinimum": -1 },
      limit: 20
    },10);

    this.deliveryMinimumExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "deliveryMinimum": 1 },
      sort: { "deliveryMinimum": -1 },
      limit: 20
    },10);

    this.deliveryMaxDistanceExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "deliveryMaxDistance": 1 },
      sort: { "deliveryMaxDistance": -1 },
      limit: 20
    },10);

    this.ccProcessingFlatFeeExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "ccProcessingFlatFee": 1 },
      sort: { "ccProcessingFlatFee": -1 },
      limit: 20
    },10);

    this.ccProcessingRateExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "ccProcessingRate": 1 },
      sort: { "ccProcessingRate": -1 },
      limit: 20
    },10);

    this.surchargeAmountExtremeList = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "surchargeAmount": 1 },
      sort: { "surchargeAmount": -1 },
      limit: 20
    },10);

  }


}
