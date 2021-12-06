import { TimezoneHelper } from '@qmenu/ui';
import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
enum FaxProblemFilterTypes{
  ALL = 'All',
  SEND_INVOICE_ONLY_FAX = 'Send invoice only fax',
  SEND_ORDER_ONLY_FAX = 'Send order only fax'
}
@Component({
  selector: 'fax-health-dashboard',
  templateUrl: './fax-health-dashboard.component.html',
  styleUrls: ['./fax-health-dashboard.component.css']
})
export class FaxHealthDashboardComponent implements OnInit {

  rows = [];
  filterRows = []; //the filter rows used to show three types of fax problem.
  myColumnDescriptors = [
    {
      label: "Restaurant"
    },
    {
      label: "Timezone (as Offset to EST)"
    },
    {
      label: "Fax Number"
    },
    {
      label: "Error Count"
    },
    {
      label: "Errors"
    },
    {
      label: "Succeeded Once"
    }
  ];
  filterTypes = [FaxProblemFilterTypes.ALL, FaxProblemFilterTypes.SEND_INVOICE_ONLY_FAX, FaxProblemFilterTypes.SEND_ORDER_ONLY_FAX];
  type = FaxProblemFilterTypes.ALL;//  concrete filter type
  now = new Date();
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.findPhaxioFailedNumbers();
  }

  // our salesperson only wants to know what is the time offset
  // between EST and the location of restaurant
  getTimeOffsetByTimezone(timezone){
    if(timezone){
      let localTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), timezone);
      let ESTTime = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.now), 'America/New_York');
      let offset = (ESTTime.valueOf() - localTime.valueOf())/(3600*1000);
      return offset > 0 ? "+"+offset.toFixed(0) : offset.toFixed(0);
    }else{
      return 'N/A';
    }
  }

  getTimezoneCity(timezone){
    return (timezone || '').split('/')[1] || '';
  }

  //when the select change we can show three different type of fax problems 
  filterFaxProblemByType() {
    if (this.type === FaxProblemFilterTypes.ALL) {
      this.filterRows = this.rows;
    } else if (this.type === FaxProblemFilterTypes.SEND_INVOICE_ONLY_FAX) {
      this.filterRows = this.rows.filter(r => r.restaurant && r.restaurant.channels 
        && r.restaurant.channels.filter(c => c.type === 'Fax' && c.notifications && c.notifications.filter(n => n === 'Invoice').length > 0).length > 0
        && r.restaurant.channels.filter(c => c.type != 'Fax' && c.notifications && c.notifications.filter(n => n === 'Invoice').length > 0).length === 0);
    } else if (this.type === FaxProblemFilterTypes.SEND_ORDER_ONLY_FAX) {
      this.filterRows = this.rows.filter(r => r.restaurant && r.restaurant.channels
        && r.restaurant.channels.filter(c => c.type === 'Fax' && c.notifications && c.notifications.filter(n => n === 'Order').length > 0).length > 0
        && r.restaurant.channels.filter(c => c.type != 'Fax' && c.notifications && c.notifications.filter(n => n === 'Order').length > 0).length === 0);
    }
  }
  async findPhaxioFailedNumbers() {
    const failedFaxEvents = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        "name": "fax-status",
        "params.body.success": "false",
        "createdAt": { $gt: new Date().valueOf() - 1 * 24 * 3600000 }
      },
      projection: {
        "params.body": 1
      },
      limit: 30000
    }).toPromise();

    const numberFailureLogs = {};
    failedFaxEvents.map(fe => {
      const faxBody = JSON.parse(fe.params.body.fax);
      // console.log(faxBody);
      const phone = faxBody.recipients[0].number.slice(2);
      const error = faxBody.recipients[0].error_code;
      if (!numberFailureLogs[phone]) {
        numberFailureLogs[phone] = {
          phone: phone,
          errors: {}
        }
      }
      numberFailureLogs[phone].errors[error] = (numberFailureLogs[phone].errors[error] || 0) + 1;
    });

    // organize errors by type:
    this.rows = Object.keys(numberFailureLogs).map(phone => numberFailureLogs[phone]);
    this.rows.map(row => row.errorList = Object.keys(row.errors).map(k => `${k} (${row.errors[k]})`));

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "channels.value": { $in: this.rows.map(row => row.phone) }
      },
      projection: {
        name: 1,
        channels: 1,
        'googleAddress.timezone': 1
      },
      limit: 30000
    }).toPromise();

    // match back!
    restaurants.map(restaurant => {
      (restaurant.channels || []).map(channel => {
        if (numberFailureLogs[channel.value]) {
          numberFailureLogs[channel.value].restaurant = restaurant;
        }
      });
    });

    // once succeeded numbers!
    const onceSucceededJobs = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'job',
      query: {
        "name": "send-order-fax",
        "logs.status": "success",
        "params.to": { $in: this.rows.map(row => row.phone) },
        "createdAt": { $gt: new Date().valueOf() - 1 * 24 * 3600000 }
      },
      projection: {
        "params.to": 1
      },
      limit: 30000
    }).toPromise();

    const onceSucceededNumbers = [...new Set(onceSucceededJobs.map(job => job.params.to))];
    console.log(onceSucceededJobs);
    this.rows.map(row => {
      row.succeededOnce = onceSucceededNumbers.some(number => number === row.phone);
    });

    // sort?
    this.rows.sort((r1, r2) => this.getErrorsCount(r2) - this.getErrorsCount(r1));
    this.filterRows = this.rows;
  }

  getErrorsCount(row) {
    return Object.keys(row.errors).map(key => row.errors[key]).reduce((sum, count) => sum + count, 0);
  }

}
