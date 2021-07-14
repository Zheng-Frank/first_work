import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Mc, Mi, OrderItem, Restaurant, Menu, MenuOption } from '@qmenu/ui';
import { Helper } from '../../../classes/helper';

@Component({
  selector: 'app-menu-category',
  templateUrl: './menu-category.component.html',
  styleUrls: ['./menu-category.component.css']
})
export class MenuCategoryComponent implements OnInit {
  @Input() mc: Mc;
  @Input() menu: Menu;
  @Input() menuOptions: MenuOption[] = [];
  @Input() serveTimeFilter: string;
  @Output() onMiClicked = new EventEmitter();
  @Output() onMcClicked = new EventEmitter();
  @Output() onEditAllMenuItems = new EventEmitter();
  @Output() onSortMis = new EventEmitter();
  @Output() onAdjustItemNumber = new EventEmitter();
  @Input() restaurant: Restaurant;

  constructor() { }

  ngOnInit() {
  }

  
  adjustMenuItemsNumber(){
    this.onAdjustItemNumber.emit(this.mc);
  }

  sortMis() {
    this.onSortMis.emit(this.mc);
  }

  getDescriptionOfMenuOptionId(menuOptionId) {
    let desc = '';
    this.menuOptions.forEach(mo => {
      if (mo.id === menuOptionId) {
        desc += mo.name + ': ';
        let items = mo.items.map(i => i.name);
        if (items.length > 5) {
          items.length = 4;
          desc += items.join(', ') + '...';
        } else {
          desc += items.join(', ');
        }
      }
    });
    return desc;
  }

  getOptions(options: any) {
    return options.map(i => i.name).join(', ');
  }

  //to feed itemOrder popup
  getSelectedOrderItem(item: Mi): OrderItem {

    //create a new order item
    let orderItem = new OrderItem();
    orderItem.mcInstance = new Mc(this.mc); //JSON.parse(JSON.stringify(category));
    orderItem.miInstance = new Mi(item); //JSON.parse(JSON.stringify(item));
    orderItem.menuName = this.menu.name;

    // clone selectable menuOptions
    orderItem.mcSelectedMenuOptions = (this.restaurant.menuOptions || [])
      .filter(mo => orderItem.mcInstance.menuOptionIds && orderItem.mcInstance.menuOptionIds.indexOf(mo.id) >= 0)
      .map(mo => new MenuOption(mo));
    orderItem.miSelectedMenuOptions = (this.restaurant.menuOptions || [])
      .filter(mo => orderItem.miInstance.menuOptionIds && orderItem.miInstance.menuOptionIds.indexOf(mo.id) >= 0)
      .map(mo => new MenuOption(mo));

    orderItem.quantity = 1;
    orderItem.specialInstructions = null;

    //making default size as the middle one
    let defaultSizeIndex = Math.floor(orderItem.miInstance.sizeOptions.length / 2);
    orderItem.miInstance.sizeOptions[defaultSizeIndex].selected = true;

    //this.orderItem = orderItem;
    return orderItem;
  }

  clickMi(item: Mi) {
    this.onMiClicked.emit({ mc: this.mc, mi: item });
  }

  getMcImageUrl(mc: Mc) {
    // let's just retrieve the last uploaded'
    if (mc.images && mc.images.length > 0) {
      return Helper.getNormalResUrl(mc.images[mc.images.length - 1]);
    }
    return '';
  }

  clickMc() {
    this.onMcClicked.emit(this.mc);
  }

  editAll() {
    this.onEditAllMenuItems.emit(this.mc);
  }
}
