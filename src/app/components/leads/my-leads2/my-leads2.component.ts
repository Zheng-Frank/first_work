import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { LeadFunnel } from 'src/app/classes/lead-funnel';
import { RawLead } from 'src/app/classes/raw-lead';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { AlertType } from 'src/app/classes/alert-type';
@Component({
  selector: 'app-my-leads2',
  templateUrl: './my-leads2.component.html',
  styleUrls: ['./my-leads2.component.css']
})
export class MyLeads2Component implements OnInit, OnDestroy {

  @ViewChild("leadModal") leadModal: ModalComponent;

  ONGOING_LEADS_QUOTA = 1500;
  TAKE_BATCH_SIZE = 20; // each time, auto take how many randomly?

  bareLeadProjection = [
    'name',
    'address',
    'city',
    'state',
    'zipcode',
    'campaigns.scheduledAt',
    'campaigns.result',
    'campaigns.logs',
    'campaigns.funnel.name',
    'googleListing.gmbOwner',
    'googleListing.place_id',
    'qmenuDensity',
    'restaurant._id',
    'restaurant.createdAt',
    'phone',
    'createdAt'
  ];

  moreLeadProjection = [
    'phone'
  ];

  // NOTE: NOT SUPPER ACCURATE! one state could have multiple timezones. this is an approximation
  stateTzMap = {
    PDT: ['WA', 'OR', 'CA', 'NV', 'AZ'],
    MDT: ['MT', 'ID', 'WY', 'UT', 'CO', 'NM'],
    CDT: ['ND', 'SD', 'MN', 'IA', 'NE', 'KS',
      'OK', 'TX', 'LA', 'AR', 'MS', 'AL', 'TN', 'MO', 'IL', 'WI'],
    EDT: ['MI', 'IN', 'KY', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV',
      'OH', 'PA', 'NY', 'VT', 'NH', 'ME', 'MA', 'RJ', 'CT',
      'NJ', 'DE', 'MD', 'DC', 'RI'],
    HST: ['HI'],
    AKDT: ['AK']
  };

  now = new Date();
  username;
  isAdmin = false;
  usernames = [];

  action;
  publishedFunnels: LeadFunnel[] = [];

  myLeads: RawLead[] = [];
  ongoingTab = { label: 'Ongoing', rows: [], filter: 'All' };
  succeededTab = { label: 'In qMenu', rows: [], filter: 'All' };
  activeTab = this.ongoingTab;
  tabs = [this.ongoingTab, this.succeededTab];

  selectedLead;

  myColumnDescriptors = [
    {
      label: "Due",
      paths: ['scheduledAt'],
      sort: (a, b) => new Date(a || 0) > new Date(b || 0) ? 1 : -1,
    },
    {
      label: "Lead",
      paths: ['lead', 'name'],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
    },
    {
      label: 'Timezone',
      paths: ['timezone'],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
    },
    {
      label: 'GMB',
      paths: ['lead', 'googleListing', 'gmbOwner'],
    },
    {
      label: 'Funnel',
    },
    {
      label: "Call Logs"
    },
    {
      label: "Actions"
    },
  ];

