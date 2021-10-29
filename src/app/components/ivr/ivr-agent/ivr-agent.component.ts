import { filter } from 'rxjs/operators';
import { AlertType } from './../../../classes/alert-type';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from "../../../../environments/environment";
import { GlobalService } from '../../../services/global.service';
import { AmazonConnectService } from 'src/app/services/amazon-connect.service';
import { IvrRecord } from 'src/app/classes/ivr/ivr-record';
import { TimezoneHelper } from '@qmenu/ui';

const defaultSelectedQueue = {
  name: 'all queues...'
};
const defaultSelectedAgent = 'all agent...';
const defaultSelectedLanguageCode = 'all language...';

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

  selectedQueue = defaultSelectedQueue;
  queuesForFilter = [];

  selectedAgent = defaultSelectedAgent;
  agentsForFilter = [];

  selectedLanguageCode = defaultSelectedLanguageCode;
  languageCodesForFilter = [];

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
      this.managerRoles = this.managerRoles.filter(role => this._global.user.roles.some(r => r === role));
      this.managerRoles.sort((a, b) => a.localeCompare(b));
      this.managerRole = this.managerRoles[0];
      this.adminViewMode = true;
    }
    this.populatePhoneQueues();
  }

  // The page won't load if an administrator has too many IVR roles selected, so we should load page by a single role.
  reloadIVRByManagerRoles() {
    this.ivrRecords = [];
    this.visibleQueues = [];
    // It suggests that user close the admin view mode switch, we should restore the IVR roles condition to the default value 
    if (!this.adminViewMode) {
      this.managerRole = this.managerRoles[0];
    }

    this.populateVisibleQueues();
    this.populateQueuesFromConfig();
    if (this.visibleQueues.length > 0) {
      this.refreshCtrs();
    }
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
    items.filter(item => item._id.phone).map(item => {
      const phone = item._id.phone.replace("+1", "");
      phoneQueuesDict[phone] = phoneQueuesDict[phone] || [];
      if (item._id.arn && !phoneQueuesDict[phone].some(queue => queue.arn === item._id.arn)) {
        phoneQueuesDict[phone].push({ arn: item._id.arn, name: item._id.name });
      }
    });

    this.phoneQueuesDict = phoneQueuesDict;
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

    if (this.isAdmin() && this.adminViewMode) {
      ["sales", "gmb", "internal", "csr"].forEach(mr => {
        if (this.managerRole.toLowerCase().indexOf(mr) !== -1 && mr !== 'csr') {
          this.addToVisibleQueues(allQueues.filter(q => (q.name || "").startsWith(mr)));
        } else if (this.managerRole.toLowerCase().indexOf(mr) !== -1 && mr === 'csr') {
          this.addToVisibleQueues(allQueues.filter(q => !["sales", "gmb", "internal"].some(prefix => (q.name || "").startsWith(prefix))));
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

  irTranscriptsExpanded = new Set();

  addToVisibleQueues(queues) {
    queues.map(q => {
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

    const orQueries = [];
    const myQueues = {
      "SystemEndpoint.Address": { $in: interestedPhones.map(phone => "+1" + phone) },
      "Queue.Name": { $in: this.visibleQueues.map(q => q.name) }
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
        // "InitiationMethod": "OUTBOUND",
        "Queue.Name": { $in: otherCsrQueues.map(q => q.name) }
      };

      orQueries.push(otherCsrsOutboundCalls);

      // we also need to take care of abandoned inbound calls that neither has a queue nor pickedup by any CSRs
      const allInboundCallsWithoutCsrQueue = {
        "SystemEndpoint.Address": { $in: myCsrPhoneNumbers.map(phone => "+1" + phone) },
        "InitiationMethod": { $ne: "OUTBOUND" },

        "Queue.Name": { $nin: [...this.visibleQueues, ...otherCsrQueues].map(q => q.name) } // need this for voice-mail etc
      }
      orQueries.push(allInboundCallsWithoutCsrQueue);

    }
    const query = {
      $or: orQueries
    } as any;
    // enable search IVR records by date
    if (this.showDateSearch) {
      if (!this.fromDate) {
        return this._global.publishAlert(AlertType.Danger, "Please input a correct time date format!");
      }
      this.ivrRecords = [];
      const utcf = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.fromDate + " 00:00:00.000"), 'America/New_York');
      const utct = TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(this.fromDate + " 23:59:59.999"), 'America/New_York');
      // query only one day's data, using EST Time
      query['$and'] = [{
        createdAt: {
          // 2021-10-18T00:00:00.000Z
          $gte: utcf.valueOf()
        }
      },
      {
        createdAt: {
          // 2021-10-18T23:59:59.999Z
          $lte: utct.valueOf()
        }
      }];
    }
    let ctrs;
    try {
      ctrs = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: "amazon-connect-ctr",
        query: query,
        projection: projection,
        sort: {
          createdAt: -1
        },
        limit: 1000
      }).toPromise();
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, `Current user has many IVR roles so that page can't load! Please use admin view mode.`);
    }

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
    this.populateAgentsForFilter();
    this.populateLanguageCodesForFilter();

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
    this.queuesForFilter.unshift(defaultSelectedQueue);
    this.selectedQueue = defaultSelectedQueue;
  }

  populateAgentsForFilter() {
    this.agentsForFilter = [...new Set(this.ivrRecords.map(ir => ir.agentUsername))];
    this.agentsForFilter.sort();
    this.agentsForFilter.unshift(defaultSelectedAgent);
    this.selectedAgent = defaultSelectedAgent;
  }

  populateLanguageCodesForFilter() {
    this.languageCodesForFilter = [...new Set(this.ivrRecords.map(ir => ir.languageCode))];
    this.languageCodesForFilter.unshift(defaultSelectedLanguageCode);
    this.selectedLanguageCode = defaultSelectedLanguageCode;
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

    if (this.selectedQueue.name !== defaultSelectedQueue.name) {
      this.filteredIvrRecords = this.filteredIvrRecords.filter(ir => ir.queueName === this.selectedQueue.name);
    }

    if (this.selectedAgent !== defaultSelectedAgent) {
      this.filteredIvrRecords = this.filteredIvrRecords.filter(ir => ir.agentUsername === this.selectedAgent);
    }

    if (this.selectedLanguageCode !== defaultSelectedLanguageCode) {
      this.filteredIvrRecords = this.filteredIvrRecords.filter(ir => ir.languageCode === this.selectedLanguageCode);
    }

    this.totalMinutes = Math.floor(this.filteredIvrRecords.reduce((sum, ir) => sum + (ir.duration || 0), 0) / 60);
  }
}