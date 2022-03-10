import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import {Helper} from '../../../classes/helper';
import {TimezoneHelper} from '@qmenu/ui';

enum AgreementSentModes {
  Sent = 'Agreement Sent',
  NotSent = 'Agreement Not Sent'
}

enum GmbOwnerModes {
  Unset = 'GMB owner?',
  NotQmOrCmo = 'Not QM or CMO',
  NotQm = 'Not QM'
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

@Component({
  selector: 'app-monitoring-rts-without-agreement',
  templateUrl: './monitoring-rts-without-agreement.component.html',
  styleUrls: ['./monitoring-rts-without-agreement.component.css']
})
export class MonitoringRtsWithoutAgreementComponent implements OnInit {

  restaurants = [];
  jobs = [];
  list = [];
  providers = [];

  restaurantsColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '').localeCompare(b || '')
    },
    {
      label: "Agent",
      sort: (a, b) => (a || '').localeCompare(b || '')
    },
    {
      label: "Timezone",
      sort: (a, b) => (a || '') - (b || '')
    },
    {
      label: "CreatedAt",
      paths: ['createdAt'],
      sort: (a, b) => new Date(a || 0).valueOf() - new Date(b || 0).valueOf()
    },
    {
      label: "GMB ownership",
      sort: (a, b) => (a || '').localeCompare(b || '')
    },
    {
      label: "Agreement Sent",
      sort: (a, b) => (a || '').localeCompare(b || '')
    },
    {
      label: 'Other attachments'
    },
    {
      label: 'Logs'
    }
  ];
  filters = {
    createdAfter: '',
    salesPerson: '',
    agreementSent: '',
    gmbOwner: GmbOwnerModes.Unset,
    hasLogs: '',
    gmbChanges: '',
    agent: '',
    hasAttachment: '',
    checkedProviders: []
  }
  agents = [];
  gmbOwners = [];
  recentLostCids = new Set();
  underAttackingCids = new Set()

  constructor(private _api: ApiService, private _global: GlobalService) { }

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
    }[key])
  }

  checkProvider(e, provider) {
    if (e.target.checked) {
      this.filters.checkedProviders.push(provider);
    } else {
      this.filters.checkedProviders = this.filters.checkedProviders.filter(x => x !== provider);
    }
    this.filterRTs()
  }

  async query() {
    this.restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      aggregate: [
        {$match: {disabled: {$ne: true}}},
        {
          $project: {
            name: 1,
            'otherAttachments.url': 1,
            'otherAttachments.description': 1,
            'googleListing.cid': 1,
            'googleAddress.timezone': 1,
            'rateSchedules': 1,
            logs: {
              $map: {
                input: {
                  $filter: {
                    input: '$logs',
                    as: 'log',
                    cond: {$eq: ["$$log.type", "online-agreement"]},
                  }
                },
                as: 'item',
                in: { time: "$$item.time", username: "$$item.username" }
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
                        {$eq: ["$$ch.type", "SMS"]},
                        {$eq: ["$$ch.type", "Email"]},
                      ]
                    }
                  }
                },
                as: 'item',
                in: {$trim: {input: "$$item.value"}}
              }
            },
            createdAt: 1,
            providers: {
              "$ifNull": [
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
              $ifNull: [{$arrayElemAt: ['$gmbOwnerHistory.gmbOwner', 0]}, '']
            },
          }
        }
      ]
    }).toPromise();
    this.restaurants.forEach(r => {
      r.createdAt = new Date(r.createdAt);
    });
    this.restaurants.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());
    this.providers = Array.from(new Set(this.restaurants.reduce((a, c) => [...a, ...c.providers], [])))
      .filter(x => !!x).sort((a: string, b: string) => a.localeCompare(b));
    this.jobs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "job",
      aggregate: [
        {
          $match: {
            "name": {$eq: 'send-email'},
            "params.subject": {$eq: 'qMenu Online Service Agreement'}
          }
        },
        {$project: {"paramsTo": "$params.to", createdAt: 1}}
      ],
      limit: 100000
    }).toPromise();
    if (!this.filters.createdAfter) {
      this.filters.createdAfter = this.restaurants[this.restaurants.length - 1].createdAt.toISOString().split("T")[0];
    }
    await this.gmbQuery();
    await this.prepare();
  }

  async gmbQuery() {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 30);

    // Getting data from tables
    const events = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'event',
      query: {
        name: 'gmb-lost',
        "params.cid": { $exists: true },
        createdAt: { $gte: tenDaysAgo.valueOf() }
      },
      projection: {_id: 1, "params.cid": 1, createdAt: 1}
    }, 10000);


    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 45);

    // Get Attacking Requests
    const requests = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbRequest',
      query: {
        isReminder: false,
        date: { $gte: { $date: sevenDaysAgo } },
        handledDate: {$exists: false}
      },
      projection: {cid: 1, email: 1},
    }, 10000);

    const gmbAccounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        _id: 0,
        email: 1,
        "locations.cid": 1,
        "locations.status": 1,
        "locations.role": 1
      },
    }, 6000);

    const ownGMBSet = new Set();
    gmbAccounts.forEach(account => (account.locations || []).forEach(loc => {
      if (loc.cid && loc.status === "Published" && ["PRIMARY_OWNER", "OWNER", "CO_OWNER", "MANAGER"].indexOf(loc.role) >= 0) {
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
    this.gmbOwners = [];
    this.restaurants.forEach(rt => {
      rt.createdAt = new Date(rt.createdAt);
      rt.agent = Helper.getSalesAgent(rt.rateSchedules, users);
      // add agent to agents filter
      if (!this.agents.includes(rt.agent)) {
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
      if (!this.gmbOwners.includes(rt.gmbOwner)) {
        this.gmbOwners.push(rt.gmbOwner);
      }
    });
    this.agents.sort((a, b) => a.localeCompare(b));
    this.gmbOwners.sort((a, b) => a.localeCompare(b));
    this.filterRTs();
  }

  filterRTs() {

    let list = this.restaurants;
    const { createdAfter, agreementSent, checkedProviders, gmbChanges, gmbOwner, hasAttachment, hasLogs, salesPerson, agent } = this.filters;

    if (createdAfter) {
      list = list.filter(x => (x.createdAt.valueOf() >= new Date(createdAfter + 'T00:00:00.000Z').valueOf()))
    }

    switch (agreementSent) {
      case AgreementSentModes.Sent:
        list = list.filter(x => x.sent)
        break;
      case AgreementSentModes.NotSent:
        list = list.filter(x => !x.sent)
        break;
    }

    if (checkedProviders.length > 0) {
      list = list.filter(rt => checkedProviders.every(p => rt.providers.includes(p)))
    }

    if (agent) {
      list = list.filter(rt => rt.agent === agent);
    }

    switch (gmbChanges) {
      case GmbChangeModes.RecentLost:
        list = list.filter(({googleListing}) => googleListing && this.recentLostCids.has(googleListing.cid))
        break;
      case GmbChangeModes.UnderAttack:
        list = list.filter(({googleListing}) => googleListing && this.underAttackingCids.has(googleListing.cid))
        break;
    }

    switch (hasAttachment) {
      case HasAttachmentModes.Has:
        list = list.filter(({otherAttachments}) => otherAttachments && otherAttachments.length > 0)
        break;
      case HasAttachmentModes.No:
        list = list.filter(({otherAttachments}) => !otherAttachments || otherAttachments.length <= 0)
        break;
    }

    switch (hasLogs) {
      case HasLogsModes.Has:
        list = list.filter(({logs}) => logs && logs.length > 1)
        break;
      case HasLogsModes.No:
        list = list.filter(({logs}) => !logs || logs.length <= 0)
        break;
    }

    switch (gmbOwner) {
      case GmbOwnerModes.NotQm:
        list = list.filter(x => x.gmbOwner !== 'qmenu')
        break;
      case GmbOwnerModes.NotQmOrCmo:
        list = list.filter(x => x.gmbOwner !== 'qmenu' && x.gmbOwner !== 'chinesemenuonline')
        break;
      case GmbOwnerModes.Unset:
        break;
      default:
        list = list.filter(x => x.gmbOwner === gmbOwner)
    }
    this.list = list;
  }

}