  copiedText;
  timer;
  constructor(private _global: GlobalService, private _api: ApiService) {
    this.username = _global.user.username;
    this.isAdmin = _global.user.roles.some(r => r === 'ADMIN');
    if (this.isAdmin) {
      this.loadUsernames();
    }
    this.loadLeads();

    // let's update value of now every minute because the sales agent will work with the list for long time!
    this.timer = setInterval(() => this.now = new Date(), 60000);
    // clean up scheduledAt === createdAt
    this.cleanup();
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  getTimezoneKeys() {
    return ['All', ...Object.keys(this.stateTzMap)];
  }

  // TEMP function and scripts to clean up. Should be removed once the code base is stable
  async cleanup() {
    // const allAssigned = await this._api
    //   .post(environment.appApiUrl + "smart-restaurant/api", {
    //     method: 'get',
    //     resource: 'raw-lead',
    //     query: { 'campaigns.createdAt': { $ne: null } },
    //     payload: {
    //       'campains.assignee': 1,
    //       'campaigns.createdAt': 1,
    //       'campaigns.scheduledAt': 1,
    //     },
    //     limit: 200000
    //   })
    //   .toPromise();

    // console.log(allAssigned);
    // const unsetList = {};
    // allAssigned.map(lead => lead.campaigns.map((c, index) => {
    //   if (c.createdAt && c.createdAt === c.scheduledAt) {
    //     const key = `campaigns.${index}.scheduledAt`;
    //     unsetList[key] = unsetList[key] || [];
    //     unsetList[key].push(lead);
    //   }
    // }));
    // console.log(unsetList);

    // Object.keys(unsetList).map(async key => {
    //   const ids = unsetList[key].map(lead => ({ $oid: lead._id }));
    //   console.log(ids);
    //   await this._api
    //     .post(environment.appApiUrl + "smart-restaurant/api", {
    //       method: 'unset',
    //       resource: 'raw-lead',
    //       query: { '_id': { $in: ids } },
    //       payload: {
    //         [key]: ''
    //       },
    //     })
    //     .toPromise();
    // });
  }

  async copyToClipboard(text) {
    this.copiedText = '';
    // wait a very short moment to cause a flickering of UI so that user knows something happened
    await new Promise(resolve => setTimeout(resolve, 100));
    const handleCopy = (e: ClipboardEvent) => {
      // clipboardData 可能是 null
      e.clipboardData && e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      // removeEventListener 要传入第二个参数
      document.removeEventListener('copy', handleCopy);
      this.copiedText = text;
    };
    document.addEventListener('copy', handleCopy);
    document.execCommand('copy');
  }

  showDetails(lead) {
    this.selectedLead = lead;
    this.leadModal.show();
  }

  // mutate existng lead with more details
  async fufilMoreLeadDetails(lead) {

    const [detailedLead] = await this._api
      .post(environment.appApiUrl + "smart-restaurant/api", {
        method: 'get',
        resource: 'raw-lead',
        query: { _id: { $oid: lead._id } },
        payload: this.moreLeadProjection.reduce((obj, field) => (obj[field] = 1, obj), {}),
        limit: 1
      })
      .toPromise();
    Object.assign(lead, detailedLead);
  }

  getQ(lead: RawLead) {
    return encodeURIComponent([lead.name, lead.address, lead.city, lead.state].join(', '))
  }

  async releaseUntouched() {

    // user's
    // remove entire campaign
    const untouchedLeads = this.myLeads.filter(lead => {
      const campaign = lead.campaigns[0];
      // untouched: no scheduledAt, no call logs, has funnel
      const untouched = !campaign.scheduledAt && (campaign.logs || []).length === 0 && campaign.funnel;
      return untouched;
    });

    if (untouchedLeads.length > 0) {
      const ids = untouchedLeads.map(lead => ({ $oid: lead._id }));

      // remove the very first useless campaign all together
      await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: 'pop',
          resource: 'raw-lead',
          query: { '_id': { $in: ids } },
          payload: {
            campaigns: -1,
          },
        })
        .toPromise();

      // reset assignee and assignedAt
      await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: 'unset',
          resource: 'raw-lead',
          query: { '_id': { $in: ids } },
          payload: {
            assignee: '',
            assignedAt: ''
          },
        })
        .toPromise();
      // refresh again
      this.loadLeads();
    }

    this.action = null;
  }

  async assign(funnel) {

    // my un-success leads shouldn't be over the quota
    if (this.myLeads.filter(l => !l.restaurant).length > this.ONGOING_LEADS_QUOTA) {
      return alert(`QUOTA (${this.ONGOING_LEADS_QUOTA}) EXCEEDED. PLEASE RELEASE SOME FIRST BEFORE CLAIMING NEW ONES.\n已经超过最多限制了(${this.ONGOING_LEADS_QUOTA})，请先释放一些销售目标然后再获取新的销售目标。`)
    }

    // get random sample IDs (however mongo might have duplicates, so make the sample larger!)
    const $match = { assignee: null };
    funnel.filters.reduce((m, filter) => (m[filter.field] = {
      [filter.operator]: filter.value
    }, m), $match);

    const sampleRows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'raw-lead',
      aggregate: [
        { $match },
        { $sample: { size: 2 * this.TAKE_BATCH_SIZE } },
        {
          $project: {
            _id: 1, // exclude hours and everything else are returned
          }
        },
      ]
    }).toPromise();
    // get unique N
    const ids = [...new Set(sampleRows.map(r => r._id))].slice(0, this.TAKE_BATCH_SIZE).map(id => ({ $oid: id }));
    if (ids.length > 0) {
      await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: 'set',
          resource: 'raw-lead',
          query: {
            _id: { $in: ids },
          },
          payload: {
            assignee: this.username,
            assignedAt: { $date: new Date() },
          }
        })
        .toPromise();
      // push a new campaign to the beginning!
      const campaign = {
        type: 'CALL',
        username: this.username,
        createdAt: { $date: new Date() },
        // scheduledAt: { $date: new Date() }, commented because this will make everything due and cluter user
        funnel,
        logs: []
      }
      await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: 'unshift',
          resource: 'raw-lead',
          query: {
            _id: { $in: ids },
          },
          payload: {
            campaigns: campaign
          }
        })
        .toPromise();

      this.loadLeads();
    } else {
      this._global.publishAlert(AlertType.Info, 'No leads found');
    }

    this.action = null;
  }

  toggleAction(action) {
    // always toggle
    this.action = this.action === action ? null : action;
    if (this.action === 'REPLENISH') {
      this.loadPublishedFunnels();
    }
  }

  async loadPublishedFunnels() {
    const funnels = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'lead-funnel',
      query: { published: true },
      limit: 100000
    }).toPromise();
    // convert to LeadFunnel class
    this.publishedFunnels = funnels.map(f => new LeadFunnel(f));
  }

  setActiveTab(tab) {
    this.activeTab = tab;
  }

  changeUser() {
    this.loadLeads();
  }

  async loadUsernames() {
    const users = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'user',
      query: {},
      projection: { username: 1 },
      limit: 10000000,
      sort: { username: 1 }
    }).toPromise();
    this.usernames = users.map(u => u.username);
  }

  async release(lead: RawLead) {
    if (confirm('Remove lead from your list (确信释放)?')) {
      // 1. remove assignee and assignedAt!
      await this._api
        .post(environment.appApiUrl + "smart-restaurant/api", {
          method: 'unset',
          resource: 'raw-lead',
          query: {
            _id: { $oid: lead._id },
          },
          payload: {
            assignee: '',
            assignedAt: ''
          }
        })
        .toPromise();
      // 2. remove from current dataset!
      this.tabs.map(tab => tab.rows = tab.rows.filter(r => r.lead !== lead));
    }
  }

  async loadLeads() {
    const allRawLeads = await this._api
      .post(environment.appApiUrl + "smart-restaurant/api", {
        method: 'get',
        resource: 'raw-lead',
        query: { assignee: this.username },
        payload: this.bareLeadProjection.reduce((obj, field) => (obj[field] = 1, obj), {}),
        limit: 10000000
      })
      .toPromise();

    this.myLeads = allRawLeads.map(lead => new RawLead(lead));

    this.fillTabs();

  }

  fillTabs() {
    this.ongoingTab.rows = this.myLeads.filter(lead => !lead.restaurant).map(lead => ({
      lead,
      localTime: this.getTimeZoneTime(lead.state),
      timezone: this.guessTimezone(lead.state),
    })).filter(lead => this.activeTab.filter === 'All' ? true : this.activeTab.filter === lead.timezone).sort((r1, r2) => new Date(r1.lead.campaigns[0].scheduledAt || this.now).valueOf() - new Date(r2.lead.campaigns[0].scheduledAt || this.now).valueOf());

    this.succeededTab.rows = this.myLeads.filter(lead => lead.restaurant).map(lead => ({
      lead,
      localTime: this.getTimeZoneTime(lead.state)
    })).filter(lead => this.activeTab.filter === 'All' ? true : this.activeTab.filter === lead.localTime ).sort();

  }

  getScheduledAtStatusClass(lead) {
    const scheduledAt = lead.campaigns.map(c => c.scheduledAt)[0] || Date.now();
    const day = 24 * 3600 * 1000;
    const diff = new Date().valueOf() - (new Date(scheduledAt)).valueOf();
    if (diff > day) {
      return 'danger';
    }
    if (diff > 0) {
      return 'warning';
    }
    if (diff > -1 * day) {
      return 'info';
    }
    return 'success';
  }

  private guessTimezone(state) {
    const tz = Object.keys(this.stateTzMap).find(k => this.stateTzMap[k].indexOf(state) >= 0);
    return tz;
  }

  private getTimeZoneTime(state) {
    const tz = this.guessTimezone(state);
    const tzMap = {
      PDT: 'America/Los_Angeles',
      MDT: 'America/Denver',
      CDT: 'America/Chicago',
      EDT: 'America/New_York',
      HST: 'Pacific/Honolulu',
      AKDT: 'America/Anchorage',
    };
    const timezone = tzMap[tz];
    return new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
  }

  translateTimezone(tz) {
    const tzMap = {
      PDT: '西部时间',
      MDT: '山地时间',
      CDT: '中部时间',
      EDT: '东部时间',
      HST: '夏威夷时间',
      AKDT: '阿拉斯加时间',
    };
    return tzMap[tz];
  }

}
