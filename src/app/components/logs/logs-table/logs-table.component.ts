import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { Log } from 'src/app/classes/log';

interface RestaurantLog {
  restaurant: Restaurant;
  log: Log;
}
@Component({
  selector: 'app-logs-table',
  templateUrl: './logs-table.component.html',
  styleUrls: ['./logs-table.component.css']
})
export class LogsTableComponent implements OnInit {

  @Input() restaurantLogs: RestaurantLog[];
  @Input() showRestaurant = true;
  @Output() select = new EventEmitter<Log>();
  constructor() { }

  ngOnInit() {
  }

  clickRow(restaurantLog) {
    this.select.emit(restaurantLog);
  }

}
