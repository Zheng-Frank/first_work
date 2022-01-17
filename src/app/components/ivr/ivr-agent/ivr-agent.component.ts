import { AlertType } from './../../../classes/alert-type';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AmazonConnectService } from 'src/app/services/amazon-connect.service';
import { IvrRecord } from 'src/app/classes/ivr/ivr-record';
import { TimezoneHelper } from '@qmenu/ui';

enum MangerRoleTypes {
  IVR_CSR_MANAGER = 'IVR_CSR_MANAGER',
  IVR_GMB_MANAGER = 'IVR_GMB_MANAGER',
  IVR_INTERNAL_MANAGER = 'IVR_INTERNAL_MANAGER',
  IVR_SALES_MANAGER = 'IVR_SALES_MANAGER'
}

@Component({
  selector: 'app-ivr-agent',
  templateUrl: './ivr-agent.component.html',
  styleUrls: ['./ivr-agent.component.css']
})
export class IvrAgentComponent implements OnInit, OnDestroy {

  totalMinutes = 0;
  phoneQueuesDict = {} as any;
  visibleQueues = [];

  defaultSelectedQueue = {name: 'all queues...', arn: ''};
  defaultSelectedAgent = 'all agent...';
  defaultSelectedLanguageCode = 'all language...';
  selectedQueue = this.defaultSelectedQueue;
  selectedAgent = this.defaultSelectedAgent;
  selectedLanguageCode = this.defaultSelectedLanguageCode;

  myPhoneNumbers = [];

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
  needRefreshCtrs = true;

  connectedContact;

  mp3VisitedIvrRecords = new Set();
  showDateSearch = false; // enable to search IVR record by date, if it's true
  fromDate;
  adminViewMode = false; // add a filter of user IVR manager roles, if current user is admin
  managerRoles = [MangerRoleTypes.IVR_CSR_MANAGER, MangerRoleTypes.IVR_GMB_MANAGER, MangerRoleTypes.IVR_INTERNAL_MANAGER, MangerRoleTypes.IVR_SALES_MANAGER];
  managerRole;

  languages = [];
  queues = [];
  queueAgentDict = {} as any;
  refreshing = false;
  irTranscriptsExpanded = new Set();

  constructor(private _api: ApiService, private _global: GlobalService, private _connect: AmazonConnectService) {

    this._connect.onContactConnected.subscribe(contact => {
      this.connectedContact = contact;
    });
    this._connect.onContactEnded.subscribe(contact => {
      this.connectedContact = undefined;
    });
    this._connect.onEnabled.subscribe(enabled => { });
    this._connect.onConfigurationChanged.subscribe(config => {
      this.populateQueuesFromConfig();
      if (this.visibleQueues.length > 0) {
        this.refreshCtrs();
      }
    });
    // Current user may not have all IVR manager permissions, even if he is an admin.
    if (this.isAdmin()) {
      // this.managerRoles = this.managerRoles.filter(role => this._global.user.roles.some(r => r === role));
      this.managerRoles.sort((a, b) => a.localeCompare(b));
      this.managerRole = this.managerRoles[0];
      this.adminViewMode = true;
    }
    console.log(this.isAdmin(), this.managerRoles, this.managerRole, this.adminViewMode)
    this.populateFilters();
  }

  // The page won't load if an administrator has too many IVR roles selected, so we should load page by a single role.
  reloadIVRByManagerRoles() {
    this.ivrRecords = [];
    this.visibleQueues = [];
    // It suggests that user close the admin view mode switch, we should restore the IVR roles condition to the default value
    if (!this.adminViewMode) {
      this.managerRole = this.managerRoles[0];
    }
    this.selectedQueue = this.defaultSelectedQueue;
    this.selectedAgent = this.defaultSelectedAgent;
    this.populateVisibleQueues();
    this.populateQueuesFromConfig();
    if (this.visibleQueues.length > 0) {
      this.refreshCtrs();
    }
  }

