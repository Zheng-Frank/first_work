import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { GlobalService } from '../../../services/global.service';
import { Helper } from '../../../classes/helper';
import { AlertType } from '../../../classes/alert-type';
import { Log } from '../../../classes/log';
import { PrunedPatchService } from '../../../services/prunedPatch.service';

enum AgreementSentModes {
  Sent = 'Agreement Sent',
  NotSent = 'Agreement Not Sent'
}

enum GmbOwnerModes {
  Unset = 'GMB owner?',
  Qmenu = 'qmenu',
  Cmo = 'chinesemenuonline',
  NotQm = 'Not Qmenu',
  NotCmo = 'Not CMO',
  NotQmOrCmo = 'Not QM or CMO',
}

enum HasLogsModes {
  Has = 'Has log',
  No = 'No logs'
}

enum GmbChangeModes {
  RecentLost = 'Recent lost',
  UnderAttack = 'Under Attack'
}

enum HasAttachmentModes {
  Has = 'Has attachment',
  No = 'No attachment'
}

const alphabet = (a, b) => (a || '').localeCompare(b || '');
const bool_numeric = (a, b) => Number(!!a) - Number(!!b);

@Component({
  selector: 'app-monitoring-rts-without-agreement',
  templateUrl: './monitoring-rts-without-agreement.component.html',
  styleUrls: ['./monitoring-rts-without-agreement.component.css']
})
export class MonitoringRtsWithoutAgreementComponent implements OnInit {
  @ViewChild('logEditingModal') logEditingModal;
  @ViewChild('previewModal') previewModal;
  restaurants = [];
  jobs = [];
  list = [];
  fixedProviders = ['qmenu', 'beyondmenu', 'chinesemenuonline'];
  providers = [];
  showAllProviders = false;
  restaurantsColumnDescriptors = [
    { label: '#' },
    { label: 'Restaurant', paths: ['name'], sort: alphabet },
    { label: 'Agent', paths: ['agent'], sort: alphabet },
    { label: 'Salesperson', paths: ['salesperson'], sort: alphabet },
    { label: 'Timezone', paths: ['timezoneOffset'], sort: (a, b) => Number(a) - Number(b) },
    {
      label: 'CreatedAt',
      paths: ['createdAt'],
      sort: (a, b) => new Date(a || 0).valueOf() - new Date(b || 0).valueOf()
    },
    { label: 'GMB ownership', paths: ['gmbOwner'], sort: alphabet },
    { label: 'Agreement', paths: ['agreementSent'], sort: bool_numeric },
    { label: 'Other attch.', paths: ['otherAttachments'], sort: bool_numeric },
    { label: 'Logs', paths: ['logs'], sort: bool_numeric }
  ];
  filters = {
    createdAfter: '',
    salesperson: '',
    agreementSent: '',
    gmbOwner: GmbOwnerModes.Unset,
    hasLogs: '',
    gmbChanges: '',
    agent: '',
    hasAttachment: '',
    checkedProviders: []
  };
  agents = [];
  salesPeople = [];
  gmbOwners = [];
  recentLostCids = new Set();
  underAttackingCids = new Set();
  logInEditing: Log = new Log({ type: 'online-agreement', time: new Date() });
  restaurant;
  attachment;

  constructor(private _api: ApiService, private _global: GlobalService, private _prunedPatch: PrunedPatchService) {
  }

  async ngOnInit() {
    await this.query();
  }

  dropdowns(key) {
    return Object.values({
      agreementSent: AgreementSentModes,
      gmbOwner: GmbOwnerModes,
      hasLogs: HasLogsModes,
      gmbChanges: GmbChangeModes,
      hasAttachment: HasAttachmentModes
    }[key]);
  }

  checkProvider(e, provider) {
    if (e.target.checked) {
      this.filters.checkedProviders.push(provider);
    } else {
      this.filters.checkedProviders = this.filters.checkedProviders.filter(x => x !== provider);
    }
    this.filterRTs();
  }

  providerChecked(provider) {
    return this.filters.checkedProviders.includes(provider);
  }

