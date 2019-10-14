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
  managedDomain = 'Manged Domains';
  constructor(private _api: ApiService, private _global: GlobalService) { }
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
    this.filter();
  }

  filter() {
    this.filteredDomains = this.domains.slice(0);
    switch (this.managedDomain) {
      case 'only active':
        const now = new Date();
        this.filteredDomains = this.filteredDomains.filter(e => e.status === 'ACTIVE' || new Date(e.expiry).valueOf() > now.valueOf());
        break;
      default:
        break;
    }
  }

}