  async populateFilters() {
    const items = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: "amazon-connect-ctr",
      aggregate:
        [
          {
            $group: { _id: {
                agent: "$Agent.Username", lang: "$Attributes.languageCode",
                queueArn: '$Queue.ARN', queueName: '$Queue.Name', phone: "$SystemEndpoint.Address"
            } } // _id is a composite key!
          }
        ]
    }).toPromise();

    let langs = new Set(), phoneQueueDict = {}, queueAgentDict = {}, queues = new Set();
    items.forEach(({_id: {agent, lang, queueArn, queueName, phone}}) => {
      langs.add(lang);
      let queueKey = queueName + "|" + queueArn;
      queues.add(queueKey);
      queueAgentDict[queueKey] = queueAgentDict[queueKey] || []
      if (agent && !queueAgentDict[queueKey].includes(agent)) {
        queueAgentDict[queueKey].push(agent);
      }
      if (phone) {
        phone = phone.replace("+1", "");
      }
      // establish phone number <--> queue relationship!
      phoneQueueDict[phone] = phoneQueueDict[phone] || [];
      if (queueArn && !phoneQueueDict[phone].some(queue => queue.arn === queueArn)) {
        phoneQueueDict[phone].push({ arn: queueArn, name: queueName });
      }
    })
    this.languages = [...langs];
    this.queues = [...queues].map(x => {
      let[name, arn] = x.split("|");
      return { arn, name };
    })
    this.queueAgentDict = queueAgentDict;
    this.phoneQueuesDict = phoneQueueDict;
    this.populateVisibleQueues();
    this.populateQueuesFromConfig();
    if (this.visibleQueues.length > 0) {
      this.refreshCtrs();
    }
  }

  getQueues() {
    if (!this.managerRole) {
      return [];
    }
    let role = this.managerRole.split("_")[1].toLowerCase();
    if (["sales", "gmb", "internal"].includes(role)) {
      return this.queues.filter(({name}) => (name || "").startsWith(role));
    }
    return this.queues.filter(({name}) => !["sales", "gmb", "internal"].some(x => (name || "").startsWith(x)));
  }

  getAgents() {
    if (this.selectedQueue === this.defaultSelectedQueue) {
      return [];
    }
    let { name, arn } = this.selectedQueue;
    return this.queueAgentDict[name + "|" + arn] || [];
  }

  getMyPhones() {
    return Object.keys(this.phoneQueuesDict).filter(phone => this.phoneQueuesDict[phone].some(queue => this.visibleQueues.some(q => q.arn === queue.arn)));
  }

  getVisibleQueueNames() {
    return this.visibleQueues.map(q => q.name);
  }

  populateVisibleQueues() {
    const allQueues: any = Object.values(this.phoneQueuesDict).reduce((list: any, phoneQueues: any) => (list.push(...phoneQueues), list), []);

    if (this.isAdmin() && this.adminViewMode) {
      ["sales", "gmb", "internal", "csr"].forEach(mr => {
        if (this.managerRole) {
          if (this.managerRole.toLowerCase().indexOf(mr) !== -1 && mr !== 'csr') {
            this.addToVisibleQueues(allQueues.filter(q => (q.name || "").startsWith(mr)));
          } else if (this.managerRole.toLowerCase().indexOf(mr) !== -1 && mr === 'csr') {
            this.addToVisibleQueues(allQueues.filter(q => !["sales", "gmb", "internal"].some(prefix => (q.name || "").startsWith(prefix))));
          }
        }
      });
    } else { // Load page normally, if user isn't administrator.
      ["sales", "gmb", "internal"].map(managerRole => {
        if (this._global.user.roles.some(r => r === `IVR_${managerRole.toUpperCase()}_MANAGER`)) {
          this.addToVisibleQueues(allQueues.filter(q => (q.name || "").startsWith(managerRole)));
        }
      });

      // CSR manager takes care of ALL other queues
      if (this._global.user.roles.some(r => r === "IVR_CSR_MANAGER")) {
        this.addToVisibleQueues(allQueues.filter(q => !["sales", "gmb", "internal"].some(prefix => (q.name || "").startsWith(prefix))));
      }
    }
  }

  addToVisibleQueues(queues) {
    queues.forEach(q => {
      if (!this.visibleQueues.some(queue => queue.arn === q.arn)) {
        this.visibleQueues.push(q);
      }
    });
  }

  populateQueuesFromConfig() {
    const config = this.getConfig();
    const ivrQueues = ((config.routingProfile || {}).queues || []).map(q => ({ arn: q.queueARN, name: q.name }));
    this.addToVisibleQueues(ivrQueues);
  }

  // we should set auto refresh disabled and hide Launch qMenu IVR and reload button
  toggleShowDateSearch() {
    this.showDateSearch = !this.showDateSearch;
    if (this.showDateSearch) {
      this.needRefreshCtrs = false;
      this.fromDate = '';
    } else {
      this.ivrRecords = [];
      this.needRefreshCtrs = true;
      this.refreshCtrs();
    }
  }

  isAdmin() {
    return this._global.user.roles.some(r => r === 'ADMIN');
  }

  async refreshCtrs() {
    this.setIvrAgent();
    // get a list of phones I am interested and query ctrs by phone number!
    const interestedPhones = this.getMyPhones();
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
      "Attributes.languageCode": 1,
      "Attributes.voicemail.recordingUri": 1, //
      "Attributes.voicemail.transcript.transcripts": 1 // array
    };
    let ctrs;
    try {
      if (this.showDateSearch && this.fromDate) {
        ctrs = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
          resource: "amazon-connect-ctr",
          query: this.getQuery(),
          projection: projection,
          sort: {createdAt: -1},
        }, 10000);
      } else {
        ctrs = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: "amazon-connect-ctr",
          query: this.getQuery(),
          projection: projection,
          sort: {createdAt: -1},
          limit: 1000
        }).toPromise();
      }
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, `Current user has many IVR roles so that page can't load! Please use admin view mode.`);
    }

    ctrs.sort((c2, c1) => new Date(c1.InitiationTimestamp).valueOf() - new Date(c2.InitiationTimestamp).valueOf());
    this.ivrRecords = ctrs.map(ctr => IvrRecord.parse(ctr)); // .filter(ctr => !ctr.Queue || this.visibleQueues.some(queue => queue.arn === ctr.Queue.ARN));

    const relatedRts = await this._global.getCachedRestaurantListForPicker();
    // build return records and restaurants
    this.ivrRecords.forEach(ir => {
      ir.restaurants = [];
      relatedRts.forEach(rt => {
        if ((rt.channels || []).some(c => c.value === ir.customerEndpoint)) {
          ir.restaurants.push(rt);
        }
      });
    });

    this.ivrRecords.sort((i2, i1) => i1.initiatedAt.valueOf() - i2.initiatedAt.valueOf());
    this.lastRefreshed = new Date();
    this.computeShouldCallback();
    this.filter();
    this.now = new Date();
    this.refreshing = false;
  }

  getQuery() {
    const interestedPhones = this.getMyPhones();
    const query = {
      $or: [
        {
          "SystemEndpoint.Address": { $in: interestedPhones.map(phone => "+1" + phone) },
          "Queue.Name": { $in: this.visibleQueues.map(q => q.name) }
        }
      ]
    } as any;
    const otherCsrQueues = [], myCsrPhoneNumbers = [];
    Object.entries(this.phoneQueuesDict).forEach(([phone, queues]: [string, any[]]) => {
      if (queues.some(queue => (queue.name || "").startsWith("csr") && this.visibleQueues.some(q => q.arn === queue.arn))) {
        myCsrPhoneNumbers.push(phone)
      }
      queues.forEach(q => {
        if ((q.name || "").startsWith("csr") && !otherCsrQueues.some(qq => qq.name === q.name) && !this.visibleQueues.some(qq => qq.name === q.name)) {
          otherCsrQueues.push(q);
        }
      });
    });

    if (myCsrPhoneNumbers.length > 0) {
      // to check if an abandoned call is handled by other csrs, we need other CSR's outbound call records:
      const otherCsrsOutboundCalls = {
        "SystemEndpoint.Address": { $in: myCsrPhoneNumbers.map(phone => "+1" + phone) },
        // "InitiationMethod": "OUTBOUND",
        "Queue.Name": { $in: otherCsrQueues.map(q => q.name) }
      };

      query["$or"].push(otherCsrsOutboundCalls);

      // we also need to take care of abandoned inbound calls that neither has a queue nor pickedup by any CSRs
      const allInboundCallsWithoutCsrQueue = {
        "SystemEndpoint.Address": { $in: myCsrPhoneNumbers.map(phone => "+1" + phone) },
        "InitiationMethod": { $ne: "OUTBOUND" },
        "Queue.Name": { $nin: [...this.visibleQueues, ...otherCsrQueues].map(q => q.name) } // need this for voice-mail etc
      }
      query["$or"].push(allInboundCallsWithoutCsrQueue);

    }

    let andQuery = [];
    // enable search IVR records by date
    if (this.showDateSearch) {
      if (!this.fromDate) {
        return this._global.publishAlert(AlertType.Danger, "Please input a correct time date format!");
      }
      const utcf = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.fromDate + " 00:00:00.000"), 'America/New_York');
      const utct = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.fromDate + " 23:59:59.999"), 'America/New_York');
      // query only one day's data, using EST Time
      andQuery.push({createdAt: {$gte: utcf.valueOf()}}, {createdAt: {$lte: utct.valueOf()}})
    }

    if (this.selectedQueue.name !== this.defaultSelectedQueue.name) {
      andQuery.push({"Queue.Name": this.selectedQueue.name});
    }

    if (this.selectedAgent !== this.defaultSelectedAgent) {
      andQuery.push({"Agent.Username": this.selectedAgent});
    }

    if (this.selectedLanguageCode !== this.defaultSelectedLanguageCode) {
      andQuery.push({"Attributes.languageCode": this.selectedLanguageCode});
    }
    if (andQuery.length > 0) {
      query["$and"] = andQuery;
    }
    return query;
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
      if (this.needRefreshCtrs) { // to control whether auto refresh IVR.
        this.now = new Date();
        // refresh every 3 minutes
        if (!this.lastRefreshed || this.now.valueOf() - this.lastRefreshed.valueOf() > this.refreshDataInterval) {
          this.lastRefreshed = this.now; // preset to avoid being called multiple times (not finishing within each tick)
          this.refreshCtrs();
        }
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

  filter() {
    this.filteredIvrRecords = this.ivrRecords;
    if (this.shouldCallbackOnly) {
      this.filteredIvrRecords = this.filteredIvrRecords.filter(ir => ir.shouldCallback);
    }
    if ((this.searchFilter || '').trim().length > 0) {
      // try using phone number:
      const text = this.searchFilter.trim().replace("+1", "");
      const digits = text.replace(/\D/g, '');
      const byPhone = (ir: IvrRecord) => (ir.customerEndpoint || '').indexOf(digits) >= 0;
      const byRtNameOrId = (ir: IvrRecord) => (ir.restaurants || []).some(rt => rt.name.toLowerCase().indexOf(text.toLowerCase()) >= 0 || rt._id.indexOf(text) >= 0);
      this.filteredIvrRecords = this.filteredIvrRecords.filter(ir => (digits.length > 0 && byPhone(ir)) || byRtNameOrId(ir));
    }
    this.totalMinutes = Math.floor(this.filteredIvrRecords.reduce((sum, ir) => sum + (ir.duration || 0), 0) / 60);
  }
}
