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

  freeItemList = [];
  applicableItems = [];

  constructor() { }

  ngOnChanges(change) {
    if (change.promotion && change.promotion.currentValue) {
      this.openPromotionInEditor(change.promotion.currentValue);
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

  unflattenList(list) {
    const result = [];
    (list || []).map(flatItem => {
      const { menu, mc, mi } = flatItem;
      let [matchedMenu] = result.filter(m => m.name === menu.name);
      if (!matchedMenu) {
        matchedMenu = JSON.parse(JSON.stringify(menu));
        result.push(matchedMenu);
      }
      if (mc) {
        matchedMenu.mcs = matchedMenu.mcs || [];
        let [matchedMc] = matchedMenu.mcs.filter(m => m.name === mc.name);
        if (!matchedMc) {
          matchedMc = JSON.parse(JSON.stringify(mc));
          matchedMenu.mcs.push(matchedMc);
        }
        if (mi) {
          matchedMc.mis = matchedMc.mis || [];
          let [matchedMi] = matchedMc.mis.filter(m => m.name === mi.name);
          if (!matchedMi) {
            matchedMi = JSON.parse(JSON.stringify(mi));
            matchedMc.mis.push(matchedMi);
          }
        }
      }
    });
    return result;
  }

  openPromotionInEditor(promotion) {
    // First, detect if we have a brand new promo (one with no id), and if so, reset editor settings back to defaults.
    if (!promotion.id) {
      this.promotionType = '$ Discount';
      this.freeItemList = [];
      this.applicableItems = [];
      return;
    }
    // Otherwise, we set editor parameters based on promotion data so the correct UI panes are open when the promo loads.
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
    // Finally, "unflatten" the promotion lists and assign them to our locally bound variables. 
    this.freeItemList = this.unflattenList(promotion.freeItemList);
    this.applicableItems = this.unflattenList(promotion.applicableItems);
  }

  isPromotionValid() {
    if (!this.promotionType) {
      return false;
    }

    if (!this.promotion.orderMinimum) {
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
    if (this.promotion.name && this.promotion.name.length > 100) {
      this.promotion.name = this.promotion.name.slice(0, 97) + '...';
    }
    this.removeUnwantedFields();
    this.promotion.freeItemList = this.flattenList(this.freeItemList) || [];
    this.promotion.applicableItems = this.flattenList(this.applicableItems) || [];

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
    let suggestedTitle = '';
    if (this.promotion.name) {
      return null;
    } else if (!this.validatePromotionNumbers()) {
      return null;
    }

    if ((this.applicableItems || []).length) {
      const applicableItems = this.flattenList(this.applicableItems);
      if (this.promotion.amount && this.promotionType === '$ Discount') {
        suggestedTitle = `$${this.promotion.amount} off with $${this.promotion.orderMinimum} min. purchase of`;
      } else if (this.promotion.percentage && this.promotionType === '% Discount') {
        suggestedTitle = `${this.promotion.percentage}% off with $${this.promotion.orderMinimum} min. purchase of`;
      } else if ((this.flattenList(this.freeItemList) || []).length === 1 && this.promotionType === 'Free Item') {
        const flattenedList = this.flattenList(this.freeItemList);
        suggestedTitle = `Free ${flattenedList[0].mi.name} with $${this.promotion.orderMinimum} min. purchase of`;
      } else if ((this.flattenList(this.freeItemList) || []).length > 1 && this.promotionType === 'Free Item') {
        suggestedTitle = `Choice of free item with $${this.promotion.orderMinimum} min. purchase of`;
      }
      if (applicableItems.length === 1) {
        applicableItems.forEach(item => {
          if (item.mc) {
            if (item.mi) {
              suggestedTitle += ` ${item.mi.name}`
              return;
            }
            suggestedTitle += ` items from ${item.mc.name}`
            return;
          }
          suggestedTitle += ` items from ${item.menu.name}`
          return;
        });
      } else {
        applicableItems.forEach((item, i) => {
          // The last entry in the list gets special treatment.
          if (i === applicableItems.length - 1) {
            if (item.mc) {
              if (item.mi) {
                suggestedTitle += ` & ${item.mi.name}`
                return;
              }
              suggestedTitle += ` & items from ${item.mc.name}`
              return;
            }
            suggestedTitle += ` & items from ${item.menu.name}`
            return;
          } else {
            if (item.mc) {
              if (item.mi) {
                suggestedTitle += ` ${item.mi.name},`
                return;
              }
              suggestedTitle += ` items from ${item.mc.name},`
              return;
            }
            suggestedTitle += ` items from ${item.menu.name},`
            return;
          }
        });
      }
    } else { // no applicable items list
      if (this.promotion.amount && this.promotionType === '$ Discount') {
        suggestedTitle = `$${this.promotion.amount} off with $${this.promotion.orderMinimum} min. purchase`;
      } else if (this.promotion.percentage && this.promotionType === '% Discount') {
        suggestedTitle = `${this.promotion.percentage}% off with $${this.promotion.orderMinimum} min. purchase`;
      } else if ((this.flattenList(this.freeItemList) || []).length === 1 && this.promotionType === 'Free Item') {
        const flattenedList = this.flattenList(this.freeItemList);
        suggestedTitle = `Free ${flattenedList[0].mi.name} with $${this.promotion.orderMinimum} min. purchase`;
      } else if ((this.flattenList(this.freeItemList) || []).length > 1 && this.promotionType === 'Free Item') {
        suggestedTitle = `Choice of free item with $${this.promotion.orderMinimum} min. purchase`;
      }
    }
    /* We don't want really long promotion titles, so if our algorithmically-suggested title is too long, 
    we're going to return null, which makes the user come up with their own title. */
    if (suggestedTitle.length > 80) {
      return null
    }
    return suggestedTitle;
  }

  useSuggestedTitle() {
    this.promotion.name = this.suggestPromotionTitle();
  }

  removeUnwantedFields() {
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