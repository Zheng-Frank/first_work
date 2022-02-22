import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";

enum agreementViewTypes {
  All = 'All',
  Without_Agreement = 'RTs without agreement',
  With_Agreement = 'RTs with agreement'
}

@Component({
  selector: 'app-monitoring-rts-without-agreement',
  templateUrl: './monitoring-rts-without-agreement.component.html',
  styleUrls: ['./monitoring-rts-without-agreement.component.css']
})
export class MonitoringRtsWithoutAgreementComponent implements OnInit {

  // api call
  restaurants = [];
  gmbBizs = [];
  jobs = [];
  // local data
  agreementRTs = [];
  filterAgreementRTs = [];

  restaurantsColumnDescriptors = [
    {
      label: 'Number'
    },
    {
      label: "Restaurant",
      paths: ['name'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: "Salesperson"
    },
    {
      label: "CreatedAt",
      paths: ['createdAt'],
      sort: (a, b) => new Date(a || 0).valueOf() - new Date(b || 0).valueOf()
    },
    {
      label: "GMB ownership"
    },
    {
      label: "Agreement Sent"
    }
  ];
  // filter conditions
  agreementViews = [agreementViewTypes.All, agreementViewTypes.Without_Agreement, agreementViewTypes.With_Agreement];
  agreementView = agreementViewTypes.All;
  agents = [];
  agent = 'All';
  gmbOwners = [];
  gmbOwner = 'All';
  fromDate = '';

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.loadDatas();
  }

  async loadDatas() {
    this.restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        disabled: {
          $ne: true
        }
      },
      projection: {
        name: 1,
        'googleAddress.timezone': 1,
        'rateSchedules.agent': 1,
        "channels.value": 1,
        "channels.type": 1,
        createdAt: 1,
        gmbOwnerHistory: {
          $slice: -1
        }
      },
      limit: 20000
    }).toPromise();
    this.restaurants.forEach(r => {
      r.createdAt = new Date(r.createdAt);
    });
    this.restaurants.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());
    // this.gmbBizs = await this._api.get(environment.qmenuApiUrl + 'generic', {
    //   resource: 'gmbBiz',
    //   query: {
    //     "qmenuId": {
    //       $exists: true
    //     },
    //     "gmbOwner":{
    //       $exists: true
    //     }
    //   },
    //   projection: {
    //     "qmenuId": 1,
    //     "gmbOwner": 1
    //   },
    //   limit: 10000000000000000
    // }).toPromise();
    this.jobs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "job",
      aggregate: [
        {
          $match: {
            "name": {
              $eq: 'send-email'
            },
            "params.subject": {
              $eq: 'qMenu Online Service Agreement'
            }
          }
        },
        {
          $project: {
            "paramsTo": "$params.to",
            createdAt: 1
          }
        }
      ],
      limit: 100000
    }).toPromise();
    if (!this.fromDate) {
      this.fromDate = this.restaurants[this.restaurants.length - 1].createdAt.toISOString().split("T")[0];
    }
    this.agents = [];
    this.gmbOwners = [];
    // filter by createdAt
    this.agreementRTs = this.restaurants.filter(rt => rt.createdAt.valueOf() >= new Date(this.fromDate + "T00:00:00.000Z").valueOf());
    this.agreementRTs.forEach(rt => {
      rt.createdAt = new Date(rt.createdAt);
      rt.agent = (((rt.rateSchedules || [])[0] || {}).agent || '').trim() || 'None';
      // add agent to agents filter
      if (this.agents.indexOf(rt.agent) === -1) {
        this.agents.push(rt.agent);
      }
      let emails = (rt.channels || []).filter(({ type }) => type === 'Email').map(({ value }) => value.trim());
      rt.sent = this.jobs.some(job => emails.includes(job.paramsTo.trim()));
      // rt has sent service agreement, if job has qMenu Online Service Agreement subject emails
      if (rt.sent) {
        let rtJob = this.jobs.filter(job => emails.includes(job.paramsTo.trim()))[0];
        // use filter email sent time as sent agreement time
        rt.agreementSentAt = new Date(rtJob.createdAt);
        let sentTime = rt.agreementSentAt.valueOf() - rt.createdAt.valueOf();
        rt.sentDays = Number((sentTime / (24 * 3600 * 1000)).toFixed(0));
      }
      // rt.gmbOwner = this.gmbBizs.filter(gmbBiz => gmbBiz.qmenuId = rt._id).map(gmbBiz => gmbBiz.gmbOwner).toString() || 'None';
      rt.gmbOwner = ((rt.gmbOwnerHistory || [])[0] || {}).gmbOwner || 'unknown';
      // add gmbOwner to gmbOwners filter
      if (this.gmbOwners.indexOf(rt.gmbOwner) === -1) {
        this.gmbOwners.push(rt.gmbOwner);
      }
    });
    this.agents.sort((a, b) => a.localeCompare(b));
    this.agents.unshift('All');
    this.gmbOwners.sort((a, b) => a.localeCompare(b));
    this.gmbOwners.unshift('All');
    this.filterRTs();
  }

  filterRTs() {
    // filter by createdAt
    this.filterAgreementRTs = this.agreementRTs.filter(rt => rt.createdAt.valueOf() >= new Date(this.fromDate + "T00:00:00.000Z").valueOf());
    // filter by agent
    if (this.agent && this.agent !== 'All') {
      this.filterAgreementRTs = this.filterAgreementRTs.filter(rt => rt.agent === this.agent);
    }
    // filter by gmb owner
    if (this.gmbOwner && this.gmbOwner !== 'All') {
      this.filterAgreementRTs = this.filterAgreementRTs.filter(rt => rt.gmbOwner === this.gmbOwner);
    }
    // filter by whether sent agreement
    if (this.agreementView !== agreementViewTypes.All) {
      if (this.agreementView === agreementViewTypes.Without_Agreement) {
        this.filterAgreementRTs = this.filterAgreementRTs.filter(rt => !rt.sent);
      } else {
        this.filterAgreementRTs = this.filterAgreementRTs.filter(rt => rt.sent);
      }
    }
  }

}
