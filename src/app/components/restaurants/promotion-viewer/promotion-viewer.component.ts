import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { isType } from '@angular/core/src/type';
import { Promotion } from '@qmenu/ui';

@Component({
  selector: 'app-promotion-viewer',
  templateUrl: './promotion-viewer.component.html',
  styleUrls: ['./promotion-viewer.component.css']
})
export class PromotionViewerComponent implements OnInit {
  today = new Date();
  @Input() hideEditButton = false;
  @Input() promotionType: string;
  @Input() eligibility: string;
  @Input() useFreeItemList: boolean;
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

  itemListToString(list) {
    let listString = '';
    if (list.length === 1) {
      return this.promotionListEntryToString(list[0]);
    } else {
      list.forEach((entry, i) => {
        if (i === list.length - 1) {
          listString += 'or ' + this.promotionListEntryToString(entry);
        } else {
          listString += this.promotionListEntryToString(entry) + ', ';
        }
      })
    }
    return listString;
  }

  freeItemListToString(list) {
    let listString = '';
    if (list.length === 1) {
      return list[0].mcs[0].mis[0].name.trim();
    } else {
      list.forEach((entry, i) => {
        if (i === list.length - 1) {
          listString += 'or ' + entry.mcs[0].mis[0].name.trim();
        } else {
          listString += entry.mcs[0].mis[0].name.trim() + ', ';
        }
      })
    }
    return listString;
  }


  promotionListEntryToString(entry) {
    if (!entry.mcs) {
      return entry.name.trim();
    } else {
      if (entry.mcs[0].mis) {
        return `${entry.name.trim()}➜${entry.mcs[0].name.trim()}➜${entry.mcs[0].mis[0].name.trim()}`;
      } else {
        return `${entry.name.trim()}➜${entry.mcs[0].name.trim()}`;
      }
    }
  }

  edit() {
    this.onEdit.emit(this.promotion);
  }

}
