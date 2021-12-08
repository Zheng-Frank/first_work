import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
@Component({
  selector: 'fax-health-dashboard',
  templateUrl: './fax-health-dashboard.component.html',
  styleUrls: ['./fax-health-dashboard.component.css']
})
export class FaxHealthDashboardComponent implements OnInit {
  queryDate = 'Last hour';

  // possible to-do: add custom date query ranges
  queryDateMap = {
    'Last hour': new Date().valueOf() - 3600000,
    'Last 6 hours': new Date().valueOf() - 6 * 3600000,
    'Last 24 hours': new Date().valueOf() - 1 * 24 * 3600000,
    'Last 3 days': new Date().valueOf() - 3 * 24 * 3600000,
    'Last 5 days': new Date().valueOf() - 5 * 24 * 3600000,
  };

  rows = [];
  myColumnDescriptors = [
    {
      label: "Provider Name",
      paths: ['providerName'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Successfully Sent Jobs",
      paths: ['successfulJobs'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Failed Jobs",
      paths: ['failedJobs'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Failure Rate (%)",
      paths: ['failureRate'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: "Errors"
    }
  ];

  errorColumnDescriptors = [
    {
      label: "Message",
      paths: ['message'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Occurrences",
      paths: ['number'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },

  ]

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.queryJobs();
  }

  async queryJobs() {
    const faxJobs = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'job',
      query: {
        "name": "send-order-fax",
        "createdAt": { $gt: this.queryDateMap[this.queryDate] }
      },
      projection: {
        "logs": 1
      },
      sort: {
        _id: -1
      }
    }, 2500);

    this.rows = ['twilio', 'telnyx', 'phaxio'].map(providerName => {
      // to find success jobs, first filter by provider name, then the success/delivered message
      const successfulJobs = faxJobs
        .filter(job => job.logs[0].providerName === providerName)
        .filter(job => job.logs.findIndex(log => log.status === 'delivered' || log.status === 'success') >= 0);

      // failed jobs is simply the inverse
      const failedJobs = faxJobs
        .filter(job => job.logs[0].providerName === providerName)
        .filter(job => job.logs.findIndex(log => log.status === 'delivered' || log.status === 'success') < 0);

      return {
        providerName,
        successfulJobs: successfulJobs.length,
        failedJobs: failedJobs.length,
        failureRate: (100 * failedJobs.length / (successfulJobs.length ? successfulJobs.length : 1)).toFixed(1), // ternary avoids divide by 0
        errorCodes: this.computeErrorCodes(failedJobs)
      };
    });
  }

  computeErrorCodes(failedJobs) {
    const errorRows = [];
    const errorDict = {};
    // strings/statuses that appear in this array are not error messages, and will not be added to the error dictionary
    const ignoreLogMessages = ['success', 'delivered', 'sending', 'media.processed', 'executed'];

    if (failedJobs[0] && failedJobs[0].logs[0].providerName !== 'phaxio') {
      // phaxio jobs sometimes get queued but not sent, so we want to consider it as an error code for phaxio, but not
      //the other two providers
      ignoreLogMessages.push('queued');
    }

    failedJobs.map(job => job.logs.forEach(log => {
      if (!ignoreLogMessages.includes(log.status)) {
        if (errorDict[log.status]) {
          errorDict[log.status] += 1;
        } else {
          errorDict[log.status] = 1;
        }
      }
    }));

    for (let [key, val] of Object.entries(errorDict)) {
      errorRows.push({
        message: key,
        number: val
      });
    };

    return errorRows;
  }
}
