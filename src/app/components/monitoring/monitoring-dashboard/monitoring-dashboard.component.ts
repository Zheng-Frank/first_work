import { Component, OnInit } from '@angular/core';
import { GlobalService } from 'src/app/services/global.service';

@Component({
  selector: 'app-monitoring-dashboard',
  templateUrl: './monitoring-dashboard.component.html',
  styleUrls: ['./monitoring-dashboard.component.css']
})
export class MonitoringDashboardComponent implements OnInit {

  // monitoredItem = 'Placeholder';
  monitoredItem = 'Scripts';
  items = [];
  constructor(private _global: GlobalService) { }

  ngOnInit() {
    const roleMap = {
      "Placeholder": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
      "Cloud Printers": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
      "GMB Tasks": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT", "GMB_SPECIALIST"],
      "DB": ["ADMIN"],
      "Events": ["ADMIN"],
      "Scripts": ["ADMIN"],
      "Restaurant Domains": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
      "Restaurant GMBs": ["ADMIN", "MENU_EDITOR", "CSR", "ACCOUNTANT"],
    };
    const myRoles = this._global.user.roles;
    this.items = Object.keys(roleMap).filter(k => roleMap[k].some(role => myRoles.indexOf(role) >= 0));
  }
}
