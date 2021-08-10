import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';

@Component({
  selector: 'app-monitoring-promotion-cell',
  templateUrl: './monitoring-promotion-cell.component.html',
  styleUrls: ['./monitoring-promotion-cell.component.css']
})
export class MonitoringPromotionCellComponent implements OnInit, OnChanges {

  @Input() promotions: any[];
  @Output() validate = new EventEmitter();
  @Output() crawl = new EventEmitter();
  countsText;

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    let counts = {} as any;
    (this.promotions || []).forEach(x => {
      if (!!x.source) {
        counts[x.source] = (counts[x.source] || 0) + 1;
      }
    });
    this.countsText = Object.entries(counts).map(([k, v]) => v + ' from ' + k).join(', ');
  }

}
