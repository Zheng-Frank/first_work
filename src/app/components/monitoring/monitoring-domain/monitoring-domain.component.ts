import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from 'src/app/classes/helper';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from 'src/app/classes/alert-type';

enum mustRenewOptions {
  Domains_To_Renew = 'Domains to Renew',
  Domains_To_Not_Renew = 'Domains to not Renew'
}

enum redirectOptions {
  Has_Redirect = 'Has Redirect',
  No_Redirect = 'No Redirect'
}

enum redirectTypes {
  BM_Site = 'BM Site',
  Other = 'Other'
}

@Component({
  selector: 'app-monitoring-domain',
  templateUrl: './monitoring-domain.component.html',
  styleUrls: ['./monitoring-domain.component.css']
})
export class MonitoringDomainComponent implements OnInit {

  @ViewChild('redirectModal') redirectModal: ModalComponent;

  now = new Date();

  pagination = true;
  domains = [];
  restaurants = [];
  invoices = [];

  domainMap: any;

  filteredDomains = [];
  mustRenew = 'Show All';

  EXPIRY_DAYS_THRESHOLD = 60;
  INVOICE_DAYS_THRESHOLD = 30 * 6;

  refreshing = false;

  bulkDomains = [];


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
      label: 'Select'
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
    },
    {
      label: 'Action'
    }
  ];
  bmRTs = [];
  filters = {
    mustRenew: '',
    hasRedirect: ''
  };
  googleRanks = [];
  redirectOptions = [redirectTypes.BM_Site, redirectTypes.Other];
  currRedirectDomain: any = {};
  
  constructor(private _api: ApiService, private _global: GlobalService) {

  }

  async ngOnInit() {
    // beyond menu rt
    this.bmRTs = await this.getBMRTsByBatch();
    this.googleRanks = await this.populateGoogleRanks();
    await this.refresh();
  }

  async setRedirectUrl(matchingRestaurant) {
    const domainRedirectUrl = this.currRedirectDomain.redirect ? this.currRedirectDomain.domainRedirectUrl : '';
    const restaurantId = matchingRestaurant._id;
    const urlValidRegex = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/
    if (domainRedirectUrl && !urlValidRegex.test(domainRedirectUrl)) {
      return this._global.publishAlert(AlertType.Danger, 'Please input valid redirected website');
    }

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: restaurantId, web: {} },
        new: { _id: restaurantId, web: { domainRedirectUrl: domainRedirectUrl } },
      }
    ]).toPromise();
  }

  async injectWebsiteAws(matchingRestaurant) {
    try {
      const domain = Helper.getTopDomain((matchingRestaurant.web || {}).qmenuWebsite);
      const templateName = (matchingRestaurant.web || {}).templateName;
      const restaurantId = matchingRestaurant._id;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        domain,
        templateName,
        restaurantId
      }).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success');

      //Invalidate the domain cloudfront
      try {
        const result = await this._api.post(environment.appApiUrl + 'events', [{ queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`, event: { name: "invalidate-domain", params: { domain: domain } } }]).toPromise();
        // update origin data
        const matchbmRT = this.getMatchingbmRT(matchingRestaurant);
        let { hasRediect, currDomainRedirectUrl, redirectOption, redirectOptions } = this.initRedirectDomainUrl(matchingRestaurant, matchbmRT);
        this.currRedirectDomain.hasRediect = hasRediect;
        this.currRedirectDomain.currDomainRedirectUrl = currDomainRedirectUrl;
        this.currRedirectDomain.redirectOption = redirectOption;
        this.currRedirectDomain.redirectOptions = redirectOptions;
      } catch (error) {
        this._global.publishAlert(AlertType.Danger, JSON.stringify(error));
      }

    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Failed: ' + JSON.stringify(error));
    }
  }

  // do an api call to republish website to AWS
  async executeRedirect(restaurantId) {
    if (confirm(`Are you sure ?`)) {
      this.redirectModal.hide();
      let restaurant = this.restaurants.find(rt => rt._id === restaurantId);
      // 1. update redirect domain 
      await this.setRedirectUrl(restaurant);
      // 2. republish to AWS
      if (this.currRedirectDomain.redirect) {
        await this.injectWebsiteAws(restaurant);
      }
    }
  }

  dropdowns(key) {
    return Object.values({
      must_renew: mustRenewOptions,
      has_redirect: redirectOptions
    }[key])
  }

  async getBMRTsByBatch() {
    let bmRTs = [], skip = 0, size = 30000;
    while (true) {
      const temp = await this._api.post(environment.biApiUrl + "smart-restaurant/api", {
        method: 'get',
        resource: 'bm-sst-restaurants',
        query: { _id: { $exists: true } },
        payload: {
          GooglePlaceID: 1,
          CustomerDomainName: 1,
          CustomerDomainName1: 1
        },
        skip, limit: size
      }).toPromise();
      bmRTs.push(...temp);
      if (temp.length === size) {
        skip += size;
      } else {
        break;
      }
    }
    return bmRTs;
  }

  async populateGoogleRanks() {
    const [lastest] = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "google-ranks",
      aggregate: [
        {
          $project: {
            createdAt: 1
          }
        },
        {
          $sort: {
            _id: -1
          }
        },
        {
          $limit: 1
        }
      ]
    }).toPromise();

    let date = new Date(lastest.createdAt);
    date.setDate(date.getDate() - 7);
    date.setHours(0, 0, 0, 0);

    const googleRanks = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "google-ranks",
      aggregate: [
        {
          $match: {
            ranks: {
              $elemMatch: {
                name: 'qmenu'
              }
            },
            "ranks.rank": {
              $exists: true
            },
            createdAt: {
              $gte: {
                $date: date
              }
            }
          }
        },
        {
          $project: {
            rank: {
              $arrayElemAt: [{
                $map: {
                  input: {
                    $filter: {
                      input: '$ranks',
                      as: 'rank',
                      cond: {
                        $eq: ['$$rank.name', 'qmenu']
                      }
                    }
                  },
                  as: 'r',
                  in: '$$r.rank'
                }
              }, 0]
            },
            restaurantId: 1,
            createdAt: 1
          }
        },
        {
          $sort: {
            _id: -1
          }
        },
        {
          $limit: 20000
        }
      ]
    }, 20000);

    return googleRanks;
  }

  get redirectTypes() {
    return redirectTypes;
  }

  openRedirectModal(domain) {
    this.currRedirectDomain = domain;
    this.currRedirectDomain.redirect = false;
    this.redirectModal.show();
  }

  // change redirect checkbox in redirect modal will call this method 
  onChangeRedirectOtherUrl() {  
    if (this.currRedirectDomain.redirect) {
      const matchingbmRT = this.currRedirectDomain.matchingbmRT;
      if (matchingbmRT) {
        this.currRedirectDomain.redirectOption = redirectTypes.BM_Site;
        this.currRedirectDomain.redirectOptions = [redirectTypes.BM_Site, redirectTypes.Other];
        this.currRedirectDomain.domainRedirectUrl = matchingbmRT.CustomerDomainName ? matchingbmRT.CustomerDomainName : matchingbmRT.CustomerDomainName1 ? matchingbmRT.CustomerDomainName1 : '';
      } else {
        this.currRedirectDomain.redirectOption = redirectTypes.Other;
      }
    }
  }

  // redirect checkbox should be inited rather than set by default
  initRedirectDomainUrl(matchingRestaurant, matchingbmRT) {
    let hasRediect = false;
    let currDomainRedirectUrl = '';
    let redirectOption;
    let redirectOptions = [redirectTypes.Other];
    if ((matchingRestaurant.web || {}).domainRedirectUrl) {
      hasRediect = true;
      currDomainRedirectUrl = (matchingRestaurant.web || {}).domainRedirectUrl;
      if (matchingbmRT && ((matchingbmRT.CustomerDomainName && Helper.areDomainsSame(currDomainRedirectUrl, matchingbmRT.CustomerDomainName)) || (matchingbmRT.CustomerDomainName1 && Helper.areDomainsSame(currDomainRedirectUrl, matchingbmRT.CustomerDomainName1)))) {
        redirectOption = redirectTypes.BM_Site;
        redirectOptions = [redirectTypes.BM_Site, redirectTypes.Other];
        currDomainRedirectUrl = `${currDomainRedirectUrl} (BM Site)`;
      } else {
        redirectOption = redirectTypes.Other;
      }
    }

    return {
      hasRediect, // use filter domain which has been redirected
      currDomainRedirectUrl,
      redirectOption,
      redirectOptions
    }
  }

  getMatchingGoogleRank(matchingRestaurant) {
    return (this.googleRanks.find(rank => matchingRestaurant._id === rank.restaurantId) || {}).rank || '';
  }

  getMatchingbmRT(matchingRestaurant) {
    return this.bmRTs.find(bmRt => (matchingRestaurant.googleListing || {}).place_id === bmRt.GooglePlaceID);
  }

  async refresh() {
    this.refreshing = true;
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
        alias: 1,
        'googleListing.place_id': 1,
        "googleAddress.formatted_address": 1,
        "web.qmenuWebsite": 1,
        "web.useBizWebsiteForAll": 1,
        "web.domainRedirectUrl": 1
      }
    }, 5000);

    // --- invoices
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - this.INVOICE_DAYS_THRESHOLD);

    this.invoices = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
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
      limit: 25000
    }, 5000);

    // flat map
    this.domainMap = this.domains.map(domain => {
      const matchingRestaurant: any = this.getMatchingRestaurant(domain.name);
      if (matchingRestaurant) {
        const qmenuWebsite = (matchingRestaurant.web || {}).qmenuWebsite;
        const needToRedirect = qmenuWebsite && qmenuWebsite.indexOf('qmenu.us') === -1;
        const matchbmRT = this.getMatchingbmRT(matchingRestaurant);
        const googleRank = this.getMatchingGoogleRank(matchingRestaurant);
        let { hasRediect, currDomainRedirectUrl, redirectOption, redirectOptions } = this.initRedirectDomainUrl(matchingRestaurant, matchbmRT);
        return {
          _id: domain._id,
          domainName: domain.name,
          domainExpiry: domain.expiry,
          domainStatus: domain.status,
          domainType: domain.type,
          domainAutoRenew: domain.autoRenew,
          needToRedirect, // redirect to bm
          googleRank,
          matchbmRT,
          hasRediect,
          currDomainRedirectUrl,
          redirectOption,
          redirectOptions,
          restaurantId: matchingRestaurant._id.toString(),
          restaurantName: matchingRestaurant.name,
          restaurantAlias: matchingRestaurant.alias,
          restaurantAddress: matchingRestaurant.googleAddress.formatted_address,
          restaurantDisabled: matchingRestaurant.disabled,
          restaurantWeb: matchingRestaurant.web
        }
      } else {
        return {
          _id: domain._id,
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

      // --- insisted all
      if ((entry.restaurantWeb || {}).useBizWebsiteForAll === true) {
        reasons.push('Insisted website for all');
        entry.reasons = reasons;
        entry.restaurantInsistedForAll = true;
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
      if (entry.restaurantDisabled || entry.restaurantInsisted || entry.restaurantInsistedForAll || !entry.hasInvoicesInLast6Months || !entry.restaurantId) {
        entry.shouldRenew = false;
      } else if (entry.hasInvoicesInLast6Months) {
        entry.shouldRenew = true;
      }

    }

    this.refreshing = false;

    this.filter();
  }

  hasInvoices(restaurantId) {
    if (!restaurantId) {
      return false;
    }

    return !!this.invoices.find(invoice => invoice.restaurant.id === restaurantId);
  }

  getMatchingRestaurant(domain) {
    const matches = this.restaurants.filter(rt => {
      const qmenuWebsite = (rt.web || {}).qmenuWebsite || '';
      const rtDomain = qmenuWebsite.replace('http://', '').replace('https://', '').replace('www.', '').replace('/', '');
      const hostedDomain = domain.replace('http://', '').replace('https://', '').replace('www.', '').replace('/', '');

      if (rtDomain === hostedDomain) {
        return true;
      }
      return false;
    });

    if (matches.length > 1) {
      const match = matches.find(rt => !rt.disabled);
      return match;
    } else {
      const [match] = matches;
      return match;
    }

  }

  filter() {
    this.refreshing = true;

    this.filteredDomains = this.domainMap;

    let { mustRenew, hasRedirect } = this.filters;

    switch (mustRenew) {

      case mustRenewOptions.Domains_To_Renew:
        this.filteredDomains = this.domainMap.filter(e => e.shouldRenew);
        break;

      case mustRenewOptions.Domains_To_Not_Renew:
        this.filteredDomains = this.domainMap.filter(e => !e.shouldRenew);
        break;

      default:
        break;
    }

    switch (hasRedirect) {

      case redirectOptions.Has_Redirect:
        this.filteredDomains = this.domainMap.filter(e => e.hasRedirect);
        break;

      case redirectOptions.No_Redirect:
        this.filteredDomains = this.domainMap.filter(e => !e.hasRedirect);
        break;

      default:
        break;
    }


    this.refreshing = false;
  }

  toogleBulkAutoRenew($event, domain) {
    if (!this.bulkDomains.includes(domain)) {
      this.bulkDomains.push(domain);
    } else {
      this.bulkDomains = this.bulkDomains.filter(d => d.domainName !== domain.domainName);
    }

    // console.log(this.bulkDomains);
  }

  async applyAutoRenew(domain, shouldRenew) {
    try {
      const payload = {
        domain: domain.domainName,
        shouldRenew
      };

      const result = await this._api.post(environment.appApiUrl + 'utils/renew-aws-domain', payload).toPromise();

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=domain', [
        {
          old: { _id: domain._id },
          new: { _id: domain._id, autoRenew: shouldRenew },
        }
      ]).toPromise();

      await this.setAlias(domain.restaurantId, domain.restaurantAlias);

      this.refresh();

      this._global.publishAlert(AlertType.Success, `Domain Rewnewal status for ${domain.domainName} updated successfully.`);
    } catch (error) {
      console.error(error);
      this._global.publishAlert(AlertType.Danger, `Failed to update ${domain.domainName} renewal status.`);
    }

  }

  async applyBulkAutoRenew(shouldRenew) {
    const failedRenew = [];

    for (const domain of this.bulkDomains) {
      const payload = {
        domain: domain.domainName,
        shouldRenew
      };

      const result = await this._api.post(environment.appApiUrl + 'utils/renew-aws-domain', payload).toPromise();

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=domain', [
        {
          old: { _id: domain._id },
          new: { _id: domain._id, autoRenew: shouldRenew },
        }
      ]).toPromise();

      await this.setAlias(domain.restaurantId, domain.restaurantAlias);

    }

    this.bulkDomains = [];

    await this.refresh();

    this._global.publishAlert(AlertType.Success, `Domain Rewnewal status updated successfully.`);
  }

  async setAlias(restaurantId, restaurantAlias) {
    const aliasUrl = environment.customerUrl + '#/' + restaurantAlias;
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: restaurantId, web: {} },
        new: { _id: restaurantId, web: { qmenuWebsite: aliasUrl } },
      }
    ]).toPromise();
  }

}
