import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { Lead } from '../../classes/lead';
import { AlertType } from '../../classes/alert-type';
import { ModalComponent, AddressPickerComponent } from '@qmenu/ui/bundles/ui.umd';
import { DeepDiff } from '../../classes/deep-diff';
import { GmbInfo } from '../../classes/gmb-info';

@Component({
  selector: 'app-leads',
  templateUrl: './leads.component.html',
  styleUrls: ['./leads.component.scss']
})
export class LeadsComponent implements OnInit {
  @ViewChild('editingModal') editingModal: ModalComponent;
  @ViewChild('filterModal') filterModal: ModalComponent;
  @ViewChild('viewModal') viewModal: ModalComponent;

  @ViewChild('myAddressPicker') myAddressPicker: AddressPickerComponent;
  addressApt = null;

  apiRequesting = false;

  leads: Lead[] = [];
  selectionSet = new Set();

  leadInEditing = new Lead();
  // for editing
  formFieldDescriptors = [];

  // for filtering
  searchFilter = {
    classifications: 'Chinese Restaurants'
  };
  searchRating;

  filterFieldDescriptors = [
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
      field: 'serviceProviders', // match db naming otherwise would be single instead of plural
      label: 'Service Provider',
      required: false,
      inputType: 'single-select',
      items: ['Grubhub', 'Doordash', 'CMO', 'Red Passion', 'BeyondMenu'].map(s => ({ object: s, text: s, selected: false }))
    },
    {
      field: 'zipCode',
      label: 'Zip Code',
      required: false,
      inputType: 'tel'
    },
    {
      field: 'city',
      label: 'City',
      required: false,
      inputType: 'text'
    },
    {
      field: 'state',
      label: 'State',
      required: false,
      inputType: 'single-select',
      items: ['AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI',
        'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO',
        'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR',
        'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY']
        .map(state => ({ object: state, text: state, selected: false }))
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.searchLeads();
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

    this.filterModal.show();
  }

  filterSubmit(event) {
    this.searchFilter = event.object;
    this.searchFilter['rating'] = this.searchRating;

    this.searchLeads(event.acknowledge);
    this.filterModal.hide();
  }

  removeFilter(filter) {
    console.log(filter);
    delete this.searchFilter[filter];
    // reset searchFilter to make sure form builder reflect changes :(
    this.searchFilter = JSON.parse(JSON.stringify(this.searchFilter));
    console.log(this.searchFilter);
    this.searchLeads();
  }

  searchLeads(acknowledge?) {
    // get all users
    const query = {};
    ['state', 'city', 'zipCode', 'serviceProviders', 'classifications'].map(field => {
      if (this.searchFilter[field]) {
        query[field] = this.searchFilter[field];
      }
    });
    if (+this.searchFilter['rating'] > 0) {
      query['rating'] = { $lte: +this.searchFilter['rating'] };
    }

    this._api.get(environment.lambdaUrl + 'leads', { ids: [], limit: 50, query: query }).subscribe(
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
    console.log(this.leadInEditing);
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
      console.log(this.selectionSet);
    }
  }

  toggleSelection(lead) {
    if (this.selectionSet.has(lead._id)) {
      this.selectionSet.delete(lead._id);
    } else {
      this.selectionSet.add(lead._id);
    }
  }

  hasSelection() {
    return this.leads.some(lead => this.selectionSet.has(lead._id));
  }

  crawGoogle(lead: Lead) {
    this.apiRequesting = true;
    this._api.get(environment.internalApiUrl + 'google',
      { keywords: lead.name + ' ' + lead.address.route + ' ' + lead.address.postal_code })
      .subscribe(result => {
        const gmbInfo = result as GmbInfo;
        const clonedLead = JSON.parse(JSON.stringify(lead));
        clonedLead.rating = gmbInfo.rating;
        clonedLead.totalReviews = gmbInfo.totalReviews;
        clonedLead.gmbVerified = gmbInfo.gmbVerified;
        clonedLead.orderOnlineUrl = gmbInfo.orderOnlineUrl;
        clonedLead.gmbOpen = gmbInfo.gmbOpen;
        clonedLead.cuisine = gmbInfo.cuisine;
        clonedLead.menuUrls = gmbInfo.menuUrls;
        clonedLead.gmbWebsite = gmbInfo.website;
        clonedLead.reservations = gmbInfo.reservations;
        if (gmbInfo.phone && clonedLead.phones.indexOf(gmbInfo.phone) < 0) {
          clonedLead.phones.push(gmbInfo.phone);
        }
        clonedLead.serviceProviders = gmbInfo.serviceProviders;
        this.patchDiff(lead, clonedLead);
        this.apiRequesting = false;
      }, error => {
        this.apiRequesting = false;
        this._global.publishAlert(AlertType.Danger, 'Failed to craw');
      });
  }

  injectGoogleAddress(lead: Lead) {
    console.log(this.apiRequesting);
    this.apiRequesting = true;
    lead.address = lead.address || {};
    setTimeout(() => {
      this.apiRequesting = false;
    }, 2000);
  }

  patchDiff(originalLead, newLead) {
    const diffs = DeepDiff.getDiff(originalLead._id, originalLead, newLead);
    console.log(diffs);

    if (diffs.length === 0) {
      this._global.publishAlert(AlertType.Info, 'Nothing to update');
    } else {
      // api update here...
      this._api.patch(environment.lambdaUrl + 'leads', diffs).subscribe(result => {

        // let's update original, assuming everything successful
        Object.assign(originalLead, newLead);
        this.editingModal.hide();
        this._global.publishAlert(AlertType.Success, originalLead.name + ' was updated');
      }, error => {
        this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
      });

    }
  }
}
