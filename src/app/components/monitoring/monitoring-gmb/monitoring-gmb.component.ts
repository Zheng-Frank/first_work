import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
@Component({
  selector: 'app-monitoring-gmb',
  templateUrl: './monitoring-gmb.component.html',
  styleUrls: ['./monitoring-gmb.component.css']
})
export class MonitoringGmbComponent implements OnInit {
  rows = [];
  showOnlyDisabled = false;
  showNotDisabled = false;
  showOnlyPublished = false;
  showMissingWebsite = false;
  showExpiredDomain = false;
  missingPickupSettings = false;
  filteredRows = [];
  domains = [];
  domainRtDict = {};
  managedDomain = "Manged Domains";
  constructor(private _api: ApiService, private _global: GlobalService) { }

  now = new Date();
  ngOnInit() {
    this.populate();
  }

  async populate() {

    const allRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        alias: 1,
        disabled: 1,
        score: 1,
        googleListing: 1,
        "rateSchedules.agent": 1,
        serviceSettings: 1,
        web: 1,
        createdAt: 1
      }
    }, 1000)



    const gmbAccountsWithLocations = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      query: {
        locations: { $exists: 1 }
      },
      projection: {
        "email": 1,
        password: 1,
        "locations.cid": 1,
        "locations.status": 1,
        "locations.appealId": 1
      }
    }, 200)


    // const domains = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
    //   resource: 'domain'
    // }, 300)


    const cidAccountLocationMap = {};

    gmbAccountsWithLocations.map(account => account.locations.map(loc => {
      // make Published overrule other status
      if (loc.status === 'Published') {
        cidAccountLocationMap[loc.cid] = {
          account: account,
          location: loc
        };
      } else {
        cidAccountLocationMap[loc.cid] = cidAccountLocationMap[loc.cid] || {
          account: account,
          location: loc
        };
      }
    }));
    //this.domains = this.domains.filter(e=> !e.status || e.status ==='ACTIVE');

    //allRestaurants = allRestaurants.filter(r => r._id === '5ad9d66f8ffa501400cdeb84');

    const websiteDomainMap = new Map();
    this.domains.forEach(d => { if (d.status !== "TRANSFERRED_OUT") websiteDomainMap.set(d.name, d) });

    allRestaurants.forEach(rt => {
      let website = rt.web && rt.web.qmenuWebsite && rt.web.qmenuWebsite.toLowerCase();
      // compare http://www.biteofchinatogo.com/ to biteofchinatogo.com
      website = website && website.replace(/(^\w+:|^)\/\//, '').replace('/', '').replace('www.', '');
      const domain = websiteDomainMap.get(website);
      if (domain) this.domainRtDict[rt._id] = domain;
    });

    this.rows = allRestaurants.map(r => ({
      restaurant: r,
      domainType: this.domainRtDict[r._id] && this.domainRtDict[r._id].type,
      domain: this.domainRtDict[r._id],
      account: (cidAccountLocationMap[(r.googleListing || {}).cid] || {}).account,
      location: (cidAccountLocationMap[(r.googleListing || {}).cid] || {}).location,
      missingPickupSettings: this.isMissingPickup(r),
      serviceSettings: r.serviceSettings,
    }));
    // sort desc by score
    this.rows.sort((r1, r2) => (r2.restaurant.score || 0) - (r1.restaurant.score || 0));
    // this.rows.length > 500 ? this.rows.length = 500 : '';
    this.filter();
  }

  filter() {
    const now = new Date();
    this.filteredRows = this.rows;
    if (this.showOnlyPublished) {
      this.filteredRows = this.filteredRows.filter(row => !row.restaurant.disabled && (row.location && row.location.status == 'Published'));
    }
    if (this.showOnlyDisabled) {
      this.filteredRows = this.filteredRows.filter(row => row.restaurant.disabled);
    }
    if (this.showNotDisabled) {
      this.filteredRows = this.filteredRows.filter(row => !row.restaurant.disabled);
    }

    if (this.showMissingWebsite) {
      this.filteredRows = this.filteredRows.filter(row => row.restaurant.googleListing && !row.restaurant.googleListing.gmbWebsite);
    }

    if (this.showExpiredDomain) {
      this.filteredRows = this.filteredRows.filter(e => e.domain && (new Date(e.domain.expiry)).valueOf() < now.valueOf());
    }

    if (this.missingPickupSettings) {
      this.filteredRows = this.filteredRows.filter(row => row.missingPickupSettings);
    }

    switch (this.managedDomain) {
      case 'only active':
        this.filteredRows = this.filteredRows.filter(e => e.domain && (new Date(e.domain.expiry)).valueOf() > now.valueOf());
        break;
      case 'expired':
        this.filteredRows = this.filteredRows.filter(e => e.domain && (new Date(e.domain.expiry)).valueOf() < now.valueOf());
        break;
      default:
        break;
    }
  }

  isMissingPickup(restaurant) {
    const pickupHasPaymentMethods = restaurant.serviceSettings && !!restaurant.serviceSettings.find(settings => settings.name === 'Pickup' && settings.paymentMethods && settings.paymentMethods.length !== 0);
    const deliveryHasPymentMethods = restaurant.serviceSettings && !!restaurant.serviceSettings.find(settings => settings.name === 'Delivery' && settings.paymentMethods && settings.paymentMethods.length > 0);
    const dineInHasPaymentMethods = restaurant.serviceSettings && !!restaurant.serviceSettings.find(settings => settings.name === 'Dine-in' && settings.paymentMethods && settings.paymentMethods.length > 0);

    return !pickupHasPaymentMethods && (deliveryHasPymentMethods || dineInHasPaymentMethods);
  }
}
