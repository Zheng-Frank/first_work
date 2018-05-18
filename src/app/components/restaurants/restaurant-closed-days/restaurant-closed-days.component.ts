import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Restaurant, ClosedDay } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from '../../../classes/helper';


@Component({
  selector: 'app-restaurant-closed-days',
  templateUrl: './restaurant-closed-days.component.html',
  styleUrls: ['./restaurant-closed-days.component.css']
})
export class RestaurantClosedDaysComponent implements OnInit {
  @Input() restaurant: Restaurant;
  @ViewChild('occurenceSelector') occurenceSelector: SelectorComponent;
  @ViewChild('weekdaySelector') weekdaySelector: SelectorComponent;
  @ViewChild('yearSelector') yearSelector: SelectorComponent;
  @ViewChild('monthSelector') monthSelector: SelectorComponent;
  @ViewChild('daySelector') daySelector: SelectorComponent;

  comments: string;
  weekdays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  months: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  constructor(private _api: ApiService, private _global: GlobalService) { }
  editing: boolean = false;
  ngOnInit() {
  }

  getYears() {
    let year = new Date().getFullYear();
    let years: number[] = [];
    years.push(year);
    years.push(year + 1);
    return years;
  }

  // get days of a given month
  getDays(year, month) {
    let startDay = new Date(year, month, 1);
    let days: number[] = [];
    // keep adding one day to it until it's not the same month!
    let i = 0;
    while (startDay.getMonth() === month) {
      days.push(startDay.getDate());
      if (i > 34) {

        break;
      }
      startDay.setDate(startDay.getDate() + 1);
    }
    return days;
  }

  getClosedDays() {
    return this.restaurant.closedDays;
  }

  toggleEditing() {
    this.editing = !this.editing;
  }

  isSelectionValid() {
    return !!this.getSelectedClosedDay();
  }
  getSelectedClosedDay() {
    if (this.occurenceSelector && this.occurenceSelector.selectedValues.length > 0) {
      let occurence = this.occurenceSelector.selectedValues[0].toUpperCase();
      let closedDay = new ClosedDay();
      closedDay.occurence = occurence;
      closedDay.comment = this.comments;
      switch (occurence) {
        case 'ONE-TIME':
          if (this.yearSelector && this.yearSelector.selectedValues.length > 0
            && this.monthSelector && this.monthSelector.selectedValues.length > 0
            && this.daySelector && this.daySelector.selectedValues.length > 0) {
            closedDay.date = new Date(this.yearSelector.selectedValues[0], this.monthSelector.selectedValues[0] - 1, this.daySelector.selectedValues[0]);
            return closedDay;
          }
          break;
        case 'WEEKLY':
          if (this.weekdaySelector && this.weekdaySelector.selectedValues.length > 0) {
            // get next date which is the same weekday!
            let d = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

            let day = this.weekdays.indexOf(this.weekdaySelector.selectedValues[0]);
            d.setDate(d.getDate() + day - d.getDay());
            closedDay.date = d;
            return closedDay;
          }
          break;
        case 'YEARLY':
          if (this.monthSelector && this.monthSelector.selectedValues.length > 0
            && this.daySelector && this.daySelector.selectedValues.length > 0) {
            closedDay.date = new Date(new Date().getFullYear(), this.monthSelector.selectedValues[0] - 1, this.daySelector.selectedValues[0]);
            return closedDay;
          }
          break;
        default:
          break;
      }
    }
    return undefined;
  }

  remove(day) {
    const newClosedDays = this.restaurant.closedDays.filter(cd => cd.id !== day.id);
    this.patchDiff(newClosedDays);
  }

  addClosedDay() {
    let cd = this.getSelectedClosedDay();
    // convert this browser date to restaurant date
    cd.date = cd.date['toRestaurantDate'](this.restaurant.offsetToEST);
    cd.id = new Date().valueOf() + '';

    const newClosedDays = (this.restaurant.closedDays || []).slice(0); // shallow copy
    newClosedDays.push(cd);
    this.patchDiff(newClosedDays);
    // reset!
    this.occurenceSelector.selectedValues.length = 0;
    this.yearSelector.selectedValues.length = 0;
    this.monthSelector.selectedValues.length = 0;
    this.daySelector.selectedValues.length = 0;
  }


  patchDiff(newClosedDays) {
    if (Helper.areObjectsEqual(this.restaurant.closedDays, newClosedDays)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...
      this._api
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            closedDays: this.restaurant.closedDays
          }, new: {
            _id: this.restaurant['_id'],
            closedDays: newClosedDays
          }
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant.closedDays = newClosedDays;
            this._global.publishAlert(
              AlertType.Success,
              "Updated successfully"
            );
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Error updating to DB");
          }
        );
    }
  }

}
