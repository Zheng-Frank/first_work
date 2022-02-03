import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { PDFDocument } from "pdf-lib";

import * as FileSaver from 'file-saver';


@Component({
  selector: "app-1099k-dashboard",
  templateUrl: "./1099k-dashboard.component.html",
  styleUrls: ["./1099k-dashboard.component.scss"]
})
export class Dashboard1099KComponent implements OnInit {
  taxYearOptions = [
    'All',
    // '2022', // taxYear 2022 will need to be enabled beginning in 2023
    '2021',
    '2020',
  ];

  missingAttributeOptions = [
    'Missing Neither',
    'Missing TIN',
    'Missing Payee',
    'Missing Both'
  ];

  ownerEmailOptions = [
    'Email Present',
    'Email Missing'
  ];

  taxYear = 'All';
  missingAttributeFilter = 'Missing Neither';
  ownerEmailStatus = 'Email Present'
  searchFilter;

  system: any;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.get1099KData();

  }

  isAdmin() {
    let roles = this._global.user.roles || [];
    return roles.includes('ADMIN');
  }

  debounce(value) {
    this.filterForms();
  }

  async get1099KData() {
    let restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "form1099k.required": true
      },
      projection: {
        form1099k: 1,
        channels: 1,
        googleAddress: 1,
        people: 1
      }
    }, 5000);

    console.log(restaurants);
  }

  filterForms() {
    /* filter criteria:
    taxYear, missingAttributeFilter, ownerEmailStatus,  */
    console.log('filterForms()')
    console.log(this.taxYear);
  }


  async getRestaurantLocations() {

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        "googleAddress.lat": 1,
        "googleAddress.lng": 1,
        "googleAddress.administrative_area_level_1": 1
      },
      limit: 700000
    }).toPromise();
    console.log(restaurants);
    FileSaver.saveAs(new Blob([JSON.stringify(restaurants)], { type: "text" }), 'data.txt');
  }



}
