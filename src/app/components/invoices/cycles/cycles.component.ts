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

  cycles = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  async ngOnInit() {
    this.thresholds.toDate = this.guessInvoiceDates(new Date()).toDate;
    await this.loadCycles();
  }

  private async loadCycles() {
    this.cycles = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "cycle",
      projection: {
        toDate: 1
      },
      limit: 10000
    }).toPromise();
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
        restaurants: 1,
        balanceThreshold: 1,
        payoutThreshold: 1,
      },
      limit: 1
    }).toPromise();
    if (existingCycles.length === 0) {
      console.log('creating new cycle...');

      // mid month: we will skip non-payout restaurants
      if (Math.abs(16 - new Date(thresholds.toDate).getDate()) < 4) {
        this.thresholds.balanceThreshold = 1000000;
      }

      const newCycleIds = await this._api.post(environment.qmenuApiUrl + "generic?resource=cycle", [thresholds]).toPromise();
      console.log('created', newCycleIds);
      cycle = JSON.parse(JSON.stringify(thresholds));
      cycle._id = newCycleIds[0];

      this.loadCycles();
    } else {
      console.log('found existing cycle');
      cycle = existingCycles[0];
    }

    // inject ALL restaurants if the cycle doesn't have restaurants yet
    if (!cycle.restaurants || cycle.restaurants.length === 0) {
      console.log('injecting restaurants...')
      const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          name: 1,
          skipAutoInvoicing: 1
        },
        limit: 100000
      }).toPromise();

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=cycle', [{
        old: {
          _id: cycle._id
        },
        new: {
          _id: cycle._id,
          restaurants: restaurants
        }
      }]);
      cycle.restaurants = restaurants;
    }

    // create invoices for each restaurant!
    const unprocessedRestaurants = cycle.restaurants.filter(r => !r.invoiceId && !r.error && !r.skipAutoInvoicing);

    const specialCase = unprocessedRestaurants.filter(rt => rt._id === '5ac58e453e54b31400397249');

    for (let r of unprocessedRestaurants) {
      console.log(`processing ${r.name}`);
      r.processedAt = new Date();
      try {
        const payload = {
          toDate: cycle.toDate,
          restaurantId: r._id,
          payoutThreshold: cycle.payoutThreshold,
          balanceThreshold: cycle.balanceThreshold
        };
        const invoice = await this._api.post(environment.appApiUrl + "invoices", payload).toPromise();
        r.invoice = {
          _id: invoice._id,
          balance: invoice.balance,

        };

      } catch (e) {
        console.log(e);
        r.error = e.error || e;
      }


      const indexOfR = cycle.restaurants.indexOf(r);

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=cycle', [{
        old: {
          _id: cycle._id
        },
        new: {
          _id: cycle._id,
          [`restaurants.${indexOfR}`]: r
        }
      }]);

      // break;
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
