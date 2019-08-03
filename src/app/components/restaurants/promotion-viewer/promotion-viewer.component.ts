import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Promotion } from '@qmenu/ui';

@Component({
  selector: 'app-promotion-viewer',
  templateUrl: './promotion-viewer.component.html',
  styleUrls: ['./promotion-viewer.component.css']
})
export class PromotionViewerComponent implements OnInit {
  today = new Date();
  @Input() hideEditButton = false;
  @Input() promotion: Promotion;
  @Input() menus = [];
  @Input() offsetToEST: number;
  @Output() onEdit = new EventEmitter();

  excludedString;

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.promotion) {
      const excludedMenuNames = (this.promotion.excludedMenuIds || []).map(id => (this.menus.filter(m => m.id === id)[0] || {}).name);
      const excludedOrderTypes = this.promotion.excludedOrderTypes || [];
      const excludedPlatforms = this.promotion.excludedPlatforms || [];
      this.excludedString = [...excludedMenuNames, ...excludedOrderTypes, ...excludedPlatforms].join(', ');
    }
  }

  edit() {
    this.onEdit.emit(this.promotion);
  }

}
