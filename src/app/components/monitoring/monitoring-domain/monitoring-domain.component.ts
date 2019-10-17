import { Component, OnInit } from '@angular/core';
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { Helper } from 'src/app/classes/helper';
@Component({
  selector: 'app-monitoring-domain',
  templateUrl: './monitoring-domain.component.html',
  styleUrls: ['./monitoring-domain.component.css']
})
export class MonitoringDomainComponent implements OnInit {
  domains = [];
  filteredDomains = [];
  domainRtDict= [];
  managedDomain = 'Manged Domains';
  constructor(private _api: ApiService, private _global: GlobalService) {

  }
  async ngOnInit() {
    const domainBatchSize = 1000;
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'domain',
        skip: this.domains.length,
        limit: domainBatchSize
      }).toPromise();
      this.domains.push(...batch);
      if (batch.length === 0 || batch.length < domainBatchSize) {
        break;
      }
    }

    const restaurantBatchSize = 1000;
    const allRestaurants = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: {
          name: 1,
          "googleAddress.formatted_address": 1,
          alias: 1,
          disabled: 1,
          score: 1,
          googleListing: 1,
          "rateSchedules.agent": 1,
          web: 1,
          createdAt: 1
        },
        skip: allRestaurants.length,
        limit: restaurantBatchSize
      }).toPromise();
      allRestaurants.push(...batch);
      if (batch.length === 0 || batch.length < restaurantBatchSize) {
        break;
      }
    }

    this.domains.map(domain =>{
      allRestaurants.map(rt=>{
        let website = (rt.web || {}).qmenuWebsite;
        if (!website || website.toLowerCase().indexOf(domain) >= 0) {
          this.domainRtDict[domain] = rt;
        }
      })
    });


    //this.domains.map(each => allRestaurants)

    this.filter();
  }

  filter() {
    this.filteredDomains = this.domains.slice(0);

    switch (this.managedDomain) {
      case 'only active':
        const now = new Date();
        this.filteredDomains = this.filteredDomains.filter(e => e.status === 'ACTIVE' || (e.type === 'AWS' && new Date(e.expiry).valueOf() > now.valueOf()));
        break;
      default:
        break;
    }
  }

}
