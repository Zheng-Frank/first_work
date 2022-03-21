import {Component, Input, OnInit} from '@angular/core';
import {Restaurant} from '@qmenu/ui';

@Component({
  selector: 'app-menu-options-and-addons',
  templateUrl: './menu-options-and-addons.component.html',
  styleUrls: ['./menu-options-and-addons.component.css']
})
export class MenuOptionsAndAddonsComponent implements OnInit {
  @Input() restaurant: Restaurant;
  constructor() { }


  tabs = ['MenuOptions', 'AddOns'];
  activeTab = 'MenuOptions';
  ngOnInit() {
  }


  setActiveTab(tab) {
    this.activeTab = tab;
  }

}
