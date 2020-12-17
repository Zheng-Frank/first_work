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
    balanceThreshold: 10,
    payoutThreshold: 50,
    toDate: undefined
  }

  fieldDescriptors = [
    {
      field: "balanceThreshold", //
      label: "Balance Threshold (the balance we need to collect from restaurants. 10 for the beginning of a month, 1000000 for mid-month)",
      required: true,
      inputType: "number"
    },
    {
      field: "payoutThreshold", //
      label: "Payout Threshold (the money we need to pay to restaurants, cc = QMENU)",
      required: true,
      inputType: "number"
    },
    {
      field: "toDate", //
      label: "End Date",
      required: true,
      inputType: "date"
    }];

  cycles = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.thresholds.toDate = this.guessInvoiceDates(new Date()).toDate;
    this.setBalanceThresholdBasedOnToDate();
    await this.loadCycles();
  }

  private setBalanceThresholdBasedOnToDate() {
    if (Math.abs(16 - new Date(this.thresholds.toDate).getDate()) < 4) {
      this.thresholds.balanceThreshold = 1000000;
    } else {
      this.thresholds.balanceThreshold = 10;
    }
  }

  formChange(event) {
    // mid month: we will skip non-payout restaurants
    if (event && event.target && event.target.id === "id_toDate") {
      this.setBalanceThresholdBasedOnToDate();
    }
  }

  private async loadCycles() {
    this.cycles = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "cycle",
      projection: {
        toDate: 1
      },
      limit: 1000000
    }).toPromise();
    this.cycles.sort((c2, c1) => new Date(c1.toDate).valueOf() - new Date(c2.toDate).valueOf());
  }

  async formSubmit(event) {
    const thresholds = event.object;
    console.log('start processing...', event.object);
    let cycle;
    let cycleRestaurants = [];
    const existingCycles = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "cycle",
      query: {
        toDate: thresholds.toDate
      },
      projection: {
        toDate: 1,
        restaurants: 1,
        balanceThreshold: 1,
        payoutThreshold: 1,
      },
      limit: 1
    }).toPromise();
    if (existingCycles.length === 0) {
      console.log('creating new cycle...');

      const newCycleIds = await this._api.post(environment.qmenuApiUrl + "generic?resource=cycle", [thresholds]).toPromise();
      console.log('created', newCycleIds);
      cycle = JSON.parse(JSON.stringify(thresholds));
      cycle._id = newCycleIds[0];
      await this.loadCycles();
    } else {
      console.log('found existing cycle');
      cycle = existingCycles[0];

      // load ALL restaurant cycles!
      cycleRestaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
        resource: "restaurant-cycle",
        query: {
          "cycle._id": cycle._id
        },
        projection: {
          cycle: 0,
          "restaurant.error.screenshot": 0,
        }
      }, 7000); // assuming 7000
    }

    // create invoice for each restaurant
    console.log('injecting restaurants...')
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1,
        skipAutoInvoicing: 1
      },
    }, 10000);

    const notProcessedRestaurants = restaurants.filter(r => !cycleRestaurants.some(cr => cr.restaurant._id === r._id));

    // batch processing
    const batchSize = 20;
    const batches = Array(Math.ceil(notProcessedRestaurants.length / batchSize)).fill(0).map((i, index) => notProcessedRestaurants.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batches) {
      console.log("batch...");
      const allResults = await Promise.all(batch.map(r => this.processOneRestaurantInvoice(r, cycle, cycleRestaurants)));
      await new Promise(resolve => setTimeout(() => { resolve() }, 2000));
      console.log("batch done");
    }

    event.acknowledge(null);
    this.currentAction = undefined;


    // let's see how many failed!
    cycleRestaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant-cycle",
      query: {
        "cycle._id": cycle._id
      },
      projection: {
        cycle: 0,
        "restaurant.error.screenshot": 0,
      }
    }, 7000); // assuming 7000

    const stillNotProcessedRestaurants = restaurants.filter(r => !cycleRestaurants.some(cr => cr.restaurant._id === r._id));
    if (stillNotProcessedRestaurants.length > 0) {
      alert(`There are ${stillNotProcessedRestaurants.length} restaurants failed to process. Please run again!`);
    } else {
      alert("All done!");
    }
  }

  private async processOneRestaurantInvoice(r: any, cycle: any, cycleRestaurants: any[]) {
    console.log(`processing ${r.name}`);
    r.processedAt = new Date();
    try {
      const payload = {
        toDate: cycle.toDate,
        restaurantId: r._id,
        payoutThreshold: cycle.payoutThreshold,
        balanceThreshold: cycle.balanceThreshold,
        cycleId: cycle._id
      };
      const invoice = await this._api.post(environment.appApiUrl + "invoices", payload).toPromise();
      r.invoice = {
        _id: invoice._id,
        balance: invoice.balance,
      };
      console.log(invoice);
    } catch (e) {
      console.log(e);
      r.error = e.error || e;
    }

    try {
      const rc = {
        restaurant: r,
        cycle: { ...cycle, restaurants: [] },
      };
      const [rcId] = await this._api.post(environment.qmenuApiUrl + "generic?resource=restaurant-cycle", [rc]).toPromise();
      rc['_id'] = rcId;
      cycleRestaurants.push(rc);
    } catch (error) {
      console.log(error);
    }
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
