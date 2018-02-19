import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { GlobalService } from '../../services/global.service';
import { Lead } from '../../classes/lead';
import { AlertType } from '../../classes/alert-type';
import { GmbInfo } from '../../classes/gmb-info';
import { DeepDiff } from '../../classes/deep-diff';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

@Component({
  selector: 'app-my-leads',
  templateUrl: './my-leads.component.html',
  styleUrls: ['./my-leads.component.scss']
})
export class MyLeadsComponent implements OnInit {

  @ViewChild('leadModal') leadModal: ModalComponent;

  tabs = ['All', 'Ongoing', 'Failed', 'Successful'];
  activeTab = 'All';

  apiRequesting = false;
  myLeads = [];

  leadsInProgress = [];

  selectedLead = new Lead();
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

  scanLead(lead) {
    this.apiRequesting = true;
    this.leadsInProgress.push(lead);
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
        this.leadsInProgress = this.leadsInProgress.filter(l => l != lead);
      }, error => {
        this.apiRequesting = false;
        this.leadsInProgress = this.leadsInProgress.filter(l => l != lead);
        this._global.publishAlert(AlertType.Danger, 'Failed to crawl');
      });
  }

  patchDiff(originalLead, newLead, removeFromSelection?) {
    const diffs = DeepDiff.getDiff(originalLead._id, originalLead, newLead);
    if (diffs.length === 0) {
      this._global.publishAlert(AlertType.Info, 'Nothing to update');
    } else {
      // api update here...
      this._api.patch(environment.lambdaUrl + 'leads', diffs).subscribe(result => {
        // let's update original, assuming everything successful
        Object.assign(originalLead, newLead);
        this._global.publishAlert(AlertType.Success, originalLead.name + ' was updated');
      }, error => {
        this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
      });

    }
  }

  selectLead(lead) {
    this.selectedLead = lead;
    this.leadModal.show();
  }


}
