import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { count } from 'rxjs/operators';

@Component({
  selector: 'app-monitoring-fax',
  templateUrl: './monitoring-fax.component.html',
  styleUrls: ['./monitoring-fax.component.css']
})
export class MonitoringFaxComponent implements OnInit {

  rows = [];
  myColumnDescriptors = [
    {
      label: "Restaurant"
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

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
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
        "phones.phoneNumber": { $in: this.rows.map(row => row.phone) },
        "channels.value": { $in: this.rows.map(row => row.phone) }
      },
      projection: {
        "name": 1,
        "phones": 1,
        "channels": 1
      },
      limit: 30000
    }).toPromise();

    // match back!
    restaurants.map(restaurant => {
      (restaurant.phones || []).map(phone => {
        if (numberFailureLogs[phone.phoneNumber]) {
          numberFailureLogs[phone.phoneNumber].restaurant = restaurant;
        }
      });

      (restaurant.channels || []).map(channel => {
        if (numberFailureLogs[channel.value]) {
          numberFailureLogs[channel.value].restaurant = restaurant;
        }
      });
    });

    // const settings = await this._api.get(environment.qmenuApiUrl + 'generic', {
    //   resource: 'system'
    // }).toPromise();

    // settings[0].faxSettings.customized[0].toPhones.map(phone => {
    //   if (numberFailureLogs[phone]) {
    //     numberFailureLogs[phone].customized = true;
    //   }
    // });

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

  }

  getErrorsCount(row) {
    return Object.keys(row.errors).map(key => row.errors[key]).reduce((sum, count) => sum + count, 0);
  }

}
