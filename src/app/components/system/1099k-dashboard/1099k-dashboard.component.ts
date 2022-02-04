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
  rows = [];
  filteredRows = [];
  taxYearOptions = [
    'All',
    // '2022', // taxYear 2022 will need to be enabled beginning in 2023
    '2021',
    '2020',
  ];

  taxYear = 'All';

  showMissingPayee = false;
  showMissingTIN = false;
  showMissingEmail = false;

  searchFilter;

  system: any;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    await this.get1099KData();
    this.filterRows();
  }

  isAdmin() {
    let roles = this._global.user.roles || [];
    return roles.includes('ADMIN');
  }

  debounce(value) {
    this.filterRows();
  }

  async get1099KData() {
    let restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "form1099k.required": true
      },
      projection: {
        name: 1,
        form1099k: 1,
        channels: 1,
        googleAddress: 1,
        people: 1,
        tin: 1,
        payeeName: 1
      }
    }, 5000);

    this.rows = restaurants.map(rt => this.turnRtObjectIntoRow(rt));

  }

  turnRtObjectIntoRow(rt) {
    const rtTIN = rt.tin || null;
    const payeeName = rt.payeeName || null;
    const email = (rt.channels || []).filter(ch => ch.type === 'Email' && (ch.notifications || []).includes('Invoice')).map(ch => ch.value); // RT *must* have an invoice email channel
    return {
      id: rt._id,
      name: rt.name,
      email,
      form1099k: rt.form1099k,
      payeeName,
      rtTIN,
      channels: rt.channels || []
    }
  }

  filterRows() {
    /* pass through several layers of filtering based on each possible criteria: 
    taxYear, showingMissingPayee, showMissingTIN, and showMissingEmail */
    this.filteredRows = this.rows;

    // taxYear
    if (this.taxYear !== 'All') {
      const year = parseInt(this.taxYear);
      this.filteredRows = this.filteredRows.filter(row => row.form1099k.findIndex(form => form.year === year) >= 0);
    }

    // showMissingPayee
    if (this.showMissingPayee) {
      this.filteredRows = this.filteredRows.filter(row => !row.payeeName);
    }

    // showingMissingTIN
    if (this.showMissingTIN) {
      this.filteredRows = this.filteredRows.filter(row => !row.rtTIN);
    }

    // showingMissingEmail
    if (this.showMissingEmail) {
      this.filteredRows = this.filteredRows.filter(row => !row.email);
    }

    // search will match RT name, RT id, payee name, or email address
    if (this.searchFilter && this.searchFilter.trim().length > 0) {
      this.filteredRows = this.filteredRows.filter(row => {
        let lowerCaseSearchFilter = this.searchFilter.toLowerCase();
        const nameMatch = (row.name || "").toLowerCase().includes(lowerCaseSearchFilter);
        const idMatch = (row.id.toString() || "").toLowerCase().includes(lowerCaseSearchFilter);
        const payeeMatch = (row.payeeName || "").toLowerCase().includes(lowerCaseSearchFilter);
        const emailMatch = (row.email || []).some(entry => entry.toLowerCase().includes(lowerCaseSearchFilter));
        return nameMatch || idMatch || payeeMatch || emailMatch;
      });
    }
  }

  async submitTIN(event, rowIndex) {
    this.filteredRows[rowIndex].rtTIN = event.newValue;

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[rowIndex].id },
        new: { _id: this.filteredRows[rowIndex].id, tin: event.newValue }
      }
    ]).toPromise();
  }

  async submitPayee(event, rowIndex) {
    this.filteredRows[rowIndex].payeeName = event.newValue;

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[rowIndex].id },
        new: { _id: this.filteredRows[rowIndex].id, payeeName: event.newValue }
      }
    ]).toPromise();
  }

  async submitEmail(event, rowIndex) {
    /* we only allow user to submit email if one does not already exist. 
    to avoid possible errors, will not allow users to edit existing channels from this component*/
    const newChannel = {
      type: 'Email',
      value: event.newValue,
      notifications: ['Invoice']
    }
    this.filteredRows[rowIndex].email = [newChannel.value]; // angular template expects an array of emails for this property

    const oldChannels = this.filteredRows[rowIndex].channels;
    const newChannels = [...oldChannels, newChannel];

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[rowIndex].id },
        new: { _id: this.filteredRows[rowIndex].id, channels: newChannels }
      }
    ]).toPromise();

  }
  async renderQMenuForm(row, form) {

  }

  async renderRestaurantForm(row, form) {

  }
}
