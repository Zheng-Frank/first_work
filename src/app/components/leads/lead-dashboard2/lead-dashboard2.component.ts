import { Component, OnInit, ViewChild } from '@angular/core';
import { FormEvent, TableColumnDescriptor } from '@qmenu/ui';
import { ModalComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";
import { LeadFilter } from 'src/app/classes/lead-filter';
import { LeadFunnel } from 'src/app/classes/lead-funnel';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { environment } from 'src/environments/environment';

enum FunnelCreateModes {
  New = 'New Funnel',
  Copy = 'Copy from existing funnel'
}

@Component({
  selector: 'app-lead-dashboard2',
  templateUrl: './lead-dashboard2.component.html',
  styleUrls: ['./lead-dashboard2.component.css']
})
export class LeadDashboard2Component implements OnInit {
  @ViewChild("editingModal") editingModal: ModalComponent;
  @ViewChild("analyzingModal") analyzingModal: ModalComponent;

  operatorMap = {
    $eq: '=',
    $ne: '≠',
    $lt: '<',
    $gt: '>',
  };

  funnelCreateMode = FunnelCreateModes.New;

  funnels: LeadFunnel[] = [];
  sampleRows = [];
  myColumnDescriptors = [
    {
      label: '#'
    },
    {
      label: 'Name',
      paths: ['name'],
      sort: (a, b) => a - b
    },
  ];

  funnelFieldDescriptors = [
    {
      field: "name",
      label: "Name",
      required: true,
      placeholder: 'name',
      inputType: "text"
    },
    {
      field: "description",
      label: "Description",
      required: false,
      placeholder: 'description',
      inputType: "text"
    },
    {
      field: "published",
      label: "Published for sales agents to use",
      required: false,
      inputType: "checkbox"
    },

  ];

  funnelInEditing: LeadFunnel = {} as LeadFunnel;
  filterInEditing = {} as LeadFilter;

  sampleLead;
  get operators() {
    return Object.keys(this.operatorMap);
  }

  get funnelCreateModes() {
    return FunnelCreateModes;
  }

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.loadFunnels();
  }

  ngOnInit() {
  }

  editFunnel(funnel?: LeadFunnel) {
    this.funnelCreateMode = FunnelCreateModes.New;
    this.editingModal.show();
    if (!funnel) {
      // creating new one!
      this.funnelInEditing = {} as LeadFunnel;
    } else {
      this.funnelInEditing = JSON.parse(JSON.stringify(funnel));
    }
  }

  copyFunnel(funnelName) {
    let funnel = this.funnels.find(x => x.name === funnelName);
    this.funnelInEditing = JSON.parse(JSON.stringify(funnel));
    this.funnelInEditing._id = undefined;
    this.funnelInEditing.name += " - Copy";
    this.funnelInEditing.published = false;
  }

  existingFunnelNames() {
    return this.funnels.map(f => f.name);
  }

  async doneEditingFunnel(event: FormEvent) {
    if (this.funnelInEditing._id) {
      // we are edting existing one
      const [old] = this.funnels.filter(f => f._id === this.funnelInEditing._id);
      // detect changes of each field
      const ops = {};
      ['name', 'description', 'filters', 'published'].map(field => {
        if (JSON.stringify(old[field]) !== JSON.stringify(this.funnelInEditing.filters)) {
          ops[field] = this.funnelInEditing[field];
        }
      });
      if (Object.keys(ops).length > 0) {
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=lead-funnel', [
          {
            old: { _id: old._id, analysis: '' }, // always remove analysis
            new: { _id: old._id, ...ops }
          }
        ]).toPromise();
      }
    } else {
      // we are adding new funnel
      await this._api.post(environment.qmenuApiUrl + 'generic?resource=lead-funnel', [{
        ...this.funnelInEditing,
        filters: this.funnelInEditing.filters || [],
        createdBy: this._global.user.username
      }]).toPromise();
      // reload!
    }

    // assumed never having errors, so just acknowledge
    event.acknowledge(null);
    this.loadFunnels();
    this.editingModal.hide();
  }

  async removeFunnel(event: FormEvent) {
    await this._api.delete(
      environment.qmenuApiUrl + "generic",
      {
        resource: 'lead-funnel',
        ids: [event.object._id]
      }
    ).toPromise();
    event.acknowledge(null);
    this.editingModal.hide();
    this.loadFunnels();
  }

  addFilter() {
    this.funnelInEditing.filters = this.funnelInEditing.filters || [];
    this.funnelInEditing.filters.push(this.filterInEditing);
    // also, convert: "null" => null, "20" => 20, "false" => false
    const whitelisted = {
      'null': null,
      'false': false,
      'true': true
    };
    if (!isNaN(this.filterInEditing.value) && !isNaN(parseFloat(this.filterInEditing.value))) {
      this.filterInEditing.value = parseFloat(this.filterInEditing.value);
    } else if (this.filterInEditing.value in whitelisted) {
      this.filterInEditing.value = whitelisted[this.filterInEditing.value];
    } else if (this.filterInEditing.value === undefined) {
      this.filterInEditing.value = '';
    }

    // reset for next reuse
    this.filterInEditing = {} as LeadFilter;
  }

  removeFilter(filter) {
    this.funnelInEditing.filters = this.funnelInEditing.filters.filter(f => f !== filter);
  }

  async loadFunnels() {
    const funnels = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'lead-funnel',
      limit: 100000
    }).toPromise();
    // convert to LeadFunnel class
    this.funnels = funnels.map(f => new LeadFunnel(f));
  }

  async loadFunnelAnalysis(funnel: LeadFunnel) {
    this.funnelInEditing = funnel;
    this.analyzingModal.show();
    // reset a couple of things
    this.sampleRows = [];
    this.myColumnDescriptors.length = 2;

    // create new columns based on each filter field!
    funnel.filters.map(filter => {
      const lastField = filter.field.split('.').slice(-1)[0];
      const label = lastField[0].toUpperCase() + lastField.slice(1); // capitalize
      const paths = filter.field.split('.');
      this.myColumnDescriptors.push({
        label, paths
      } as TableColumnDescriptor);
    });

    await funnel.analyze(this._api);
    // samples!
    const $match = { _id: { $exists: true } };
    funnel.filters.reduce((m, filter) => (m[filter.field] = {
      [filter.operator]: filter.value
    }, m), $match);
    this.sampleRows = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'raw-lead',
      aggregate: [
        { $match },
        {
          $project: {
            hours: 0, // exclude hours and everything else are returned
          }
        },
        { $limit: 100 }
      ]
    }).toPromise();
  }

  getQ(lead) {
    return encodeURIComponent([lead.name, lead.address, lead.city, lead.state].join(', '));
  }

  getColumnValue(lead, cd: TableColumnDescriptor) {
    let value = lead;
    for (let path of cd.paths) {
      if (value && value.hasOwnProperty(path)) {
        value = value[path];
      } else {
        value = undefined;
      }
    }
    return value;
  }

  async toggleSampleLead() {
    if (this.sampleLead) {
      this.sampleLead = null;
    } else {
      [this.sampleLead] = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'raw-lead',
        query: {
          name: "Sichuan House"
        },
        limit: 1
      }).toPromise();
    }
  }
}
