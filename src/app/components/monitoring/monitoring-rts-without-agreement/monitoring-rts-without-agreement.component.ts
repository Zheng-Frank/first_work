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
      },
      projection: {
        name: 1,
        'googleAddress.timezone': 1,
        'rateSchedules.agent': 1,
        "channels.value": 1,
        "channels.type": 1,
        createdAt: 1
      }
    }).toPromise();
    this.gmbBizs = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      projection: {
        "qmenuId": 1,
        "gmbOwner": 1
      },
      limit: 10000000000000000
    }).toPromise();
    this.jobs = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "job",
      aggregate: [
        {
          $match: {
            "name": {
              $eq: 'send-email'
            },
            "job.params.subject": {
              $eq: 'qMenu Online Service Agreement'
            }
          }
        },
        {
          $project: {
            'paramsTo': "$params.to",
            createdAt: 1
          }
        }
      ],
      limit: 100000
    }).toPromise();
    this.filterRTs();
  }

  filterRTs() {
    if (!this.fromDate) {
      this.fromDate = new Date().toISOString().split("T")[0];
    }
    // filter by createdAt
    this.agents = [];
    this.gmbOwners = [];
    this.agreementRTs = this.restaurants.filter(rt => new Date(rt.createdAt).valueOf() >= new Date(this.fromDate + "T00:00:00.000Z").valueOf());
    this.agreementRTs.forEach(rt => {
      rt.createdAt = new Date(rt.createdAt);
      rt.agent = ((rt.rateSchedules || [])[0] || {}).agent || 'None';
      // add agent to agents filter
      if (this.agents.indexOf(rt.agent) === -1) {
        this.agents.push(rt.agent);
      }
      let emails = rt.channels.filter(({ type }) => type === 'Email').map(({ value }) => value);
      rt.sent = this.jobs.some(job => emails.includes(job));
      // rt has sent service agreement, if job has qMenu Online Service Agreement subject emails
      if (rt.sent) {
        let rtJob = this.jobs.filter(job => emails.includes(job.paramsTo))[0];
        // use filter email sent time as sent agreement time
        rt.agreementSentAt = new Date(rtJob.createdAt);
      }
      rt.gmbOwner = this.gmbBizs.filter(gmbBiz => gmbBiz.qmenuId = rt._id)[0] || 'None';
      // add gmbOwner to gmbOwners filter
      if (this.gmbOwners.indexOf(rt.gmbOwner) === -1) {
        this.gmbOwners.push(rt.gmbOwner);
      }
    });
    this.filterAgreementRTs = this.agreementRTs;
    this.agents.sort((a, b) => a.localeCompare(b));
    this.agents.unshift('All');
    this.gmbOwners.sort((a, b) => a.localeCompare(b));
    this.gmbOwners.unshift('All');
    // filter by agent
    if (this.agent && this.agent !== 'All') {
      this.filterAgreementRTs = this.filterAgreementRTs.filter(rt => rt.agent === this.agent);
    }
    // filter by gmb owner
    if (this.gmbOwner && this.gmbOwner !== 'All') {
      this.filterAgreementRTs = this.filterAgreementRTs.filter(rt => rt.agent === this.gmbOwner);
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
