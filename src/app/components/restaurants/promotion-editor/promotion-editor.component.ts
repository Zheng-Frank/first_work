import { Component, Input, Output, EventEmitter, DoCheck } from '@angular/core';
import { Promotion, Menu } from '@qmenu/ui';

@Component({
  selector: 'app-promotion-editor',
  templateUrl: './promotion-editor.component.html',
  styleUrls: ['./promotion-editor.component.css']
})
export class PromotionEditorComponent implements DoCheck {

  @Input() promotion: Promotion;
  @Input() offsetToEST: number;
  @Input() isNew = false;
  @Input() menus = [];

  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Output() onDelete = new EventEmitter();

  promotionType = '$ Discount';
  eligibility = 'Order Minimum ($)';

  fromSelectionToggle = false;
  expiry;

  freeItemListMaxLength = 3;
  oldPromotionID = null;

  selected: any = {
    withOrderFromList: {
      menu: '',
      category: '',
      item: ''
    },
    freeItemList: {
      menu: '',
      category: '',
      item: ''
    },
    percentDiscountList: {
      menu: '',
      category: '',
      item: ''
    }

  };

  withOrderFromList = [];
  categories = [];
  items = [];

  freeItemName = '';

  useFreeItemList = false;

  freeItemList = [];
  percentDiscountList = [];


  constructor() { }

  ngDoCheck() {
    if (this.promotion) {
      if (!this.oldPromotionID && !this.promotion.id) {
        // A newly created promotion has no id
        this.oldPromotionID = 'New Promo';
        this.onNewPromotionLoaded();
      } else if (!this.oldPromotionID) {
        this.oldPromotionID = this.promotion.id;
        this.onNewPromotionLoaded();
      } else if (this.oldPromotionID && this.promotion.id) {
        if (this.oldPromotionID !== this.promotion.id) {
          this.oldPromotionID = this.promotion.id;
          this.onNewPromotionLoaded();
        }
      }
    }
  }

  onNewPromotionLoaded() {
    this.promotionType = '$ Discount';
    this.eligibility = 'Order Minimum ($)';
    if (this.promotion.percentage && this.promotion.amount === 0) {
      this.promotionType = '% Discount';
    } else if (this.promotion.freeItemName || (this.promotion.freeItemList || []).length) {
      this.promotionType = 'Free Item';
    }
    if ((this.promotion.withOrderFromList || []).length) {
      this.eligibility = 'Order of Select Item(s)';
    }
    if ((this.promotion.freeItemList || []).length) {
      this.useFreeItemList = true;
    }
  }

  getExpiry() {
    if (this.promotion.expiry) {
      return this.promotion.expiry['restaurant yyyy-mm-dd'](this.offsetToEST);
    }
    console.log('restaurant yyyy-mm-dd', new Date()['restaurant yyyy-mm-dd'](this.offsetToEST))
    return new Date()['restaurant yyyy-mm-dd'](this.offsetToEST);
  }

  // expiryChanged(event) {
  //   if (event.target.value) {

  //     // '2017-05-11'
  //     this.promotion.expiry = Date['parseRestaurantDate'](event.target.value, this.offsetToEST);
  //     console.log('this.promotion.expiry', this.promotion.expiry);
  //   }
  // }

