import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { IfDirective } from '@qmenu/ui/directives/if.directive';
@Component({
  selector: 'app-monitoring-domain',
  templateUrl: './monitoring-domain.component.html',
  styleUrls: ['./monitoring-domain.component.css']
})
export class MonitoringDomainComponent implements OnInit {
  now = new Date();

  domains = [];
  restaurants = [];
  invoices = [];

  domainMap: any;

  filteredDomains = [];
  mustRenew = 'Show All';

  EXPIRY_DAYS_THRESHOLD = 60;
  INVOICE_DAYS_THRESHOLD = 30 * 6;

  domainWhiteList = [
    'myqmenu.com',
    'qdasher.com',
    'qmenu360.com',
    'qmenu365.com',
    'qmenu.biz',
    'qmenu.us',
    'qmenudemo.com',
    'qmenufood.com',
    'qmenuprint.com',
    'qmenuschoice.com',
    'qmenutest.com',
    'qmorders.com',
    '4043829768.com'
  ];

  myColumnDescriptors = [
    {
      label: '#'
    },
    {
      label: "Domain",
      paths: ['domainName'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Type',
      paths: ['domainType'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: 'Expiry Date',
      paths: ['domainExpiry'],
      sort: (a, b) => new Date(a).valueOf() - new Date(b).valueOf()
    },
    {
      label: 'Auto Renew',
      paths: ['domainAutoRenew'],
      sort: (a, b) => (a || '') > (b || '') ? 1 : ((a || '') < (b || '') ? -1 : 0)
    },
    {
      label: 'Must Auto Renew',
      paths: ['shouldRenew'],
      sort: (a, b) => (a || 0) > (b || 0) ? 1 : ((a || 0) < (b || 0) ? -1 : 0)
    },
    {
      label: 'Reasons'
    }
  ];

  constructor(private _api: ApiService, private _global: GlobalService) {

  }

  async ngOnInit() {
    this.refreash();
  }

  async refreash() {
    // --- domains
    const nextCoupleWeeks = new Date();
    nextCoupleWeeks.setDate(nextCoupleWeeks.getDate() + this.EXPIRY_DAYS_THRESHOLD);
    this.domains = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'domain',
      query: {
        type: { $ne: 'GODADDY' },
        expiry: { $lte: { $date: nextCoupleWeeks } }
      },
    }, 10000);

    // --- restaurants
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        _id: 1,
        name: 1,
        disabled: 1,
        "googleAddress.formatted_address": 1,
        "web.qmenuWebsite": 1,
      },
    }, 10000);

    // --- invoices
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - this.INVOICE_DAYS_THRESHOLD);

    this.invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        'restaurant.disabled': { $ne: true },
        toDate: { $gte: { $date: sixMonthsAgo } },
      },
      projection: {
        toDate: 1,
        "restaurant.id": 1,
        'restaurant.disabled': 1
      },
      // sort: { toDate: -1 }, // this breaks server not enought memory for sorting. index or reduce the limit
      limit: 30000,
    }).toPromise();


    this.domainMap = this.domains.map(domain => {
      const matchingRestaurant: any = this.getMatchingRestaurant(domain.name);

      if (matchingRestaurant) {
        return {
          domainName: domain.name,
          domainExpiry: domain.expiry,
          domainStatus: domain.status,
          domainType: domain.type,
          domainAutoRenew: domain.autoRenew,

          restaurantId: matchingRestaurant._id.toString(),
          restaurantName: matchingRestaurant.name,
          restaurantAddress: matchingRestaurant.googleAddress.formatted_address,
          restaurantDisabled: matchingRestaurant.disabled,
          restaurantWeb: matchingRestaurant.web
        }
      } else {
        return {
          domainName: domain.name,
          domainExpiry: domain.expiry,
          domainStatus: domain.status,
          domainType: domain.type,
          domainAutoRenew: domain.autoRenew
        }
      }

    });

    // --- Auto renew conditions
    for (const entry of this.domainMap) {
      const reasons = [];

      // --- whitelist 
      if (this.domainWhiteList.includes(entry.domainName.replace('http://', '').replace('https://', '').replace('/', ''))) {
        reasons.push('Whitelisted domain');
        entry.reasons = reasons;
        entry.isWhitelistDomain = true;
        entry.shouldRenew = true;
        continue;
      }

      // --- rt disabled
      if (entry.restaurantDisabled && (entry.restaurantDisabled === true)) {
        reasons.push('Restaurant is disabled');
        entry.reasons = reasons;
        continue;
      }

      if ((entry.restaurantDisabled && entry.restaurantDisabled === false) || (!entry.restaurantDisabled)) {
        reasons.push('Restaurant is enabled');
        entry.reasons = reasons;
      }

      // --- insisted website (rt uses its own domain)
      if ((entry.restaurantWeb || {}).useBizMenuUrl === true) {
        reasons.push('Insisted restaurant');
        entry.reasons = reasons;
        entry.restaurantInsisted = true;
        continue;
      }

      // --- expiry time in upcoming expiryDaysTreshold days
      const now = new Date();
      const expiry = new Date(entry.domainExpiry);

      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.round(Math.abs(diffTime) / (1000 * 60 * 60 * 24));

      if (diffTime < 0) {
        reasons.push(`Expired ${diffDays} days ago`);
        entry.reasons = reasons;
        entry.expired = true;
      }

      if (diffTime > 0) {
        if (diffDays <= this.EXPIRY_DAYS_THRESHOLD) {
          reasons.push(`Will expire in less than ${diffDays} days`);
          entry.reasons = reasons;
          entry.expired = false;
        } else {
          reasons.push(`Will expire in more than ${diffDays} days`);
          entry.reasons = reasons;
          entry.expired = false;
        }
      }

      // --- no invoices in the past 6 months
      const hasInvoiceInLastMonths = this.hasInvoices(entry.restaurantId ? entry.restaurantId : '');
      if (hasInvoiceInLastMonths === true) {
        reasons.push(`Have invoices for the past ${this.INVOICE_DAYS_THRESHOLD / 30} months`);
        entry.reasons = reasons;
        entry.hasInvoicesInLast6Months = true;
      } else {
        reasons.push(`Do not have invoices for over ${this.INVOICE_DAYS_THRESHOLD / 30} months`);
        entry.reasons = reasons;
        entry.hasInvoicesInLast6Months = false;
      }

      // --- no matching restaurant
      if (!entry.restaurantId) {
        reasons.push(`No restaurant linked to this domain`);
        entry.reasons = reasons;
        continue;
      }

      // --- should renew
      if (entry.restaurantDisabled || entry.restaurantInsisted || !entry.hasInvoicesInLast6Months || !entry.restaurantId) {
        entry.shouldRenew = false;
      } else if (entry.hasInvoicesInLast6Months) {
        entry.shouldRenew = true;
      }

    }

    this.filter();
  }

  hasInvoices(restaurantId) {
    if (!restaurantId) {
      return false;
    }

    return !!this.invoices.find(invoice => invoice.restaurant.id === restaurantId);
  }

  getMatchingRestaurant(domain) {
    return this.restaurants.find(rt => {
      const qmenuWebsite = (rt.web || {}).qmenuWebsite || '';
      const rtDomain = qmenuWebsite.replace('http://', '').replace('https://', '').replace('www.', '').replace('/', '');
      const hostedDomain = domain.replace('http://', '').replace('https://', '').replace('www.', '').replace('/', '');

      if (rtDomain === hostedDomain) {
        return true;
      }
      return false;
    });
  }

  filter() {
    // this.filteredDomains = this.domains.slice(0);
    this.filteredDomains = this.domainMap;

    switch (this.mustRenew) {
      case 'Show All':
        this.filteredDomains = this.domainMap;
        break;

      case 'Domains to Renew':
        this.filteredDomains = this.domainMap.filter(e => e.shouldRenew);
        break;
      
      case 'Domains to not Renew':
        this.filteredDomains = this.domainMap.filter(e => !e.shouldRenew);
        break;

      default:
        break;
    }
  }

}
