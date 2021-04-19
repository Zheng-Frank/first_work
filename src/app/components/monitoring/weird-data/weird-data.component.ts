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

  pickupTimeEstimateExtrmeList: any;
  deliveryTimeEstimateExtrmeList: any;
  taxRateExtrmeList: any;
  ccMinimumChargeExtrmeList: any;
  pickupMinimumExtrmeList: any;
  deliveryMinimumExtrmeList: any;
  deliveryMaxDistanceExtrmeList: any;
  ccProcessingFlatFeeExtrmeList: any;
  ccProcessingRateExtrmeList: any;
  surchargeAmountExtrmeList: any;

  constructor(private _api: ApiService, private _router: Router) { }

  ngOnInit() {
    this.populateExtrmeData();
  }
  //note:some restaurant has some extrme problem data,we should could the data and fix it
  async populateExtrmeData() {
    this.pickupTimeEstimateExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "pickupTimeEstimate": 1 },
      sort: { "pickupTimeEstimate": -1 },
      limit: 20
    }).toPromise();

    this.deliveryTimeEstimateExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "deliveryTimeEstimate": 1 },
      sort: { "deliveryTimeEstimate": -1 },
      limit: 20
    }).toPromise();

    this.taxRateExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "taxRate": 1 },
      sort: { "taxRate": -1 },
      limit: 20
    }).toPromise();

    this.ccMinimumChargeExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "ccMinimumCharge": 1 },
      sort: { "ccMinimumCharge": -1 },
      limit: 20
    }).toPromise();

    this.pickupMinimumExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "pickupMinimum": 1 },
      sort: { "pickupMinimum": -1 },
      limit: 20
    }).toPromise();

    this.deliveryMinimumExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "deliveryMinimum": 1 },
      sort: { "deliveryMinimum": -1 },
      limit: 20
    }).toPromise();

    this.deliveryMaxDistanceExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "deliveryMaxDistance": 1 },
      sort: { "deliveryMaxDistance": -1 },
      limit: 20
    }).toPromise();

    this.ccProcessingFlatFeeExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "ccProcessingFlatFee": 1 },
      sort: { "ccProcessingFlatFee": -1 },
      limit: 20
    }).toPromise();

    this.ccProcessingRateExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "ccProcessingRate": 1 },
      sort: { "ccProcessingRate": -1 },
      limit: 20
    }).toPromise();

    this.surchargeAmountExtrmeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query:{
        disabled:{$ne:true}
      },
      projection: { _id: 1, "name": 1, "disabled": 1, "surchargeAmount": 1 },
      sort: { "surchargeAmount": -1 },
      limit: 20
    }).toPromise();

  }


}
