import { Component, OnInit, forwardRef, HostBinding, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-future-date-time-picker',
  templateUrl: './future-date-time-picker.component.html',
  styleUrls: ['./future-date-time-picker.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FutureDateTimePickerComponent),
      multi: true
    }
  ]
})
export class FutureDateTimePickerComponent implements OnInit {
  @Input() weekly = false;

  dateItems = [];
  timeItems = [];

  selectedDate;
  selectedTime;

  disabled = false;

  constructor() {
    this.fillDropdowns(new Date());
  }

  fillDropdowns(startingDateTime) {
    this.selectedDate = undefined;
    this.selectedTime = undefined;

    const now = startingDateTime ? new Date(startingDateTime) : new Date();
    let date = startingDateTime ? new Date(startingDateTime) : new Date();
    date.setHours(0, 0, 0, 0);
    this.selectedDate = startingDateTime ? date : undefined;

    if (this.weekly) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      this.dateItems = days.map((day, index) => {
        const item = {
          text: days[date.getDay()],
          value: date
        };

        date = new Date(date.valueOf());
        date.setDate(date.getDate() + 1);
        return item;
      });

      // sort!
      this.dateItems.sort((di1, di2) => days.indexOf(di1.text) - days.indexOf(di2.text));

    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      this.dateItems = Array(365).fill(0).map((i, index) => {
        const item = {
          text: `${months[date.getMonth()]} ${date.getDate()}${date.getFullYear() > now.getFullYear() ? ', ' + date.getFullYear() : ''}`,
          value: date
        };

        date = new Date(date.valueOf());
        date.setDate(date.getDate() + 1);
        return item;
      });
    }




    let time = startingDateTime ? new Date(startingDateTime) : new Date();
    time.setHours(0, 0, 0, 0);
    const interval = 30; // minutes
    const dataPoints = Math.floor(24 * 60 / interval);
    this.timeItems = Array(dataPoints).fill(0).map((i, index) => {
      const item = {
        text: time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }),
        value: time
      };
      if (startingDateTime && time >= startingDateTime && !this.selectedTime) {
        this.selectedTime = time;
      }
      time = new Date(time.valueOf());
      time.setMinutes(time.getMinutes() + interval);
      return item;
    });
  }

  ngOnInit() {
  }

  // Function to call when the time changes.
  onChange = (dateTime: Date) => { };

  // Function to call when the input is touched (when a star is clicked).
  onTouched = () => { };

  get value(): Date {
    if (this.selectedDate && this.selectedTime) {
      const dateMs = this.selectedDate.valueOf();
      const timeMs = this.selectedTime.getHours() * 3600000 + this.selectedTime.getMinutes() * 60000;
      return new Date(dateMs + timeMs);
    }
  }

  // Allows Angular to update the model (value).
  // Update the model and changes needed for the view here.
  writeValue(dateTime: Date): void {
    this.fillDropdowns(dateTime);
    this.onChange(this.value)
  }

  // Allows Angular to register a function to call when the model (dateTime) changes.
  // Save the function as a property to call later here.
  registerOnChange(fn: (time: Date) => void): void {
    this.onChange = fn;
  }

  // Allows Angular to register a function to call when the input has been touched.
  // Save the function as a property to call later here.
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // Allows Angular to disable the input.
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  select(event) {
    this.onChange(this.value)
  }

}
