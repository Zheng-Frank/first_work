import {environment} from '../../../../../environments/environment';
import {ApiService} from 'src/app/services/api.service';
import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Restaurant} from '@qmenu/ui';

@Component({
  selector: 'app-restaurant-setup-basic',
  templateUrl: './restaurant-setup-basic.component.html',
  styleUrls: ['./restaurant-setup-basic.component.css']
})
export class RestaurantSetupBasicComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @Output() done = new EventEmitter();
  titles = ['Mr.', 'Mrs.', 'Ms.'];
  roles = ['Owner', 'Manager', 'Employee'];
  isCopiedToClipboard = false;
  existingWebsites = [];
  existingWebsite = '';
  model = {
    primaryBusinessPhone: '',
    primaryContactPersonTitle: '',
    primaryContactPersonName: '',
    primaryContactPersonRoles: [],
    primaryContactPersonPhone: '',
    website: '',
    localTaxRate: undefined
  };
  // use snapshot to storage local data, to handle repeat save isssue
  snapshot = {
    primaryPhone: '',
    contactName: '',
    contactPhone: ''
  };

  constructor(private _api: ApiService) {
  }

  async ngOnInit() {
    this.init();
    await this.getExistingWebsite();
  }


  init() {
    let {googleListing = {}, people = [], web = {}, taxRate, channels} = this.restaurant;
    let person = people[0] || {};
    let sms = (person.channels || []).find(x => x.type === 'SMS') || {};
    let phone = channels.find(x => x.type === 'Phone') || {};
    this.model = {
      primaryBusinessPhone: phone.value || googleListing.phone,
      primaryContactPersonTitle: person.title,
      primaryContactPersonName: person.name,
      primaryContactPersonRoles: person.roles || [],
      primaryContactPersonPhone: sms.value,
      website: '',
      localTaxRate: taxRate
    };
    this.snapshot = {
      primaryPhone: phone.value || googleListing.phone,
      contactName: person.name,
      contactPhone: sms.value,
    };
    this.existingWebsite = web.bizManagedWebsite || googleListing.gmbWebsite;
  }

  checkRole(e) {
    let {target: {checked, value}} = e;
    if (checked) {
      this.model.primaryContactPersonRoles.push(value);
    } else {
      this.model.primaryContactPersonRoles = this.model.primaryContactPersonRoles.filter(x => x !== value);
    }
  }

  chooseWebsite(w) {
    this.existingWebsite = w;
  }

  async getExistingWebsite() {
    const gmbWebsites = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {cid: this.restaurant.googleListing.cid},
      projection: {gmbWebsite: 1},
      limit: 100000000
    }).toPromise();
    let {googleListing, web} = this.restaurant;
    let websites = (gmbWebsites || []).map(w => (w.gmbWebsite || '').split('?')[0]);
    websites.push(googleListing.gmbWebsite, web.bizManagedWebsite, 'Other');
    this.existingWebsites = Array.from(new Set(websites.filter(x => !!x)));
    this.existingWebsite = web.bizManagedWebsite || googleListing.gmbWebsite;
  }

  async save() {

    let {
      primaryBusinessPhone, primaryContactPersonTitle,
      primaryContactPersonName, primaryContactPersonRoles,
      primaryContactPersonPhone, website, localTaxRate
    } = this.model;

    let {people = [], web = {}, taxRate, channels = []} = this.restaurant;
    let {primaryPhone, contactName, contactPhone} = this.snapshot;
    const channelFind = c => c.type === 'SMS' && [primaryContactPersonPhone, contactPhone].includes(c.value);
    if (primaryContactPersonPhone && primaryContactPersonName) {
      let person = people.find(p => [primaryContactPersonName, contactName].includes(p.name));
      if (!person) {
        person = {
          name: primaryContactPersonName,
          title: primaryContactPersonTitle,
          roles: primaryContactPersonRoles || [],
          channels: []
        } as any;
        people.push(person);
      }
      person.name = primaryContactPersonName;
      if (primaryContactPersonPhone) {
        let channel = {type: 'SMS', value: primaryContactPersonPhone};
        let personChannel = person.channels.find(channelFind);
        if (personChannel) {
          personChannel.value = primaryContactPersonPhone;
        } else {
          person.channels.push(channel);
        }
        if (!channels.some(channelFind)) {
          channels.push(channel);
        }
      }
    }

    if (primaryBusinessPhone && !channels.some(c => c.type === 'Phone' && [primaryBusinessPhone, primaryPhone].includes(c.value))) {
      channels.push({type: 'Phone', value: primaryBusinessPhone, notifications: ['Order', 'Business']});
    }
    web.bizManagedWebsite = website || this.existingWebsite;
    taxRate = localTaxRate || taxRate;

    let newObj = {people, web, taxRate, channels};
    this.done.emit(newObj);
  }

  copyToClipboard(text) {
    const handleCopy = (e: ClipboardEvent) => {
      // tslint:disable-next-line:no-unused-expression
      e.clipboardData && e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      document.removeEventListener('copy', handleCopy);
    };
    document.addEventListener('copy', handleCopy);
    document.execCommand('copy');
    this.isCopiedToClipboard = true;

    setTimeout(() => {
      this.isCopiedToClipboard = false;
    }, 1000);
  }

}
