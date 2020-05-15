import { Component, OnInit, Input } from '@angular/core';
import { DashboardItem } from 'src/app/classes/dashboard-item';

@Component({
  selector: 'app-dashboard-item',
  templateUrl: './dashboard-item.component.html',
  styleUrls: ['./dashboard-item.component.css']
})
export class DashboardItemComponent implements OnInit {

  @Input() item: DashboardItem;
  displayingJson = false;
  displayingMore = false;
  now = new Date();
  constructor() { }

  ngOnInit() {
  }

  getRows() {
    if (this.displayingMore) {
      return this.item.rows;
    } else {
      return this.item.rows.slice(0, 4);
    }
  }

}
