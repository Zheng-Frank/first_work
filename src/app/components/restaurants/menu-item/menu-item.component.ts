import { Component, OnInit, Input } from '@angular/core';
import { Mi, MenuOption, Menu, Restaurant} from '@qmenu/ui';

@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.css']
})
export class MenuItemComponent implements OnInit {
  @Input() mi: Mi;
  @Input() menuOptions: MenuOption[] = [];
  @Input() menu: Menu;
  @Input() restaurant: Restaurant;

  constructor() { }

  ngOnInit() {
  }

  hasInventory() {
    // value is of undefined, null, or number. Only if it's number that we have inventory control
    return typeof this.mi.inventory === 'number';
  }

  getMiImageUrl(mi: Mi) {
    // let's just retrieve the last uploaded'
    if (mi.imageObjs && mi.imageObjs.length > 0) {
      return mi.imageObjs[mi.imageObjs.length - 1].thumbnailUrl;
    }
    return '';
  }
  getSpicy() {
    if (this.mi.flavors && this.mi.flavors['Spicy']) {
      return Array.apply(null, { length: +this.mi.flavors['Spicy'] }).map(Number.call, Number);
    }
    return undefined;
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
  getMinCost() {
    return this.mi.getMinCost(this.restaurant);
  }
  getMaxCost() {
    return this.mi.getMaxCost(this.restaurant);
  }

}
