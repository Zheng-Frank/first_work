import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Hour, Menu, Restaurant} from '@qmenu/ui';
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

  hourAdd(hours: Hour[]) {
    hours.forEach(h => {
      // only add non-duplicated ones
      if (this.hours.filter(hh => h.equals(hh)).length === 0) {
        this.hours.push(h);
      }
    });
    // sort!
    this.hours.sort((a, b) => a.fromTime.valueOf() - b.fromTime.valueOf());
    this.addingHours = false;
  }

  hoursIdentical(a, b) {
    if (!a || !b || a.length !== b.length) {
      return false;
    }
    return a.every(x => b.some(y => x.equals(y)));
  }

  hourSameDay(hour) {
    let {googleAddress: {timezone}} = this.restaurant;
    let fromDate = hour.fromTime.toLocaleString('en-US', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'});
    let toDate = hour.toTime.toLocaleString('en-US', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'});
    return (fromDate === toDate) ? '' : '(next) ';
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
