import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-monitoring-dashboard',
  templateUrl: './monitoring-dashboard.component.html',
  styleUrls: ['./monitoring-dashboard.component.css']
})
export class MonitoringDashboardComponent implements OnInit {

  monitoredItem = 'Placeholder';
  constructor() { }

  ngOnInit() {
  }
}
