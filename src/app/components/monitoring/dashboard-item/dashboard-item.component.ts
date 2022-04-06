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

  copy() {
    const contents = [
      (this.item.headers || []).join('\t'),
      ...this.item.rows.map(r => r.join('\t'))
    ];
    const text = contents.join('\n');
    const handleCopy = (e: ClipboardEvent) => {
      // clipboardData 可能是 null
      e.clipboardData && e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      // removeEventListener 要传入第二个参数
      document.removeEventListener('copy', handleCopy);
    };
    document.addEventListener('copy', handleCopy);
    document.execCommand('copy');
    alert('data copied to clipboard');
  }

}
