import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { P } from '@angular/core/src/render3';
import { Promotion, Menu } from '@qmenu/ui';

@Component({
  selector: 'app-promotion-editor',
  templateUrl: './promotion-editor.component.html',
  styleUrls: ['./promotion-editor.component.css']
})
export class PromotionEditorComponent implements OnChanges {

  @Input() promotion: Promotion;
  @Input() isNew = false;
  @Input() menus = [];

  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Output() onDelete = new EventEmitter();

  promotionType = '$ Discount';
  expiry;
  freeItemListMaxLength = 3;
  useFreeItemList = false;

  constructor() { }

  ngOnChanges(change) {
    if (change.promotion && change.promotion.currentValue) {
      this.openCorrectUIPane(change.promotion.currentValue);
    }
  }

  flattenList(list) {
    const result = [];
    (list || []).map(menu => {
      if (menu.mcs && menu.mcs.length > 0) {
        menu.mcs.map(mc => {
          if (mc.mis && mc.mis.length > 0) {
            mc.mis.map(mi => result.push({ menu, mc, mi }));
          } else {
            result.push({ menu, mc });
          }
        });
      } else {
        result.push({ menu });
      }
    });
    return result;
  }

  handleFreeItemEvent(event) {
    this.promotion.freeItemList = event;
  }

  handleApplicableItemEvent(event) {
    this.promotion.applicableItems = event;
  }

  openCorrectUIPane(promotion) {
    if (!promotion.id) {
      this.promotionType = '$ Discount';
      return;
    }

    if (promotion.amount) {
      this.promotionType = '$ Discount';
    } else if (promotion.percentage) {
      this.promotionType = '% Discount';
    } else {
      this.promotionType = 'Free Item';
      if ((promotion.freeItemList || []).length) {
        this.useFreeItemList = true;
      }
    }
  }

  isPromotionValid() {
    if (!this.promotionType) {
      return false;
    }

    if (!this.promotion.amount && !this.promotion.percentage && !(this.promotion.freeItemList || []).length) {
      return false;
    }

    if (!this.validatePromotionNumbers()) {
      return false;
    }

    return this.promotion.name;
  }

  remove() {
    this.onDelete.emit(this.promotion);
  }

  cancel() {
    this.onCancel.emit(this.promotion);
  }

  done() {
    // let's make sure all data are clean
    this.promotion.amount = Math.abs(+this.promotion.amount || 0);
    this.promotion.percentage = Math.abs(+this.promotion.percentage || 0);
    this.promotion.orderMinimum = Math.abs(+this.promotion.orderMinimum || 0);
    this.removeUnwantedFields();
    if (!this.promotion.expiry) {
      if (typeof this.promotion.expiry === 'string') {
        this.promotion.expiry = new Date(this.promotion.expiry);
        // this is UTC, we need to make it local browser (whoever operating this! Assuming same timezone as restaurant owner)
        this.promotion.expiry.setMinutes(this.promotion.expiry.getMinutes() + new Date().getTimezoneOffset());
      }
      // making it expire at next month
      //this.promotion.expiry.setMonth(this.promotion.expiry.getMonth() + 1);
    }
    this.onDone.emit(this.promotion);
  }

  isMenuIncluded(menu) {
    return !this.promotion.excludedMenuIds.some(id => menu.id === id);
  }


  togglePlatform(platform) {
    if (this.isPlatformIncluded(platform)) {
      this.promotion.excludedPlatforms = [];
      this.promotion.excludedPlatforms.push(platform);
    } else {
      this.promotion.excludedPlatforms = this.promotion.excludedPlatforms.filter(p => p !== platform);
    }
  }

  isPlatformIncluded(platform) {
    return !(this.promotion.excludedPlatforms || []).some(p => p === platform);
  }


  toggleOrderType(orderType) {
    if (this.isOrderTypeIncluded(orderType)) {
      if (this.promotion.excludedOrderTypes.length === 2) {
        this.promotion.excludedOrderTypes.pop();
      }
      this.promotion.excludedOrderTypes = this.promotion.excludedOrderTypes || [];
      this.promotion.excludedOrderTypes.push(orderType);
    } else {
      this.promotion.excludedOrderTypes = this.promotion.excludedOrderTypes.filter(ot => ot !== orderType);
    }
  }

  isOrderTypeIncluded(orderType) {
    return !(this.promotion.excludedOrderTypes || []).some(t => t === orderType);
  }

  validatePromotionNumbers() {
    if (!this.promotion.orderMinimum) {
      return false;
    }
    if (this.promotionType === '$ Discount') {
      if (this.promotion.amount > this.promotion.orderMinimum) {
        return false;
      }
    }

    if (this.promotionType === '% Discount') {
      if (this.promotion.percentage >= 90 || this.promotion.percentage < 0 || this.promotion.percentage % 1 !== 0) {
        return false;
      }
    }
    return true;
  }

  suggestPromotionTitle() {
    let suggestedTitle;
    if (this.promotion.name) {
      return null;
    } else if (!this.validatePromotionNumbers()) {
      return null;
    }

    if ((this.promotion.applicableItems || []).length) {
      return null;
    } else { // no applicable items list
      if (this.promotion.amount) {
        suggestedTitle = `$${this.promotion.amount} off with $${this.promotion.orderMinimum} minimum purchase`;
      } else if (this.promotion.percentage) {
        suggestedTitle = `${this.promotion.percentage}% off with $${this.promotion.orderMinimum} minimum purchase`;
      } else if ((this.flattenList(this.promotion.freeItemList) || []).length === 1) {
        const flattenedList = this.flattenList(this.promotion.freeItemList);
        console.log(flattenedList);
        suggestedTitle = `Free ${flattenedList[0].mi.name} with $${this.promotion.orderMinimum} minimum purchase`;
      } else if ((this.flattenList(this.promotion.freeItemList) || []).length > 1) {
        suggestedTitle = `Choice of free item with $${this.promotion.orderMinimum} minimum purchase`;
      }
    }

    return suggestedTitle;
  }

  useSuggestedTitle() {
    this.promotion.name = this.suggestPromotionTitle();
  }

  removeUnwantedFields() {
    if (this.promotion.name && this.promotion.name.length > 100) {
      this.promotion.name = this.promotion.name.slice(0, 97) + '...';
    }
    if (this.promotionType === '$ Discount') {
      this.promotion.freeItemList.length = 0;
      this.promotion.percentage = 0;
    } else if (this.promotionType === '% Discount') {
      this.promotion.amount = 0;
      this.promotion.freeItemList.length = 0;
    } else if (this.promotionType === 'Free Item') {
      this.promotion.amount = 0;
      this.promotion.percentage = 0;
    }
  }
}