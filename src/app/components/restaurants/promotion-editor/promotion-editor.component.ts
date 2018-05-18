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

  expiry;

  constructor() { }

  ngOnInit() {
  }

  getExpiry() {
    if (this.promotion.expiry) {
      return this.promotion.expiry['restaurant yyyy-mm-dd'](this.offsetToEST);
    }
    return new Date()['restaurant yyyy-mm-dd'](this.offsetToEST);
  }

  expiryChanged(event) {
    if (event.target.value) {
      // '2017-05-11'
      this.promotion.expiry = Date['parseRestaurantDate'](event.target.value, this.offsetToEST);
    }
  }

  isPromotionValid() {
    return this.promotion.name;
  }

  menuToggled(event, menu) {
    if (this.promotion.excludedMenuIds.indexOf(menu.id) >= 0) {
      this.promotion.excludedMenuIds = this.promotion.excludedMenuIds.filter(id => id !== menu.id);
    } else {
      this.promotion.excludedMenuIds.push(menu.id);
    }
  }

  isMenuIncluded(menu) {
    return !this.promotion.excludedMenuIds.some(id => menu.id === id);
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
      this.promotion.expiry = new Date();
      // making it expire at next month
      this.promotion.expiry.setMonth(this.promotion.expiry.getMonth() + 1);
    }

    this.onDone.emit(this.promotion);
  }

}
