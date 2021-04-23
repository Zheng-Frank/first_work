import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { Promotion } from '@qmenu/ui';

@Component({
  selector: 'app-promotion-viewer',
  templateUrl: './promotion-viewer.component.html',
  styleUrls: ['./promotion-viewer.component.css']
})
export class PromotionViewerComponent implements OnInit, OnChanges {
  today = new Date();
  @Input() hideEditButton = false;
  @Input() promotionType: string;
  @Input() useFreeItemList: boolean;
  @Input() promotion: Promotion;
  @Input() menus = [];
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

  renderItemFromFlatList(freeItem) {
    if (freeItem.mc) {
      if (freeItem.mi) {
        // menu, mc, and mi defined
        return `${freeItem.menu.name}>${freeItem.mc.name}>${freeItem.mi.name}`;
      }
      // menu and mc defined
      return `${freeItem.menu.name}>${freeItem.mc.name}`;
    }
    //only menu is defined
    return `${freeItem.menu.name}`;
  }

  edit() {
    this.onEdit.emit(this.promotion);
  }

}
