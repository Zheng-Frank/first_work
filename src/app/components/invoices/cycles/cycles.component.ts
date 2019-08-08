import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-cycles',
  templateUrl: './cycles.component.html',
  styleUrls: ['./cycles.component.css']
})
export class CyclesComponent implements OnInit {

  currentAction;
  thresholds = {
    balanceThreshold: 20,
    payoutThreshold: 50,
    toDate: undefined
  }

  fieldDescriptors = [
    {
      field: "balanceThreshold", //
      label: "Balance Threshold (minimum balance to create invoice)",
      required: true,
      inputType: "number"
    },
    {
      field: "payoutThreshold", //
      label: "Payout Threshold (cc = QMENU)",
      required: true,
      inputType: "number"
    },
    {
      field: "toDate", //
      label: "End Date",
      required: true,
      inputType: "date"
    }];

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
    this.thresholds.toDate = this.guessInvoiceDates(new Date()).toDate;
  }

  async formSubmit(event) {
    const thresholds = event.object;
    console.log('start processing...', event.object);
    let cycle;
    const existingCycles = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "cycle",
      query: {
        toDate: thresholds.toDate
      },
      projection: {
        toDate: 1,
        "restaurants._id": 1
      },
      limit: 1
    }).toPromise();
    if (existingCycles.length === 0) {
      console.log('creating new cycle...');
      const newCycleIds = await this._api.post(environment.qmenuApiUrl + "generic?resource=cycle", [thresholds]).toPromise();
      console.log('created', newCycleIds);
      cycle = JSON.parse(JSON.stringify(thresholds));
      cycle._id = newCycleIds[0];
    } else {
      console.log('found existing cycle');
      cycle = existingCycles[0];
    }

    // inject ALL restaurants if the cycle doesn't have restaurants yet
    if (!cycle.restaurants || cycle.restaurants.length === 0) {
      const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          disabled: 1,
          name: 1
        },
        limit: 100000
      }).toPromise();
    }
    event.acknowledge(null);
    this.currentAction = undefined;
  }

  formCancel() {
    this.currentAction = undefined;
  }


  setAction(action) {
    // toggle
    this.currentAction = this.currentAction === action ? undefined : action;
  }


  guessInvoiceDates(someDate) {
    // 1 - 15 --> previous month: 16 - month end
    // otherwise 1 - 15 of same month
    if (someDate.getDate() > 15) {
      return {
        fromDate: this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth(), 1)),
        toDate: this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth(), 15))
      };
    } else {
      return {
        fromDate: this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth() - 1, 16)),
        toDate: this.formatDate(new Date(someDate.getFullYear(), someDate.getMonth(), 0))
      };
    }
  }
  // return 2017-2-12 for binding of date input
  private formatDate(d) {
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) { month = '0' + month; }
    if (day.length < 2) { day = '0' + day; }
    return [year, month, day].join('-');
  }



}
