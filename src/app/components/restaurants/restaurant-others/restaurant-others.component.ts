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
      "Translations": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "1099K": ['ADMIN', 'ACCOUNTANT', 'CSR'],
      "GMB Posts": ['ADMIN', 'MENU_EDITOR', 'CSR'],
      "Web Template": ['ADMIN', 'MENU_EDITOR', 'CSR'],
      "Yelp": ['ADMIN', 'MENU_EDITOR', 'CSR', 'MARKETER'],
      "API Logs": ['ADMIN'],
      "SEO Tracking": ['ADMIN', 'CSR'],
      "Stats": ['ADMIN', 'CSR'],
    }
    this.tabs = Object.keys(tabVisibilityRolesMap).filter(k => tabVisibilityRolesMap[k].some(r => this._global.user.roles.indexOf(r) >= 0));
  }

  ngOnInit() {
    this.activeTab = "Stats";
  }
  setActiveTab(tab) {
    this.activeTab = tab;
  }
}