  isPromotionValid() {
    if (!this.promotionType || !this.eligibility) {
      return false;
    }

    if (!this.promotion.amount && !this.promotion.percentage && !(this.promotion.freeItemName || '').length && !(this.promotion.freeItemList || []).length) {
      return false;
    }
    if (!this.promotion.orderMinimum && !(this.promotion.withOrderFromList || []).length) {
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


  onMenuSelected(menuName, subproperty) {
    this.selected[subproperty].menu = menuName;

    if (!this.selected[subproperty].menu) {
      this.selected[subproperty].category = this.selected[subproperty].item = '';
      this.categories = this.items = [];
    }

    const menu = this.menus.find(menu => String(menu.name).trim() === String(menuName).trim());

    if (menu) {
      this.categories = menu.mcs || [];
      this.items = [];
    }
  }

  onCategorySelected(categoryName, subproperty) {
    this.selected[subproperty].category = categoryName;

    if (!this.selected[subproperty].category) {
      this.items = [];
      this.selected[subproperty].category = this.selected[subproperty].item = '';
    }

    const menu = this.menus.find(menu => String(menu.name).trim() === String(this.selected[subproperty].menu).trim());
    if (menu) {
      const categories = menu.mcs.find(cat => cat.name === categoryName);
      if (categories) {
        const items = categories.mis;
        if (items) {
          this.items = items;
        }
      }
    }
  }

  onItemSelected(itemName, subproperty) {
    this.selected[subproperty].item = itemName;
  }

  addEntryToList(listName) {
    const newEntry: any = {};

    if (this.selected[listName]) {
      newEntry.name = this.selected[listName].menu;
      if (this.selected[listName].category) {
        newEntry.mcs = [{ name: this.selected[listName].category }];
        if (this.selected[listName].item) {
          newEntry.mcs[0].mis = [{ name: this.selected[listName].item }]
        }
      }
    }

    if (this.selected[listName].menu) {
      this.promotion[listName] = [...this.promotion[listName] || [], newEntry];
    }
    this.selected[listName] = {};
  }

  deleteEntryFromList(listName, index) {
    if (this.promotion[listName] && this.promotion[listName][index]) {
      this.promotion[listName].splice(index, 1);
    }
  }

  validatePromotionNumbers() {
    if (this.promotionType === '$ Discount' && this.eligibility === 'Order Minimum ($)') {
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
    const dollar = "Order Minimum ($)";
    const select = "Order of Select Item(s)";

    if (this.promotionType === '$ Discount') {
      if (this.promotion.amount && this.eligibility === select && (this.promotion.withOrderFromList || []).length) {
        suggestedTitle = `$${this.promotion.amount} off with order from `;
        if (this.promotion.withOrderFromList.length === 1) {
          suggestedTitle += this.promotionListEntryToString(this.promotion.withOrderFromList[0]);
        } else {
          this.promotion.withOrderFromList.forEach((entry, i) => {
            if (i === this.promotion.withOrderFromList.length - 1) {
              suggestedTitle += 'or ' + this.promotionListEntryToString(entry);
            } else {
              suggestedTitle += this.promotionListEntryToString(entry) + ', ';
            }
          })
        }
      } else if (this.promotion.amount && this.promotion.orderMinimum && this.eligibility === dollar) {
        suggestedTitle = `$${this.promotion.amount} off with $${this.promotion.orderMinimum} min order`
      }
    } else if (this.promotionType === '% Discount') {
      if (this.promotion.percentage && this.eligibility === select && (this.promotion.withOrderFromList || []).length && (this.promotion.percentDiscountList || []).length) {
        suggestedTitle = `${this.promotion.percentage}% off `;
        if (this.promotion.percentDiscountList.length === 1) {
          suggestedTitle += `${this.promotionListEntryToString(this.promotion.percentDiscountList[0])} `
        } else {
          this.promotion.percentDiscountList.forEach((entry, i) => {
            if (i === this.promotion.percentDiscountList.length - 1) {
              suggestedTitle += 'and ' + this.promotionListEntryToString(entry);
            } else {
              suggestedTitle += this.promotionListEntryToString(entry) + ', ';
            }
          });
        }
        suggestedTitle += ' with order from ';
        if (this.promotion.withOrderFromList.length === 1) {
          suggestedTitle += this.promotionListEntryToString(this.promotion.withOrderFromList[0]);
        } else {
          this.promotion.withOrderFromList.forEach((entry, i) => {
            if (i === this.promotion.withOrderFromList.length - 1) {
              suggestedTitle += 'or ' + this.promotionListEntryToString(entry);
            } else {
              suggestedTitle += this.promotionListEntryToString(entry) + ', ';
            }
          })
        }
      } else if (this.promotion.percentage && this.eligibility === select && (this.promotion.withOrderFromList || []).length) {
        suggestedTitle = `${this.promotion.percentage}% off with order from `;
        if (this.promotion.withOrderFromList.length === 1) {
          suggestedTitle += this.promotionListEntryToString(this.promotion.withOrderFromList[0]);
        } else {
          this.promotion.withOrderFromList.forEach((entry, i) => {
            if (i === this.promotion.withOrderFromList.length - 1) {
              suggestedTitle += 'or ' + this.promotionListEntryToString(entry);
            } else {
              suggestedTitle += this.promotionListEntryToString(entry) + ', ';
            }
          })
        }
      } else if (this.promotion.percentage && (this.promotion.percentDiscountList || []).length && this.eligibility === dollar && this.promotion.orderMinimum) {
        suggestedTitle = `${this.promotion.percentage}% off `;
        if (this.promotion.percentDiscountList.length === 1) {
          suggestedTitle += `${this.promotionListEntryToString(this.promotion.percentDiscountList[0])} `
        } else {
          this.promotion.percentDiscountList.forEach((entry, i) => {
            if (i === this.promotion.percentDiscountList.length - 1) {
              suggestedTitle += 'and ' + this.promotionListEntryToString(entry);
            } else {
              suggestedTitle += this.promotionListEntryToString(entry) + ', ';
            }
          });
        }
        suggestedTitle += ` with $${this.promotion.orderMinimum} min order`;
      } else if (this.promotion.percentage && this.eligibility === dollar && this.promotion.orderMinimum) {
        suggestedTitle = `${this.promotion.percentage}% off with $${this.promotion.orderMinimum} min order`;
      }
    } else if (this.promotionType === "Free Item") {
      if (((this.promotion.freeItemList || []).length) && (this.promotion.withOrderFromList || []).length && this.eligibility === select) {
        suggestedTitle = 'Free ';
        if (this.promotion.freeItemList.length === 1) {
          suggestedTitle += this.promotionListEntryToString(this.promotion.freeItemList[0]);
        } else {
          this.promotion.freeItemList.forEach((entry, i) => {
            if (i === this.promotion.freeItemList.length - 1) {
              suggestedTitle += 'or ' + this.promotionListEntryToString(entry);
            } else {
              suggestedTitle += this.promotionListEntryToString(entry) + ', ';
            }
          })
        }
        suggestedTitle += ' with order from ';
        if (this.promotion.withOrderFromList.length === 1) {
          suggestedTitle += this.promotionListEntryToString(this.promotion.withOrderFromList[0]);
        } else {
          this.promotion.withOrderFromList.forEach((entry, i) => {
            if (i === this.promotion.withOrderFromList.length - 1) {
              suggestedTitle += 'or ' + this.promotionListEntryToString(entry);
            } else {
              suggestedTitle += this.promotionListEntryToString(entry) + ', ';
            }
          })
        }
      } else if ((this.promotion.freeItemList || []).length && this.promotion.orderMinimum && this.eligibility === dollar) {
        suggestedTitle = 'Free ';
        if (this.promotion.freeItemList.length === 1) {
          suggestedTitle += this.promotionListEntryToString(this.promotion.freeItemList[0]);
        } else {
          this.promotion.freeItemList.forEach((entry, i) => {
            if (i === this.promotion.freeItemList.length - 1) {
              suggestedTitle += 'or ' + this.promotionListEntryToString(entry);
            } else {
              suggestedTitle += this.promotionListEntryToString(entry) + ', ';
            }
          })
        }
        suggestedTitle += ` with $${this.promotion.orderMinimum} min order`
      } else if (this.promotion.freeItemName && this.promotion.orderMinimum && this.eligibility === dollar && !this.useFreeItemList) {
        suggestedTitle = `Free ${this.promotion.freeItemName} with $${this.promotion.orderMinimum} min order`;
      } else if (this.promotion.freeItemName && (this.promotion.withOrderFromList || []).length && this.eligibility === select && !this.useFreeItemList) {
        suggestedTitle = `Free ${this.promotion.freeItemName} with order from `;
        if (this.promotion.withOrderFromList.length === 1) {
          suggestedTitle += this.promotionListEntryToString(this.promotion.withOrderFromList[0]);
        } else {
          this.promotion.withOrderFromList.forEach((entry, i) => {
            if (i === this.promotion.withOrderFromList.length - 1) {
              suggestedTitle += 'or ' + this.promotionListEntryToString(entry);
            } else {
              suggestedTitle += this.promotionListEntryToString(entry) + ', ';
            }
          })
        }
      }


    }
    return suggestedTitle;
  }

  promotionListEntryToString(entry) {
    if (!entry.mcs) {
      return entry.name.trim();
    } else {
      if (entry.mcs[0].mis) {
        return `${entry.name.trim()}>${entry.mcs[0].name.trim()}>${entry.mcs[0].mis[0].name.trim()}`;
      } else {
        return `${entry.name.trim()}>${entry.mcs[0].name.trim()}`;
      }
    }
  }

  useSuggestedTitle() {
    this.promotion.name = this.suggestPromotionTitle();
  }

  removeUnwantedFields() {
    if (this.promotion.name && this.promotion.name.length > 100) {
      this.promotion.name = this.promotion.name.slice(0, 100) + '...';
    }
    if (this.promotionType === '$ Discount') {
      this.promotion.freeItemList = [];
      this.promotion.freeItemName = '';
      this.promotion.percentage = 0;
      this.promotion.percentDiscountList = [];
    } else if (this.promotionType === '% Discount') {
      this.promotion.amount = 0;
      this.promotion.freeItemList = [];
      this.promotion.freeItemName = '';
    } else if (this.promotionType === 'Free Item') {
      this.promotion.amount = 0;
      this.promotion.percentage = 0;
      this.promotion.percentDiscountList = [];
    }

    if (this.eligibility === 'Order Minimum ($)') {
      this.promotion.withOrderFromList = [];
    } else if (this.eligibility === 'Order of Select Item(s)') {
      this.promotion.orderMinimum = 0;
    }
  }
}