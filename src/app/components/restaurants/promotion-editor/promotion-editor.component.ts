import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Promotion, Menu } from '@qmenu/ui';

@Component({
  selector: 'app-promotion-editor',
  templateUrl: './promotion-editor.component.html',
  styleUrls: ['./promotion-editor.component.css']
})
export class PromotionEditorComponent implements OnInit {

  @Input() promotion: Promotion;
  @Input() offsetToEST: number;
  @Input() isNew = false;
  @Input() menus = [];

  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Output() onDelete = new EventEmitter();

  radioSelection = '$ Discount';
  fromSelectionToggle = false;
  expiry;

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
    }

  };

  withOrderFromList = [];
  categories = [];
  items = [];

  freeItemName = '';
  freeItemNameQty = 1;
  useFreeItemName = false;


  freeItemList = [];
  freeItemListQty = 1;
  useFreeItemList = false;


  constructor() { }

  ngOnInit() {
  }

  // getExpiry() {
  //   if (this.promotion.expiry) {
  //     return this.promotion.expiry['restaurant yyyy-mm-dd'](this.offsetToEST);
  //   }
  //   console.log('restaurant yyyy-mm-dd', new Date()['restaurant yyyy-mm-dd'](this.offsetToEST))
  //   return new Date()['restaurant yyyy-mm-dd'](this.offsetToEST);
  // }

  // expiryChanged(event) {
  //   if (event.target.value) {

  //     // '2017-05-11'
  //     this.promotion.expiry = Date['parseRestaurantDate'](event.target.value, this.offsetToEST);
  //     console.log('this.promotion.expiry', this.promotion.expiry);
  //   }
  // }

  isPromotionValid() {
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

  toggleMenu(menu) {
    if (this.promotion.excludedMenuIds.indexOf(menu.id) >= 0) {
      this.promotion.excludedMenuIds = this.promotion.excludedMenuIds.filter(id => id !== menu.id);
    } else {
      if (this.promotion.excludedMenuIds.length === this.menus.length - 1) {
        this.promotion.excludedMenuIds.pop();
      }
      this.promotion.excludedMenuIds.push(menu.id);
    }
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

  updateWithOrderFromList() {
    const menu: any = {};

    if (this.selected.withOrderFromList.menu) {
      menu.name = this.selected.withOrderFromList.menu;
      if (this.selected.withOrderFromList.category) {
        menu.mcs = [{ name: this.selected.withOrderFromList.category }];
        if (this.selected.withOrderFromList.item) {
          menu.mcs[0].mis = [{ name: this.selected.withOrderFromList.item }]
        }
      }
    }

    if (this.selected.withOrderFromList.menu) {
      this.withOrderFromList = [...this.withOrderFromList, menu];
    }

    this.selected.withOrderFromList = {};
  }

  addFreeItem() {
    const freeItem: any = {};

    if (this.selected.freeItemList) {
      freeItem.name = this.selected.freeItemList.menu;
      if (this.selected.freeItemList.category) {
        freeItem.mcs = [{ name: this.selected.freeItemList.category }];
        if (this.selected.freeItemList.item) {
          freeItem.mcs[0].mis = [{ name: this.selected.freeItemList.item }]
        }
      }
    }

    if (this.selected.freeItemList.menu) {
      this.freeItemList = [...this.freeItemList, freeItem];
    }
    console.log(this.freeItemList);
    this.selected.freeItemList = {};
  }

  deleteOrder(index) {
    this.withOrderFromList.splice(index, 1);
  }

  deleteOrderEligibilityList() {
    this.withOrderFromList = [];
  }

  deleteFreeItem(index) {
    this.freeItemList.splice(index, 1);
  }

  suggestPromotionTitle() {
    let suggestedTitle;
    if (this.promotion.name) {
      return null;
    }
    if (this.radioSelection === '$ Discount') {
      if (this.promotion.amount && this.promotion.orderMinimum && this.withOrderFromList) {
        suggestedTitle = `$${this.promotion.amount} off with $${this.promotion.orderMinimum} min order of select items`
      } else if (this.promotion.amount && this.promotion.orderMinimum) {
        suggestedTitle = `$${this.promotion.amount} off with $${this.promotion.orderMinimum} min order`
      }
    } else if (this.radioSelection === '% Discount') {
      if (this.promotion.percentage && this.promotion.orderMinimum && this.withOrderFromList) {
        suggestedTitle = `${this.promotion.amount}% off with $${this.promotion.orderMinimum} min order of select items`
      } else if (this.promotion.percentage && this.promotion.orderMinimum) {
        suggestedTitle = `${this.promotion.amount}% off with $${this.promotion.orderMinimum} min order`
      }
    } else if (this.radioSelection === "Free Item") {
      if (this.promotion.percentage && this.promotion.orderMinimum && this.withOrderFromList) {
        suggestedTitle = `${this.promotion.amount}% off with $${this.promotion.orderMinimum} min order of select items`
      } else if (this.promotion.percentage && this.promotion.orderMinimum) {
        suggestedTitle = `${this.promotion.amount}% off with $${this.promotion.orderMinimum} min order`
      }
    }
    return suggestedTitle;
  }

  toggleFreeItemCheckbox(event) {
    if (!this.useFreeItemName && !this.useFreeItemList) {
      if (event.target.name === 'itemName') {
        this.useFreeItemName = true;
      } else if (event.target.name === 'itemList') {
        this.useFreeItemList = true;
      }
    } else if (this.useFreeItemName) {
      if (event.target.name === 'itemList') {
        this.useFreeItemList = true;
      }
      this.useFreeItemName = false;
    } else if (this.useFreeItemList) {
      if (event.target.name === 'itemName') {
        this.useFreeItemName = true;
      }
      this.useFreeItemList = false;
    }
  }
}