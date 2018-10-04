import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Log } from '../../../classes/log';

@Component({
  selector: 'app-logs-table',
  templateUrl: './logs-table.component.html',
  styleUrls: ['./logs-table.component.css']
})
export class LogsTableComponent implements OnInit {

  @Input() logs: Log[];
  @Output() select = new EventEmitter<Log>();
  constructor() { }

  ngOnInit() {
  }

  clickRow(log) {
    this.select.emit(log);
  }

}
