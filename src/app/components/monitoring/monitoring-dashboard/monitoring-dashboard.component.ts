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

  monitoredItem = 'Biz Clients';//'Dashboard Items';
  items = [];
  dashboardItems = [];
  constructor(private _api: ApiService, private _global: GlobalService) {
    this.populate();
  }

  ngOnInit() {
    const roleMap = {
      "Biz Clients": ["ADMIN", "CSR"],
      "Dashboard Items": ["ADMIN", "MENU_EDITOR", "CSR", 'CSR_MANAGER', "ACCOUNTANT"],
      "Diagnostics": ["ADMIN", "CSR", 'CSR_MANAGER', "ACCOUNTANT"],
      "Cloud Printers": ["ADMIN", "MENU_EDITOR", "CSR", 'CSR_MANAGER', "ACCOUNTANT"],
      "GMB Tasks": ["ADMIN", "MENU_EDITOR", "CSR", 'CSR_MANAGER', "ACCOUNTANT", "GMB_SPECIALIST", "MARKETER_INTERNAL"],
      "DB": ["ADMIN"],
      "Events": ["ADMIN"],
      "Scripts": ["ADMIN"],
      "Restaurant Domains": ["ADMIN", "MENU_EDITOR", "CSR", 'CSR_MANAGER', "ACCOUNTANT"],
      "Restaurant GMBs": ["ADMIN", "MENU_EDITOR", "CSR", 'CSR_MANAGER', "ACCOUNTANT"],
      "Sales Stats": ["ADMIN", "MARKETER_MANAGER"],
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
