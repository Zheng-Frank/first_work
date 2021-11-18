import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Menu, Restaurant} from '@qmenu/ui';
import {environment} from '../../../../../environments/environment';
import {ApiService} from '../../../../services/api.service';
import {Helper} from '../../../../classes/helper';

@Component({
  selector: 'app-restaurant-setup-hours',
  templateUrl: './restaurant-setup-hours.component.html',
  styleUrls: ['./restaurant-setup-hours.component.css']
})
export class RestaurantSetupHoursComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @Output() done = new EventEmitter();

  constructor(private _api: ApiService) {
  }

  hours = [];
  addingHours = false;

  ngOnInit() {
    let {googleListing, googleAddress: {timezone}} = this.restaurant;
    if (googleListing && googleListing.hours) {
      this.hours = Helper.parseGMBHours(googleListing.hours, timezone);
    }
  }

  deleteHour(index) {
    this.hours.splice(index, 1);
  }

  hourUpdate(e) {
    this.hours = e;
    this.addingHours = false;
  }

  hoursIdentical(a, b) {
    if (!a || !b || a.length !== b.length) {
      return false;
    }
    return a.every(x => b.some(y => x.equals(y)));
  }

  async save() {
    let {menus} = this.restaurant;
    let tempMenu = {id: Date.now().toString(), name: 'Menu hours', disabled: true, hours: this.hours} as Menu;
    if (menus && menus.length > 0) {
      // if some menu has different hours, add a new menu with these hours
      if (menus.some(m => m.hours && !this.hoursIdentical(m.hours, this.hours))) {
        menus.push(tempMenu);
      } else {
        // if all menus have no different hours, set the hours to all menus
        menus.forEach(m => m.hours = this.hours);
      }
    } else {
      // if no menu, add a new menu with hours
      menus = [tempMenu];
    }
    this.done.emit({menus});
  }
}
