import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
@Component({
  selector: 'fax-health-dashboard',
  templateUrl: './fax-health-dashboard.component.html',
  styleUrls: ['./fax-health-dashboard.component.css']
})
export class FaxHealthDashboardComponent implements OnInit {
  displaySinceDate = new Date(new Date().valueOf() - 3 * 24 * 3600000);
  rows = [];
  myColumnDescriptors = [
    {
      label: "Provider Name"
    },
    {
      label: "Successfully Sent Jobs"
    },
    {
      label: "Failed Jobs"
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
    this.populateFaxEvents();
  }

  async populateFaxEvents() {
    const threeDaysAgo = new Date().valueOf() - 3 * 24 * 3600000;
    this.displaySinceDate = new Date(threeDaysAgo);
    const faxStatusEvents = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        "name": "fax-status",
        "createdAt": { $gt: threeDaysAgo }
      },
      projection: {
        "params": 1,
        "logs": 1
      },
      limit: 5000,
      sort: {
        _id: -1
      }
    }).toPromise();

    const telnyxSuccessEvents = {};
    const phaxioSuccessEvents = {};
    const telnyxFailureEvents = {};
    const phaxioFailureEvents = {};

    const telnyxErrorCodes = {};
    const phaxioErrorCodes = {};

    faxStatusEvents.forEach(event => {
      // create a table successful fax events for both telnyx and phaxio
      if (event.params && event.params.body && event.params.body.data && event.params.body.data.payload.status === 'delivered') {
        telnyxSuccessEvents[event.params.jobId] = event;
      }

      if (event.params && event.params.body && event.params.body.success === 'true') {
        phaxioSuccessEvents[event.params.jobId] = event;
      }

      // if a given jobId has a success event, we know its index in the array will be *before* failure events associated with the same jobId, if any exist
      // for this reason, with a simple key lookup we can be confident there will be no overlap between the success and failure objects
      if (event.params && event.params.body && event.params.body.data
        && event.params.body.data.payload.status === 'failed' && !telnyxSuccessEvents[event.params.jobId]) {
        telnyxFailureEvents[event.params.jobId] = event;

        if (telnyxErrorCodes[event.params.body.data.payload.failure_reason]) {
          telnyxErrorCodes[event.params.body.data.payload.failure_reason] += 1;
        } else {
          telnyxErrorCodes[event.params.body.data.payload.failure_reason] = 1;
        }
      }

      if (event.params && event.params.body && event.params.body.success === 'false' && !phaxioSuccessEvents[event.params.jobId]) {
        phaxioFailureEvents[event.params.jobId] = event;
      }
    });

    console.log(phaxioFailureEvents);
    console.log(telnyxErrorCodes);
  }

}