  async query() {
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      aggregate: [
        { $match: { disabled: { $ne: true } } },
        {
          $project: {
            name: 1,
            'otherAttachments.url': 1,
            'otherAttachments.description': 1,
            'googleListing.cid': 1,
            'googleAddress.timezone': 1,
            'rateSchedules': 1,
            logs: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: { $eq: ['$$log.type', 'online-agreement'] },
              }
            },
            channels: {
              $map: {
                input: {
                  $filter: {
                    input: '$channels',
                    as: 'ch',
                    cond: {
                      $or: [
                        { $eq: ['$$ch.type', 'SMS'] },
                        { $eq: ['$$ch.type', 'Email'] },
                      ]
                    }
                  }
                },
                as: 'item',
                in: { $trim: { input: '$$item.value' } }
              }
            },
            createdAt: 1,
            providers: {
              '$ifNull': [
                {
                  $filter: {
                    input: {
                      $map: {
                        input: '$providers',
                        as: 'item',
                        in: '$$item.name'
                      }
                    },
                    as: 'item',
                    cond: { $ne: ['$$item', null] }
                  }
                },
                []
              ]
            },
            gmbOwner: {
              $ifNull: [{ $arrayElemAt: ['$gmbOwnerHistory.gmbOwner', 0] }, '']
            },
          }
        }
      ]
    }, 8000);
    this.restaurants.forEach(r => {
      r.createdAt = new Date(r.createdAt);
    });
    this.restaurants.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());
    this.jobs = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'job',
      aggregate: [
        {
          $match: {
            'name': { $eq: 'send-email' },
            '$or': [
              {
                'params.subject': { $eq: 'qMenu Online Service Agreement' }
              },
              {
                'params.subject': { $eq: 'qMenu Online Service Agreement (Eng)' }
              },
              {
                'params.subject': { $eq: 'qMenu Online Service Agreement (中文)' }
              }
            ]
          }
        },
        { $project: { 'paramsTo': '$params.to', createdAt: 1 } }
      ],
      limit: 100000
    }).toPromise();
    if (!this.filters.createdAfter) {
      this.filters.createdAfter = this.restaurants[this.restaurants.length - 1].createdAt.toISOString().split('T')[0];
    }
    await this.gmbQuery();
    await this.prepare();
  }

  async gmbQuery() {
    const gmbRecentLostStart = new Date();
    gmbRecentLostStart.setDate(gmbRecentLostStart.getDate() - 30);

    // Getting data from tables
    const events = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        name: 'gmb-lost',
        'params.cid': { $exists: true },
        createdAt: { $gte: gmbRecentLostStart.valueOf() }
      },
      projection: { _id: 1, 'params.cid': 1, createdAt: 1 }
    }, 10000);


    const gmbUnderAttackStart = new Date();
    gmbUnderAttackStart.setDate(gmbUnderAttackStart.getDate() - 45);

    // Get Attacking Requests
    const requests = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbRequest',
      query: {
        isReminder: false,
        date: { $gte: { $date: gmbUnderAttackStart } },
        handledDate: { $exists: false }
      },
      projection: { cid: 1, email: 1 },
    }, 10000);

    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        _id: 0,
        email: 1,
        'locations.cid': 1,
        'locations.status': 1,
        'locations.role': 1
      },
    }, 6000);

    const ownGMBSet = new Set();
    gmbAccounts.forEach(account => (account.locations || []).forEach(loc => {
      if (loc.cid && loc.status === 'Published' && ['PRIMARY_OWNER', 'OWNER', 'CO_OWNER', 'MANAGER'].indexOf(loc.role) >= 0) {
        ownGMBSet.add(loc.cid);
      }
    }));
    this.recentLostCids = new Set(events.filter(event => !ownGMBSet.has(event.params.cid)).map(e => e.params.cid));
    const myEmailSet = new Set(gmbAccounts.map(a => a.email));
    this.underAttackingCids = new Set(requests.filter(req => !myEmailSet.has(req.email) && ownGMBSet.has(req.cid)).map(req => req.cid));
  }

  async prepare() {
    const users = await this._global.getCachedUserList();
    this.agents = [];
    this.salesPeople = [];
    this.gmbOwners = [];
    this.providers = [];
    this.restaurants.forEach((rt) => {
      rt.createdAt = new Date(rt.createdAt);
      rt.salesperson = Helper.getSalesAgent(rt.rateSchedules, users);
      if (rt.salesperson === 'N/A') {
        rt.salesperson = '';
      }
      if (rt.googleListing) {
        rt.gmbRecentLost = this.recentLostCids.has(rt.googleListing.cid);
        rt.gmbUnderAttack = this.underAttackingCids.has(rt.googleListing.cid);
      }
      if (rt.salesperson && !this.salesPeople.includes(rt.salesperson)) {
        this.salesPeople.push(rt.salesperson);
      }
      rt.logs = (rt.logs || []).sort((b, a) => new Date(a.time).valueOf() - new Date(b.time).valueOf());
      rt.agent = rt.logs.length ? rt.logs[0].username : '';
      if (rt.agent && !this.agents.includes(rt.agent)) {
        this.agents.push(rt.agent);
      }
      rt.timezoneOffset = Helper.getOffsetNumToEST(rt.googleAddress.timezone);
      let job = this.jobs.find(x => (rt.channels || []).includes(x.paramsTo.trim()));
      if (job) {
        rt.sent = true;
        rt.agreementSentAt = new Date(job.createdAt);
        rt.sentDays = Number(((rt.agreementSentAt.valueOf() - rt.createdAt.valueOf()) / (24 * 3600 * 1000)).toFixed(0));
      }
      // add gmbOwner to gmbOwners filter
      if (!['qmenu', 'chinesemenuonline'].includes(rt.gmbOwner) && !this.gmbOwners.includes(rt.gmbOwner)) {
        this.gmbOwners.push(rt.gmbOwner);
      }

      (rt.providers || []).forEach(p => {
        if (p && !this.fixedProviders.includes(p) && !this.providers.includes(p)) {
          this.providers.push(p);
        }
      });
    });
    this.agents.sort(alphabet);
    this.salesPeople.sort(alphabet);
    this.gmbOwners.sort(alphabet);
    this.providers.sort(alphabet);
    this.filterRTs();
  }

  filterRTs() {

    let list = this.restaurants;
    const { createdAfter, agreementSent, checkedProviders, gmbChanges, gmbOwner, hasAttachment, hasLogs, salesperson, agent } = this.filters;

    if (createdAfter) {
      list = list.filter(x => (x.createdAt.valueOf() >= new Date(createdAfter + 'T00:00:00.000Z').valueOf()));
    }

    switch (agreementSent) {
      case AgreementSentModes.Sent:
        list = list.filter(x => x.sent);
        break;
      case AgreementSentModes.NotSent:
        list = list.filter(x => !x.sent);
        break;
    }

    if (checkedProviders.length > 0) {
      list = list.filter(rt => checkedProviders.every(p => rt.providers.includes(p)));
    }

    if (agent) {
      list = list.filter(rt => rt.agent === agent);
    }

    if (salesperson) {
      list = list.filter(rt => rt.salesperson === salesperson);
    }

    switch (gmbChanges) {
      case GmbChangeModes.RecentLost:
        list = list.filter(rt => rt.gmbRecentLost);
        break;
      case GmbChangeModes.UnderAttack:
        list = list.filter(rt => rt.gmbUnderAttack);
        break;
    }

    switch (hasAttachment) {
      case HasAttachmentModes.Has:
        list = list.filter(({ otherAttachments }) => otherAttachments && otherAttachments.length > 0);
        break;
      case HasAttachmentModes.No:
        list = list.filter(({ otherAttachments }) => !otherAttachments || otherAttachments.length <= 0);
        break;
    }

    switch (hasLogs) {
      case HasLogsModes.Has:
        list = list.filter(({ logs }) => logs && logs.length > 1);
        break;
      case HasLogsModes.No:
        list = list.filter(({ logs }) => !logs || logs.length <= 0);
        break;
    }

    switch (gmbOwner) {
      case GmbOwnerModes.NotQm:
        list = list.filter(x => x.gmbOwner !== 'qmenu');
        break;
      case GmbOwnerModes.NotQmOrCmo:
        list = list.filter(x => x.gmbOwner !== 'qmenu' && x.gmbOwner !== 'chinesemenuonline');
        break;
      case GmbOwnerModes.Unset:
        break;
      default:
        list = list.filter(x => x.gmbOwner === gmbOwner);
    }
    this.list = list;
  }

  // load old logs of restaurant which need to be updated to ensure the integrity of data.
  async getRestaurantLogs(rtId) {
    let restaurant = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $oid: rtId } },
      projection: { logs: 1 },
      limit: 1
    }).toPromise();
    return restaurant[0].logs || [];
  }

  async addLog(row) {
    this.logInEditing = new Log({ type: 'online-agreement', time: new Date() });
    this.restaurant = row;
    this.restaurant.logs = await this.getRestaurantLogs(this.restaurant._id);
    this.logEditingModal.show();
  }

  onSuccessAddLog(event) {
    event.log.time = event.log.time ? event.log.time : new Date();
    let username = event.log.username ? event.log.username : this._global.user.username;
    event.log.username = username;
    let logs = [...this.restaurant.logs, event.log];

    const newRestaurant = { _id: this.restaurant._id, logs: logs };

    this._prunedPatch.patch(environment.qmenuApiUrl + 'generic?resource=restaurant',
      [{
        old: { _id: this.restaurant._id },
        new: { _id: newRestaurant._id, logs: newRestaurant.logs }
      }]).subscribe(result => {
        this.restaurant.logs = logs;
        this.restaurant.agent = username;
        if (!this.agents.includes(username)) {
          this.agents.push(username);
          this.agents.sort(alphabet);
        }
        this._global.publishAlert(AlertType.Success, 'Log added successfully');
        event.formEvent.acknowledge(null);
        this.restaurant = undefined;
        this.logEditingModal.hide();
      },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error while adding log');
          event.formEvent.acknowledge('Error while adding log');
        }
      );
  }

  onCancelAddLog() {
    this.restaurant = undefined;
    this.logEditingModal.hide();
  }

  preview(url?) {
    if (url) {
      this.attachment = url;
      this.previewModal.show();
    } else {
      this.attachment = '';
      this.previewModal.hide();
    }
  }
}
