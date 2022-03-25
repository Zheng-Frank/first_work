import { GlobalService } from './../../../services/global.service';
import { Input } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import {Helper} from '../../../classes/helper';

@Component({
  selector: 'app-restaurant-others',
  templateUrl: './restaurant-others.component.html',
  styleUrls: ['./restaurant-others.component.css']
})
export class RestaurantOthersComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @Input() managers = [];
  @Input() users = [];
  tabs = [];
  activeTab = 'Settings';
  constructor(private _global: GlobalService) {
  }

   async ngOnInit() {
     const tabVisibilityRolesMap = {
       "Translations": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
       "1099K": ['ADMIN', 'ACCOUNTANT', 'CSR', 'CSR_MANAGER'],
       "GMB Posts": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER'],
       "Web Template": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', "MARKETER"],
       "Yelp": ['ADMIN', 'MENU_EDITOR', 'CSR', 'CSR_MANAGER', 'MARKETER'],
       "API Logs": ['ADMIN', 'CSR_MANAGER'],
       "SEO Tracking": ['ADMIN', 'CSR', 'CSR_MANAGER'],
       "Stats": ['ADMIN', 'CSR', 'CSR_MANAGER'],
       "Poster": ['ADMIN', 'CSR', 'CSR_MANAGER', 'MARKETER'],
       'Messages': ['ADMIN', 'CSR', 'CSR_MANAGER'],
       'Menu Images': ['ADMIN', 'CSR', 'CSR_MANAGER'],
       'Other Attachments': ['ADMIN', 'CSR', 'CSR_MANAGER']
     }

     let agent = Helper.getSalesAgent(this.restaurant.rateSchedules, this.users);
     let username = this._global.user.username;
     // if user is current RT's agent or agent's manager, should have permission of 1099k tab
     if (username === agent || this.managers.some(user => user.username === agent)) {
       tabVisibilityRolesMap['1099K'].push(username);
     }
     this.tabs = Object.keys(tabVisibilityRolesMap).filter(k => tabVisibilityRolesMap[k].some(r => this._global.user.roles.indexOf(r) >= 0 || this._global.user.username === r));
    this.activeTab = "Stats";
  }
  setActiveTab(tab) {
    this.activeTab = tab;
  }
}
