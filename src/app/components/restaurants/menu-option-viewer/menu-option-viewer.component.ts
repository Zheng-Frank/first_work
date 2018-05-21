import {
  Component,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges
} from "@angular/core";
import { MenuOption, Item } from "@qmenu/ui";

@Component({
  selector: 'app-menu-option-viewer',
  templateUrl: './menu-option-viewer.component.html',
  styleUrls: ['./menu-option-viewer.component.css']
})
export class MenuOptionViewerComponent implements OnInit, OnChanges {
  @Input() menuOption: MenuOption = new MenuOption();

  groupedMaterialsAndItems = []; // {materials: a,b,c, pricing: {'left,extra,small': 12}]}
  sizes = ["regular"];
  amounts = ["regular"];
  placements = ["whole"];

  constructor() {}

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    this.groupedMaterialsAndItems.length = 0;
    this.sizes.length = 0;
    this.amounts.length = 0;
    this.placements.length = 0;

    if (this.menuOption) {
      const converted = this.convertItemsToGrouped(this.menuOption.items || []);
      this.groupedMaterialsAndItems.push(...converted);

      // recalculate placements, sizes, and amounts
      const sizeSet = new Set();
      const amountSet = new Set();
      const placementSet = new Set();
      const clonedItems: Item[] = this.menuOption.items.map(i => {
        const item = new Item(i);
        delete item.selected;
        item.forSize = item.forSize || "regular";
        item.amount = item.amount || "regular";
        item.placement = item.placement || "whole";
        return item;
      });
      clonedItems.map(item => {
        sizeSet.add(item.forSize);
        amountSet.add(item.amount);
        placementSet.add(item.placement);
      });
      this.placements.push(...Array.from(placementSet));
      this.amounts.push(...Array.from(amountSet));
      this.sizes.push(...Array.from(sizeSet));
    }
  }

  convertItemsToGrouped(items: Item[]) {
    const groupedMaterialsAndItems = [];

    // converting existing menuOption to groupedMaterialsAndItems
    const clonedItems: Item[] = items.map(i => {
      const item = new Item(i);
      delete item.selected;
      item.forSize = item.forSize || "regular";
      item.amount = item.amount || "regular";
      item.placement = item.placement || "whole";
      return item;
    });
    const areObjectsEqual = function(o1, o2) {
      return (
        o1 === o2 ||
        (typeof o1 === 'object'  && typeof o1 === typeof o2 &&
          Object.keys(o2).every(key => key in o1) &&
          Object.keys(o1).every(
            key => key in o2 && areObjectsEqual(o2[key], o1[key])
          ))
      );
    };

    // group by material
    const materialItemsMap = {};
    clonedItems.map(item => {
      materialItemsMap[item.name] = materialItemsMap[item.name] || {};
      materialItemsMap[item.name][item.placement] =
        materialItemsMap[item.name][item.placement] || {};
      materialItemsMap[item.name][item.placement][item.amount] =
        materialItemsMap[item.name][item.placement][item.amount] || {};

      materialItemsMap[item.name][item.placement][item.amount][item.forSize] =
        item.price;
    });
    Object.keys(materialItemsMap).map(key => {
      let handled = false;
      let pricing1 = materialItemsMap[key];
      for (let i = 0; i < groupedMaterialsAndItems.length; i++) {
        let gmi = groupedMaterialsAndItems[i];
        if (areObjectsEqual(pricing1, gmi.pricing)) {
          gmi.materials.push(key);
          handled = true;
          break;
        }
      }
      if (!handled) {
        groupedMaterialsAndItems.push({
          materials: [key],
          pricing: pricing1
        });
      }
    });

    return groupedMaterialsAndItems;
  }
}
