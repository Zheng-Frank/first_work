import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AlertType } from '../../../classes/alert-type';
import { AmazonConnectService } from 'src/app/services/amazon-connect.service';
import { IvrRecord } from 'src/app/classes/ivr/ivr-record';

const VOICE_MAIL_QUEUE_ARNS = [
  "arn:aws:connect:us-east-1:449043523134:instance/57cd1483-c833-43d9-95e1-f0f97a7c3b09/queue/9a7ac649-fc95-4053-8f01-942e7c645b5c"
];

@Component({
  selector: 'app-ivr-agent',
  templateUrl: './ivr-agent.component.html',
  styleUrls: ['./ivr-agent.component.css']
})
export class IvrAgentComponent implements OnInit, OnDestroy {

  ivrUsername;
  ivrQueueNames = [];
  ivrRecords: IvrRecord[] = [];
  filteredIvrRecords: IvrRecord[] = [];

  shouldCallbackOnly = false;
  searchFilter;

  now = new Date();
  lastRefreshed: Date;
  timer;
  timerInterval = 5000; // every 5 seconds
  refreshDataInterval = 3 * 60000; // every 3 minutes

  connectedContact;

  ivrEnabled = false;

  mp3VisitedIvrRecords = new Set();

  constructor(private _api: ApiService, private _global: GlobalService, private _connect: AmazonConnectService) {
    this._connect.onContactConnected.subscribe(contact => {
      console.log("SUBSCRIBED: CONNTECT", contact);
      this.connectedContact = contact;
    });
    this._connect.onContactEnded.subscribe(contact => {
      console.log("SUBSCRIBED: ENDED", contact);
      this.connectedContact = undefined;
    });
    this._connect.onEnabled.subscribe(enabled => { this.ivrEnabled = enabled; this.refresh(); });
    this._connect.onConfigurationChanged.subscribe(config => { this.refresh(); });
  }

  startIvr() {
    this._connect.setEnabeld(true);
  }

  getConfig() {
    return this._connect.config || { username: 'N/A' } as any;
  }

  ngOnInit() {
    this.refresh().then(console.log).catch(console.error);
    this.timer = setInterval(_ => {
      this.now = new Date();
      // refresh every 3 minutes
      if (!this.lastRefreshed || this.now.valueOf() - this.lastRefreshed.valueOf() > this.refreshDataInterval) {
        this.lastRefreshed = this.now; // preset to avoid being called multiple times (not finishing within each tick)
        this.refresh();
      }
    }, this.timerInterval);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  isMp3Visited(ir) {
    return this.mp3VisitedIvrRecords.has(ir);
  }
  visitMp3(ir) {
    this.mp3VisitedIvrRecords.add(ir);
  }

  refreshing = false;
  async refresh() {
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;
    // TO DO TIMEOUT
    console.log("refresh");

    while (true && this.ivrEnabled) {
      const config = this.getConfig();
      if (config.routingProfile) {
        this.ivrUsername = config.username;
        this.ivrQueueNames = config.routingProfile.queues.map(q => q.name || 'DEFAULT');
        const ctrs = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: "amazon-connect-ctr",
          query: {
            $or: [{
              "Queue.ARN": { $in: [...config.routingProfile.queues.map(q => q.queueARN), ...VOICE_MAIL_QUEUE_ARNS] }
            }, {
              "Queue": null
            }]
          },
          projection: {
            createdAt: 1,
            InitiationMethod: 1,
            "SystemEndpoint.Address": 1,
            "Recording.Location": 1,
            "Agent.Username": 1,
            "Queue.Name": 1,
            "CustomerEndpoint.Address": 1,
            DisconnectTimestamp: 1,
            InitiationTimestamp: 1,
            ConnectedToSystemTimestamp: 1,
          },
          sort: {
            createdAt: -1
          },
          limit: 1000
        }).toPromise();

        this.ivrRecords = ctrs.map(ctr => IvrRecord.parse(ctr));
        const relatedRts = await this._global.getCachedRestaurantListForPicker();

        // build return records and restaurants
        this.ivrRecords.map(ir => {
          relatedRts.map(rt => {
            if ((rt.channels || []).some(c => c.value === ir.customerEndpoint)) {
              ir.restaurants.push(rt);
            }
          });
        });

        this.ivrRecords.sort((i2, i1) => i1.initiatedAt.valueOf() - i2.initiatedAt.valueOf());
        this.lastRefreshed = new Date();
        this.computeShouldCallback();
        this.filter();
        break;

      } else {
        console.log("wait...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.now = new Date();
    this.refreshing = false;
  }

  computeShouldCallback() {
    // from newest, calculating succeeded and marked
    const succeeded = new Set();
    const marked = new Set();

    this.ivrRecords.map(ir => {
      // succeeded: not voicemail, not voice agent, has connectedTime, hasAgent
      if (ir.customerEndpoint && ir.queueName !== 'VoicemailQueue' && ir.agentUsername && !ir.agentUsername.startsWith("voice") && ir.connectedTime) {
        succeeded.add(ir.customerEndpoint);
      }

      const shouldCallback = ir.inbound && (!ir.agentUsername || ir.agentUsername.startsWith('voice')) && !succeeded.has(ir.customerEndpoint) && !marked.has(ir.customerEndpoint);
      if (shouldCallback) {
        ir.shouldCallback = true;
        marked.add(ir.customerEndpoint);
        console.log("SHOULD CALL")
      }
    });
  }

  filter(event?: any) {
    this.filteredIvrRecords = this.ivrRecords;
    if (this.shouldCallbackOnly) {
      this.filteredIvrRecords = this.filteredIvrRecords.filter(ir => ir.shouldCallback);
    }
    if ((this.searchFilter || '').trim().length > 0) {
      // try using phone number:
      const text = this.searchFilter.trim().replace("+1", "");
      const digits = text.replace(/\D/g, '');
      const byPhone = (ir: IvrRecord, digits) => (ir.customerEndpoint || '').indexOf(digits) >= 0;
      const byRtNameOrId = (ir: IvrRecord, text) => (ir.restaurants || []).some(rt => rt.name.toLowerCase().indexOf(text.toLowerCase()) >= 0 || rt._id.indexOf(text) >= 0);
      this.filteredIvrRecords = this.filteredIvrRecords.filter(ir => (digits.length > 0 && byPhone(ir, digits)) || byRtNameOrId(ir, text));
    }
  }
}
