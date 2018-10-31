import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { Hour } from '@qmenu/ui';

@Component({
  selector: 'app-hour-picker-simple',
  templateUrl: './hour-picker-simple.component.html',
  styleUrls: ['./hour-picker-simple.component.css']
})
export class HourPickerSimpleComponent implements OnInit {
  @Input() hour;
  @Input() weekly = false;

  
  constructor() {
    // this.hour = new Hour();
    // this.hour.occurence = 'ONE-TIME';
    // this.hour.fromTime = new Date();
    // const toTime = new Date();
    // toTime.setDate(toTime.getDate() + 1);
    // this.hour.toTime = toTime;
  }

  ngOnInit() {

  }

}
