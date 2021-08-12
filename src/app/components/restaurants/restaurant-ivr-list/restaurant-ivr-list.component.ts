import { map, filter } from 'rxjs/operators';
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AmazonConnectService } from 'src/app/services/amazon-connect.service';
import { IvrRecord } from 'src/app/classes/ivr/ivr-record';


@Component({
  selector: 'app-restaurant-ivr-list',
  templateUrl: './restaurant-ivr-list.component.html',
  styleUrls: ['./restaurant-ivr-list.component.css']
})
export class RestaurantIvrListComponent implements OnInit {

  @Input() restaurant;
  channels = [];
  ivrRecords: IvrRecord[] = [];
  filteredIvrRecords: IvrRecord[] = [];

  refreshing = false;

  myColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Time",
      paths: ['initiatedAt'],
      sort: (a, b) => a.valueOf() - b.valueOf()
    },
    {
      label: "Phone#"
    },
    {
      label: "Queue"
    },
    {
      label: "Agent"
    },
    {
      label: "Recording"
    },
    {
      label: "Status"
    }
  ];
  pagination = true;
  now = new Date();
  
  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  async refreshCtrs() {
    this.refreshing = true;
    const projection = {
      createdAt: 1,
      InitiationMethod: 1,
      "SystemEndpoint.Address": 1,
      "Recording.Location": 1,
      "Agent.Username": 1,
      "Queue.Name": 1,
      "Queue.ARN": 1,
      "CustomerEndpoint.Address": 1,
      DisconnectTimestamp: 1,
      InitiationTimestamp: 1,
      ConnectedToSystemTimestamp: 1,
      "Attributes.languageCode": 1,
      "Attributes.voicemail.recordingUri": 1, // 
      "Attributes.voicemail.transcript.transcripts": 1 // array
    };

    const ctrs = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: "amazon-connect-ctr",
      query: {
        $and: [
          {
            "CustomerEndpoint.Address": {
              $in: this.channels
            }
          }
        ]
      },
      projection: projection,
      limit: 10000
    }, 5000);

    ctrs.sort((c2, c1) => new Date(c1.InitiationTimestamp).valueOf() - new Date(c2.InitiationTimestamp).valueOf());

    const visibleCtrs = ctrs; //.filter(ctr => !ctr.Queue || this.visibleQueues.some(queue => queue.arn === ctr.Queue.ARN));
    const ivrRecords = visibleCtrs.map(ctr => IvrRecord.parse(ctr));

    const existingIds = this.ivrRecords.reduce((ids, ir) => (ids.add(ir.ctrId), ids), new Set());

    for (let ir of ivrRecords) {
      if (!existingIds.has(ir.ctrId)) {
        this.ivrRecords.unshift(ir);
      }
    }

    this.ivrRecords.sort((i2, i1) => i1.initiatedAt.valueOf() - i2.initiatedAt.valueOf());
    this.computeShouldCallback();
    this.filteredIvrRecords = this.ivrRecords;
    this.refreshing = false;

  }

  computeShouldCallback() {

    const succeeded = new Set();
    const numbersMarkedAsShouldCallback = new Set();

    this.ivrRecords.map(ir => {
      // succeeded: ALL outbounds, or (not voicemail queue && not voice agent and hasAgent)
      const isOutbound = !ir.inbound;
      // const hasNonVoiceQueue = ir.queueName && !ir.queueName.toLowerCase().startsWith("voice");
      const hasNoneVoiceAgent = ir.agentUsername && !ir.agentUsername.toLowerCase().startsWith("voice");

      // if voice queue or agent are not considered to be picked up
      if (isOutbound || hasNoneVoiceAgent) {
        succeeded.add(ir.customerEndpoint);
      }

      // SHOULD CALLBACK
      // 1. inbound && no one pickedup
      // 2. not later succeeded: ()
      // because the it's ordered by time DESC, we can rely on past records so far to decide if it's been handled
      const shouldCallback = ir.inbound && !succeeded.has(ir.customerEndpoint) && !numbersMarkedAsShouldCallback.has(ir.customerEndpoint);
      if (shouldCallback) {
        ir.shouldCallback = true;
        numbersMarkedAsShouldCallback.add(ir.customerEndpoint);
      } else {
        // maybe previously market as should callback. let's reset it to false
        ir.shouldCallback = false;
      }

    });
  }

  ngOnInit() {
    this.channels = this.restaurant.channels.filter(c => {
      if (c.type !== 'Email') {
        c.value = "+1" + c.value;
        return true;
      } else {
        return false;
      }
    }).map(c => c.value);
    this.refreshCtrs();
  }

}
