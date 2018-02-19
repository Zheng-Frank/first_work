import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { Lead } from '../../classes/lead';
import { AlertType } from '../../classes/alert-type';
import { ModalComponent, AddressPickerComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { DeepDiff } from '../../classes/deep-diff';
import { GmbInfo } from '../../classes/gmb-info';
import { Address } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { User } from '../../classes/user';

const spMap = {
  'beyondmenu': 'beyondmenu.png',
  'chownow': 'chownow.png',
  'chinesemenuonline': 'chinesemenuonline.png',
  'doordash': 'doordash.png',
  'eat24': 'eat24.png',
  'eatstreet': 'eatstreet.png',
  'grubhub': 'grubhub.png',
  'menufy': 'menufy.png',
  'qmenu': 'qmenu.png',
  'redpassion': null,
  'slicelife': 'slicelife.png',
  'seamless': 'seamless.png',
  'ubereats': 'ubereats.png',
};

@Component({
  selector: 'app-leads',
  templateUrl: './leads.component.html',
  styleUrls: ['./leads.component.scss']
})
export class LeadsComponent implements OnInit {
  @ViewChild('editingModal') editingModal: ModalComponent;
  @ViewChild('assigneeModal') assigneeModal: ModalComponent;
  @ViewChild('filterModal') filterModal: ModalComponent;
  @ViewChild('viewModal') viewModal: ModalComponent;

  @ViewChild('myAddressPicker') myAddressPicker: AddressPickerComponent;
  addressApt = null;

  apiRequesting = false;

  leads: Lead[] = [];
  selectionSet = new Set();

  showSelectOptions = false;

  leadInEditing = new Lead();
  // for editing
  formFieldDescriptors = [];

  // for assignee
  assigneeObj = {};
  assigneeFieldDescriptors = [];

  // for filtering
  searchFilters = [{
    path: 'classifications',
    value: 'Chinese Restaurants'
  }];

  searchFilterObj = {
  };
  filterRating;

  filterFieldDescriptors = [
    {
      field: 'gmbScanned', // match db naming otherwise would be single instead of plural
      label: 'Data Scanned',
      required: false,
      inputType: 'single-select',
      items: [
        { object: 'scanned', text: 'Scanned', selected: false },
        { object: 'not scanned', text: 'Not Scanned', selected: false }
      ]
    },
    {
      field: 'classifications', // match db naming otherwise would be single instead of plural
      label: 'Classifications',
      required: false,
      inputType: 'single-select',
      items: [
        // 'Restaurants',
        // 'American Restaurants',
        // 'Family Style Restaurants',
        // 'Hamburgers & Hot Dogs',
        // 'Fast Food Restaurants',
        // 'Breakfast  Brunch & Lunch Restaurants',
        'Pizza',
        'Italian Restaurants',
        // 'Take Out Restaurants',
        // 'Greek Restaurants',
        'Chinese Restaurants',
        'Asian Restaurants',
        // 'Coffee & Espresso Restaurants',
        // 'Sandwich Shops',
        'Sushi Bars',
        // 'Bars',
        'Japanese Restaurants',
        'Steak Houses',
        'Mexican Restaurants',
        // 'Latin American Restaurants',
        // 'Chicken Restaurants',
        // 'Bar & Grills',
        // 'Barbecue Restaurants',
        'Thai Restaurants',
        // 'Sports Bars',
        // 'Brew Pubs',
        // 'Health Food Restaurants',
        // 'Bagels',
        // 'Bakeries',
        // 'Taverns',
        // 'Hot Dog Stands & Restaurants',
        // 'Mediterranean Restaurants',
        // 'Seafood Restaurants',
        // 'Fine Dining Restaurants',
        // 'Creole & Cajun Restaurants',
        // 'Buffet Restaurants',
        // 'Soul Food Restaurants',
        // 'Ice Cream & Frozen Desserts',
        // 'Dessert Restaurants',
        // 'Middle Eastern Restaurants',
        // 'Caribbean Restaurants',
        // 'Continental Restaurants',
        'Vietnamese Restaurants',
        // 'French Restaurants',
        // 'Indian Restaurants',
        // 'Vegetarian Restaurants',
        // 'Vegan Restaurants',
        'Korean Restaurants',
        // 'Brazilian Restaurants',
        // 'Wine Bars',
        // 'Cuban Restaurants',
        // 'Peruvian Restaurants',
        'Spanish Restaurants',
        // 'Irish Restaurants',
        // 'Pasta',
        'Mongolian Restaurants',
        // 'Gay & Lesbian Bars',
        // 'African Restaurants',
        // 'Hawaiian Restaurants',
        // 'Pies',
        // 'Fondue Restaurants',
        // 'Filipino Restaurants',
        // 'Russian Restaurants'
      ].sort().map(s => ({ object: s, text: s, selected: false }))
    },
    {
      field: 'gmbOwner', // match db naming otherwise would be single instead of plural
      label: 'GMB Owner',
      required: false,
      inputType: 'single-select',
      items: Object.keys(spMap).map(s => ({ object: s, text: s, selected: false }))
    },
    {
      field: 'gmbOpen', // match db naming otherwise would be single instead of plural
      label: 'GMB Status',
      required: false,
      inputType: 'single-select',
      items: [
        { object: 'gmb open', text: 'Open', selected: false }
      ]
    },
    {
      field: 'closed', // match db naming otherwise would be single instead of plural
      label: 'Store Status',
      required: false,
      inputType: 'single-select',
      items: [
        { object: 'closed', text: 'Store Closed', selected: false },
        { object: 'open', text: 'Store Open', selected: false }
      ]
    },
    {
      field: 'assigned', // match db naming otherwise would be single instead of plural
      label: 'Assigned to Someone',
      required: false,
      inputType: 'single-select',
      items: [
        { object: 'assigned', text: 'Assigned', selected: false },
        { object: 'not assigned', text: 'Not Assigned', selected: false }]
    },
    {
      field: 'address.postal_code',
      label: 'Zip Code',
      required: false,
      inputType: 'tel'
    },
    {
      field: 'address.locality',
      label: 'City',
      required: false,
      inputType: 'text'
    },
    {
      field: 'address.administrative_area_level_1',
      label: 'State',
      required: false,
      inputType: 'single-select',
      items: ['AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI',
        'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO',
        'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR',
        'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY']
        .map(state => ({ object: state, text: state, selected: false }))
    },
    {
      field: 'timezone',
      label: 'Timezone (UNDER CONSTRUCTION)',
      required: false,
      inputType: 'single-select',
      items: ['East', 'Mountain', 'West']
        .map(state => ({ object: state, text: state, selected: false }))
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.searchFilters = this._global.storeGet('searchFilters') || [];
    this.searchLeads();
    this.resetRating();

    // grab all users and make an assignee list!
    // get all users
    this._api.get(environment.lambdaUrl + 'users', { ids: [] }).subscribe(
      result => {
        const marketingUsers = result.map(u => new User(u))
          .filter(u => (u.roles || []).some(r => ['MARKETER', 'MARKETING_DIRECTOR'].indexOf(r) >= 0));

        const descriptor = {
          field: 'assignee', // match db naming otherwise would be single instead of plural
          label: 'Assignee',
          required: false,
          inputType: 'single-select',
          items: marketingUsers.map(mu => ({
            object: mu.username,
            text: mu.username,
            selected: false
          }))
        };

        this.filterFieldDescriptors.splice(4, 0, descriptor);

        const clonedDescriptor = JSON.parse(JSON.stringify(descriptor));
        clonedDescriptor.required = true;
        this.assigneeFieldDescriptors.push(clonedDescriptor);
      },
      error => {
        this._global.publishAlert(AlertType.Danger, 'Error pulling users from API');
      });
  }

  resetRating() {
    // we need to parse float out of the rating settings
    this.filterRating = undefined;
    this.searchFilters.map(sf => {
      switch (sf.path) {
        case 'rating':
          this.filterRating = (+sf.value.replace(/^\D+/g, '') + 0.5);
          break;
        default: break;
      }
    });
  }
  getObjFromFilters(searchFilters: any[]) {
    const obj = {};
    searchFilters.map(filter => this.setPathValue(obj, filter.path, filter.value));
    return obj;
  }

  setPathValue(object, path, value) {
    const parts = path.split('.');
    let current = object;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) { // fill an object if there is none
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  sortLeads(users) {
    this.leads.sort((u1, u2) => u1.name.localeCompare(u2.name));
  }

  createNew() {

    this.formFieldDescriptors = [{
      field: 'name',
      label: 'Restaurant Name',
      disabled: false
    }
    ];

    this.leadInEditing = new Lead();
    this.editingModal.show();
  }

  getLogo(lead) {
    return spMap[lead.gmbOwner];
  }

  formSubmit(event) {
    if (!this.myAddressPicker.address.place_id) {
      return event.acknowledge('Must input address');
    }


    this.leadInEditing.address = this.myAddressPicker.address;

    this.leadInEditing.address.apt = (this.addressApt || '').trim();
    this._api.post(environment.lambdaUrl + 'leads', [this.leadInEditing]).subscribe(result => {
      event.acknowledge(null);
      // we get ids returned
      this.leadInEditing._id = result[0];
      this.leads.push(new Lead(this.leadInEditing));
      this.editingModal.hide();
      this._global.publishAlert(AlertType.Success, this.leadInEditing.name + ' was added');
    }, error => {
      event.acknowledge(error.json() || error);
    });

  }

  formRemove(event) { }

  filter() {
    // reset the searchFilterObj so that the formbuilder has the latest
    this.searchFilterObj = this.getObjFromFilters(this.searchFilters);
    this.filterModal.show();
  }

  filterSubmit(event) {
    this.searchFilters = this.getFilter(event.object);
    // remove rating field if there is one (maybe we let rating slip into the formbuilder object?)
    this.searchFilters = this.searchFilters.filter(sf => sf.path !== 'rating');
    if (this.filterRating && +this.filterRating > 1) {
      this.searchFilters.push({
        path: 'rating',
        value: 'rating ~ ' + this.filterRating
      });
    }

    this.searchLeads(event.acknowledge);
    this.filterModal.hide();
    this._global.storeSet('searchFilters', this.searchFilters);
  }

  getFilter(variable, parentPath?) {
    const results = [];
    Object.keys(variable).map(key => {
      const path = parentPath ? (parentPath + '.' + key) : key;
      if (variable[key] !== Object(variable[key])) {
        results.push({
          path: path,
          value: variable[key]
        });

      } else {
        // case of non-primative
        results.push(...this.getFilter(variable[key], path));
      }
    });
    return results;
  }

  removeFilter(filter) {

    // delete last key by filter's path (eg. address.locality)
    this.searchFilters = this.searchFilters.filter(sf => sf !== filter);

    // need to set rating, assignee values
    this.resetRating();
    this.searchLeads();
    this._global.storeSet('searchFilters', this.searchFilters);
  }

  searchLeads(acknowledge?) {
    // get all users
    const query = {};
    this.searchFilters.map(filter => {
      switch (filter.path) {
        case 'rating':
          if (this.filterRating > 0) {
            query['rating'] = { $gte: this.filterRating - 0.5 };
          }
          break;
        case 'assigned':
          if (filter.value === 'assigned') {
            query['assignee'] = { $exists: true };
          }
          if (filter.value === 'not assigned') {
            query['assignee'] = { $exists: false };
          }
          break;
        case 'closed':
          if (filter.value === 'closed') {
            query['closed'] = true;
          }
          if (filter.value === 'open') {
            query['closed'] = { $ne: true };
          }
          break;
        case 'gmbOpen':
          if (filter.value === 'gmb open') {
            query['gmbOpen'] = true;
          }
          break;
        case 'gmbScanned':
          if (filter.value === 'scanned') {
            query['gmbScanned'] = true;
          } else if (filter.value === 'not scanned') {
            query['gmbScanned'] = { $exists: false };
          }
          break;
        default:
          query[filter.path] = filter.value;
          break;
      }
    });

    this._api.get(environment.lambdaUrl + 'leads', { ids: [], limit: 100, query: query }).subscribe(
      result => {
        this.leads = result.map(u => new Lead(u));
        this.sortLeads(this.leads);
        if (this.leads.length === 0) {
          this._global.publishAlert(AlertType.Info, 'No lead found');
        }
        if (acknowledge) {
          acknowledge(null);
        }
      },
      error => {
        if (acknowledge) {
          acknowledge(error.json || error);
        }
        this._global.publishAlert(AlertType.Danger, 'Error pulling leads from API');
      });
  }

  view(lead) {
    this.leadInEditing = lead;
    this.viewModal.show();
  }

  isAllSelected() {
    return this.leads.every(lead => this.selectionSet.has(lead._id));
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectionSet.clear();
    } else {
      this.selectionSet = new Set(this.leads.map(lead => lead._id));
    }
  }

  deselectAll() {
    this.selectionSet.clear();
  }

  toggleSelection(lead) {
    if (this.selectionSet.has(lead._id)) {
      this.selectionSet.delete(lead._id);
    } else {
      this.selectionSet.add(lead._id);
    }
  }

  selectNonCrawled() {
    this.selectionSet.clear();
    this.selectionSet = new Set(this.leads.filter(l => !l.gmbScanned).map(l => l._id));
  }

  hasSelection() {
    return this.leads.some(lead => this.selectionSet.has(lead._id));
  }

  crawlGoogle(lead: Lead, resolveCallback?, rejectCallback?) {
    this.apiRequesting = true;
    this._api.get(environment.internalApiUrl + 'lead-info',
      { q: lead.name + ' ' + lead.address.route + ' ' + lead.address.postal_code })
      .subscribe(result => {
        const gmbInfo = result as GmbInfo;
        const clonedLead = new Lead(JSON.parse(JSON.stringify(lead)));

        if (gmbInfo.name && gmbInfo.name !== clonedLead.name) {
          clonedLead.oldName = clonedLead.name;
        } else {
          // to make sure carry the name
          gmbInfo.name = clonedLead.name;
        }

        Object.assign(clonedLead, gmbInfo);
        clonedLead.phones = clonedLead.phones || [];
        if (gmbInfo.phone && clonedLead.phones.indexOf(gmbInfo.phone) < 0) {
          clonedLead.phones.push(gmbInfo.phone);
          delete clonedLead['phone'];
        }
        clonedLead.gmbScanned = true;
        this.patchDiff(lead, clonedLead, true);
        this.apiRequesting = false;
        if (resolveCallback) {
          resolveCallback(result);
        }
      }, error => {
        this.apiRequesting = false;
        this._global.publishAlert(AlertType.Danger, 'Failed to crawl');
        if (rejectCallback) {

          rejectCallback(error);
        }
      });
  }

  crawlGooglePromise(lead: Lead) {
    return new Promise((resolve, reject) => {
      this.crawlGoogle(lead, resolve, resolve); // pass ALL resolves to kee the thing going even when some are failing
    });
  }

  injectGoogleAddress(lead: Lead) {
    this.apiRequesting = true;
    lead.address = lead.address || {};

    this._api.get(environment.qmenuApiUrl + 'utilities/getGoogleAddress',
      {
        formatted_address: lead.address.formatted_address
      })
      .subscribe(result => {
        const clonedLead = new Lead(JSON.parse(JSON.stringify(lead)));
        clonedLead.address = new Address(result);
        this.patchDiff(lead, clonedLead);
        this.apiRequesting = false;
      }, error => {
        this.apiRequesting = false;
        this._global.publishAlert(AlertType.Danger, 'Failed to update Google address. Try crawling Google first.');
      });
  }

  patchDiff(originalLead, newLead, removeFromSelection?) {
    const diffs = DeepDiff.getDiff(originalLead._id, originalLead, newLead);
    if (diffs.length === 0) {
      this._global.publishAlert(AlertType.Info, 'Nothing to update');
    } else {
      // api update here...
      this._api.patch(environment.lambdaUrl + 'leads', diffs).subscribe(result => {
        if (removeFromSelection) {
          this.selectionSet.delete(newLead._id);
        }
        // let's update original, assuming everything successful
        Object.assign(originalLead, newLead);
        this.editingModal.hide();
        this._global.publishAlert(AlertType.Success, originalLead.name + ' was updated');
      }, error => {
        this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
      });
    }
  }

  crawlGoogleGmbOnSelected() {
    // this has to be done sequencially otherwise overload the server!
    this.leads
      .filter(lead => this.selectionSet.has(lead._id))
      .reduce((p: any, lead) => p.then(() => {
        return this.crawlGooglePromise(lead);
      }), Promise.resolve());

    // parallel example
    // this.leads
    //   .filter(lead => this.selectionSet.has(lead._id))
    //   .map(lead => {
    //     this.crawlGoogle(lead);
    //   });
  }

  assignOnSelected() {
    this.assigneeModal.show();
  }

  assigneeSubmit(event) {
    if (event.object.assignee) {
      this.leads.filter(lead => this.selectionSet.has(lead._id)).map(lead => {
        const clonedLead = JSON.parse(JSON.stringify(lead));
        clonedLead.assignee = event.object.assignee;
        this.patchDiff(lead, clonedLead);
      });
      this.assigneeModal.hide();
      event.acknowledge(null);
    } else {
      event.acknowledge('No assignee is selected');
    }
  }

  unassignOnSelected() {
    this.leads.filter(lead => this.selectionSet.has(lead._id)).map(lead => {
      const clonedLead = JSON.parse(JSON.stringify(lead));
      clonedLead.assignee = undefined;
      this.patchDiff(lead, clonedLead);
    });
  }
}
