import { Component, OnInit } from '@angular/core';
import { GlobalService } from 'src/app/services/global.service';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-monitoring-dashboard',
  templateUrl: './monitoring-dashboard.component.html',
  styleUrls: ['./monitoring-dashboard.component.css']
})
export class MonitoringDashboardComponent implements OnInit {

  monitoredItem = 'Dashboard Items';
  items = [];
  dashboardItems = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.populate();
  }

  ngOnInit() {
    const roleMap = {
      "Dashboard Items": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
      "Diagnostics": ["ADMIN", "CSR", "ACCOUNTANT"],
      "Cloud Printers": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
      "GMB Tasks": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT", "GMB_SPECIALIST", "MARKETER_INTERNAL"],
      "DB": ["ADMIN"],
      "Events": ["ADMIN"],
      "Scripts": ["ADMIN"],
      "Restaurant Domains": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
      "Restaurant GMBs": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
    };
    const myRoles = this._global.user.roles;
    this.items = Object.keys(roleMap).filter(k => roleMap[k].some(role => myRoles.indexOf(role) >= 0));
  }

  async populate() {
    const dashboardItems = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'dashboard-item',
      limit: 10000
    }).toPromise());
    this.dashboardItems.push(...dashboardItems);
  }
}
