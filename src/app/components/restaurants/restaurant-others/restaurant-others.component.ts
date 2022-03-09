import { GlobalService } from './../../../services/global.service';
import { Input } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';

@Component({
  selector: 'app-restaurant-others',
  templateUrl: './restaurant-others.component.html',
  styleUrls: ['./restaurant-others.component.css']
})
export class RestaurantOthersComponent implements OnInit {

  @Input() restaurant: Restaurant;
  tabs = [];
  activeTab = 'Settings';
  constructor(private _global: GlobalService) {
    const tabVisibilityRolesMap = {
      "Translations": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "1099K": ['ADMIN', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER'],
      "GMB Posts": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER'],
      "Web Template": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', "MARKETER"],
      "Yelp": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      "API Logs": ['ADMIN', 'annie', 'judy'], // NOTE: temporarily solution for special user permission config
      "SEO Tracking": ['ADMIN', 'CSR', 'CSR_MANAGER'],
      "Stats": ['ADMIN', 'CSR', 'CSR_MANAGER'],
      "Poster": ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER'],
      'Sent Msgs': ['ADMIN'],
      'Menu Images': ['ADMIN', 'CSR'],
      'Other Attachments': ['ADMIN', 'CSR']
    }
    this.tabs = Object.keys(tabVisibilityRolesMap).filter(k => tabVisibilityRolesMap[k].some(r => this._global.user.roles.indexOf(r) >= 0 || this._global.user.username === r));
  }

  ngOnInit() {
    this.activeTab = "Stats";
  }
  setActiveTab(tab) {
    this.activeTab = tab;
  }
}
