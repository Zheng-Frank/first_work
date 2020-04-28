import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AmazonConnectService } from 'src/app/services/amazon-connect.service';
import { IvrRecord } from 'src/app/classes/ivr/ivr-record';

@Component({
  selector: 'app-ivr-agent',
  templateUrl: './ivr-agent.component.html',
  styleUrls: ['./ivr-agent.component.css']
})
export class IvrAgentComponent implements OnInit, OnDestroy {

  phoneQueuesDict = {} as any;
  visibleQueues = [];
  queuesForFilter = [];

  myPhoneNumbers = [];
  selectedQueue;

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
    this._connect.onEnabled.subscribe(enabled => { console.log("ON ENABLED!", enabled); });
    this._connect.onConfigurationChanged.subscribe(config => {
      console.log("ON CONFIGURE", config);
      this.populateQueuesFromConfig();
      if (this.visibleQueues.length > 0) {
        this.refreshCtrs();
      }
    });

    this.populatePhoneQueues();
  }

  async populatePhoneQueues() {
    const items = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "amazon-connect-ctr",
      aggregate:
        [
          {
            $group: { _id: { arn: '$Queue.ARN', name: '$Queue.Name', phone: "$SystemEndpoint.Address" } } // _id is a composite key!
          }
        ]
    }).toPromise();

    // establish phone number <--> queue relationship!
    const phoneQueuesDict = {};
    items.map(item => {
      const phone = item._id.phone.replace("+1", "");
      phoneQueuesDict[phone] = phoneQueuesDict[phone] || [];
      if (item._id.arn && !phoneQueuesDict[phone].some(queue => queue.arn === item._id.arn)) {
        phoneQueuesDict[phone].push({ arn: item._id.arn, name: item._id.name });
      }
    });

    this.phoneQueuesDict = phoneQueuesDict;
    console.log(phoneQueuesDict);
    this.populateVisibleQueues();
    this.populateQueuesFromConfig();
    if (this.visibleQueues.length > 0) {
      this.refreshCtrs();
    }
  }

  getMyPhones() {
    return Object.keys(this.phoneQueuesDict).filter(phone => this.phoneQueuesDict[phone].some(queue => this.visibleQueues.some(q => q.arn === queue.arn)));
  }

  getVisibleQueueNames() {
    return this.visibleQueues.map(q => q.name);
  }

  populateVisibleQueues() {
    const allQueues: any = Object.values(this.phoneQueuesDict).reduce((list: any, phoneQueues: any) => (list.push(...phoneQueues), list), []);
    console.log(allQueues);
    if (this._global.user.roles.some(r => r === "IVR_SALES_MANAGER")) {
      this.addToVisibleQueues(allQueues.filter(q => (q.name || "").startsWith("sales")));
    }
    if (this._global.user.roles.some(r => r === "IVR_GMB_MANAGER")) {
      this.addToVisibleQueues(allQueues.filter(q => (q.name || "").startsWith("outbound-gmb")));
    }
    if (this._global.user.roles.some(r => r === "IVR_OUTBOUND_MANAGER")) {
      this.addToVisibleQueues(allQueues.filter(q => (q.name || "").startsWith("outbound") && !(q.name || "").startsWith("outbound-gmb")));
    }
    if (this._global.user.roles.some(r => r === "IVR_CSR_MANAGER")) {
      this.addToVisibleQueues(allQueues.filter(q => !["sales", "outbound"].some(prefix => (q.name || "").startsWith(prefix))));
    }
  }

  addToVisibleQueues(queues) {
    queues.map(q => {
      if (!this.visibleQueues.some(queue => queue.arn === q.arn)) {
        this.visibleQueues.push(q);
      }
    });
  }

  populateQueuesFromConfig() {
    const config = this.getConfig();
    console.log(config);
    const ivrQueues = ((config.routingProfile || {}).queues || []).map(q => ({ arn: q.queueARN, name: q.name }));
    this.addToVisibleQueues(ivrQueues);
  }

  async refreshCtrs() {
    console.log("visible queues", this.visibleQueues.map(q => q.name));
    this.setIvrAgent();
    // get a list of phones I am interested and query ctrs by phone number!
    const interestedPhones = this.getMyPhones();
    console.log(interestedPhones);
    if (interestedPhones.length === 0) {
      return;
    }

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
    };

    const orQueries = [];
    const myQueues = {
      "SystemEndpoint.Address": { $in: interestedPhones.map(phone => "+1" + phone) },
      "Queue.ARN": { $in: this.visibleQueues.map(q => q.arn) }
    };
    orQueries.push(myQueues);

    const myCsrPhoneNumbers = Object.keys(this.phoneQueuesDict).filter(phone => this.phoneQueuesDict[phone].some(queue => (queue.name || "").startsWith("csr") && this.visibleQueues.some(q => q.arn === queue.arn)));

    if (myCsrPhoneNumbers.length > 0) {
      const otherCsrQueues = [];
      Object.values(this.phoneQueuesDict).map((queues: any) => queues.map(q => {
        if ((q.name || "").startsWith("csr") && !otherCsrQueues.some(qq => qq.name === q.name) && !this.visibleQueues.some(qq => qq.name === q.name)) {
          otherCsrQueues.push(q);
        }
      }));
      // to check if an abandoned call is handled by other csrs, we need other CSR's outbound call records:
      const otherCsrsOutboundCalls = {
        "SystemEndpoint.Address": { $in: myCsrPhoneNumbers.map(phone => "+1" + phone) },
        "InitiationMethod": "OUTBOUND",
        "Queue.ARN": { $in: otherCsrQueues.map(q => q.arn) }
      };

      orQueries.push(otherCsrsOutboundCalls);
      // we also need to take care of abandoned inbound calls that neither has a queue nor pickedup by any CSRs
      const allInboundCallsWithoutCsrQueue = {
        "SystemEndpoint.Address": { $in: myCsrPhoneNumbers.map(phone => "+1" + phone) },
        "InitiationMethod": { $ne: "OUTBOUND" },
        "Queue.ARN": { $nin: [...this.visibleQueues, ...otherCsrQueues].map(q => q.arn) } // need this for voice-mail etc
      }
      orQueries.push(allInboundCallsWithoutCsrQueue);

    }

    const ctrs = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "amazon-connect-ctr",
      query: {
        $or: orQueries
      },
      projection: projection,
      sort: {
        createdAt: -1
      },
      limit: 1000
    }).toPromise();

    ctrs.sort((c2, c1) => new Date(c1.InitiationTimestamp).valueOf() - new Date(c2.InitiationTimestamp).valueOf());

    const visibleCtrs = ctrs; //.filter(ctr => !ctr.Queue || this.visibleQueues.some(queue => queue.arn === ctr.Queue.ARN));
    const ivrRecords = visibleCtrs.map(ctr => IvrRecord.parse(ctr));

    const existingIds = this.ivrRecords.reduce((ids, ir) => (ids.add(ir.ctrId), ids), new Set());

    for (let ir of ivrRecords) {
      if (!existingIds.has(ir.ctrId)) {
        this.ivrRecords.unshift(ir);
      }
    }

    const relatedRts = await this._global.getCachedRestaurantListForPicker();
    // build return records and restaurants
    this.ivrRecords.map(ir => {
      ir.restaurants = [];
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
    this.populateQueuesForFilter();

    this.now = new Date();
    this.refreshing = false;

  }

  populateQueuesForFilter() {
    this.queuesForFilter.length = 0;
    this.ivrRecords.map(ir => {
      if (!this.queuesForFilter.some(queue => queue.name === ir.queueName && queue.arn === ir.queueArn)) {
        this.queuesForFilter.push({ name: ir.queueName, arn: ir.queueArn });
      }
    });
    this.queuesForFilter.sort((q1, q2) => q1.name > q2.name ? 1 : -1);
    this.queuesForFilter.unshift({ name: "queue..." });
  }

  startIvr() {
    this._connect.setEnabeld(true);
  }

  getConfig() {
    return this._connect.config || { username: 'N/A' } as any;
  }

  ngOnInit() {
    this.setIvrAgent();
    this.timer = setInterval(_ => {
      this.now = new Date();
      // refresh every 3 minutes
      if (!this.lastRefreshed || this.now.valueOf() - this.lastRefreshed.valueOf() > this.refreshDataInterval) {
        this.lastRefreshed = this.now; // preset to avoid being called multiple times (not finishing within each tick)
        this.refreshCtrs();
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

  setIvrAgent() {
    const config = this.getConfig();
    if (config.routingProfile) {
      this.ivrUsername = config.username;
    }
  }

  computeShouldCallback() {

    const succeeded = new Set();
    const numbersMarkedAsShouldCallback = new Set();

    this.ivrRecords.map(ir => {
      // succeeded: ALL outbounds, or (not voicemail queue && not voice agent and hasAgent)
      const isOutbound = !ir.inbound;
      const isVoiceQueue = (ir.queueName || "").toLowerCase().startsWith("voice");
      const isVoiceAgent = (ir.agentUsername || "").toLowerCase().startsWith("voice");

      if (isOutbound || !(isVoiceQueue || isVoiceAgent)) {
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
      }

    });
    console.log(succeeded);
    console.log(numbersMarkedAsShouldCallback);
  }

  filterQueue() {
    this.filter();
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

    if (this.selectedQueue && this.selectedQueue.arn) {
      this.filteredIvrRecords = this.filteredIvrRecords.filter(ir => ir.queueArn === this.selectedQueue.arn);
    }
  }
}
