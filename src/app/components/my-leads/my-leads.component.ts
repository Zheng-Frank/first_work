import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { Lead } from '../../classes/lead';
import { AlertType } from '../../classes/alert-type';

@Component({
  selector: 'app-my-leads',
  templateUrl: './my-leads.component.html',
  styleUrls: ['./my-leads.component.scss']
})
export class MyLeadsComponent implements OnInit {

  tabs = ['Untouched', 'Ongoing', 'Failed', 'Successful', 'All'];
  activeTab = 'Ongoing';

  myLeads = [];

  constructor(private _api: ApiService, private _global: GlobalService) {
    this.populateMyLeads();
  }

  ngOnInit() {
  }

  populateMyLeads() {
    const query = {
      'assignee': this._global.user.username
    };
    this._api.get(environment.lambdaUrl + 'leads', { ids: [], limit: 1000, query: query }).subscribe(
      result => {
        this.myLeads = result.map(u => new Lead(u));
        this.myLeads.sort((u1, u2) => u1.name.localeCompare(u2.name));
        if (this.myLeads.length === 0) {
          this._global.publishAlert(AlertType.Info, 'No lead found');
        }
      },
      error => {
        this._global.publishAlert(AlertType.Danger, 'Error pulling leads from API');
      });
  }

  getLeadsForTab(tab) {
    switch (tab) {
      case 'Untouched':
        return this.myLeads.filter(lead => lead.saleStatus === undefined || lead.saleStatus === null);
      case 'Ongoing':
        return this.myLeads.filter(lead => lead.saleStatus === 'ongoing');
      case 'Failed':
        return this.myLeads.filter(lead => lead.saleStatus === 'failed');
      case 'Successful':
        return this.myLeads.filter(lead => lead.saleStatus === 'successful');
      default:
        return this.myLeads;
    }
  }

}
