import {
  Component,
  OnInit,
  Input,
  Output,
  ViewChild,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from "@angular/core";
import { MenuOption, Item } from "@qmenu/ui";
import { SelectorComponent } from "@qmenu/ui/bundles/qmenu-ui.umd";

@Component({
  selector: "app-menu-option-editor",
  templateUrl: "./menu-option-editor.component.html",
  styleUrls: ["./menu-option-editor.component.css"]
})
export class MenuOptionEditorComponent implements OnInit, OnChanges {
  @Input() menuOption: MenuOption = new MenuOption();

  @Input() sizes = ["regular"];
  @Input() amounts = ["regular"];
  @Input() placements = ["whole"];

  @Output() remove = new EventEmitter();
  @Output() submit = new EventEmitter();
  @Output() cancel = new EventEmitter();

  @ViewChild("selectorMinQuantity") selectorMinQuantity: SelectorComponent;
  @ViewChild("selectorMaxQuantity") selectorMaxQuantity: SelectorComponent;

  maxQuantities = ["1", "2", "3", "4", "5", "6", "7", "8","Any"];
  minQuantities = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];

  constructor() {}

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    this.groupedMaterialsAndItems.length = 0;
    this.sizes.length = 0;
    this.amounts.length = 0;
    this.placements.length = 0;

    if (this.menuOption) {
      // we need to put this in to next rendering cycle since we used ngIf, selectors won't be available
      setTimeout(() => {
        this.selectorMinQuantity.selectedValues.length = 0;
        this.selectorMaxQuantity.selectedValues.length = 0;

        this.selectorMinQuantity.selectedValues.push(
          this.menuOption.minSelection < 0
            ? "Any"
            : this.menuOption.minSelection + ""
        );
        this.selectorMaxQuantity.selectedValues.push(
          this.menuOption.maxSelection < 0
            ? "Any"
            : this.menuOption.maxSelection + ""
        );
      }, 0);

      const converted = this.convertItemsToGrouped(this.menuOption.items || []);
      this.groupedMaterialsAndItems.push(...converted);

      // recalculate placements, sizes, and amounts
      const sizeSet = new Set();
      const amountSet = new Set();
      const placementSet = new Set();
      const clonedItems: Item[] = (this.menuOption.items || []).map(i => {
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

  getString(arr: string[]) {
    return arr.join(", ");
  }

  onEdit(event, arrayObj) {
    const newValuesString = event.newValue;
    arrayObj.length = 0;
    newValuesString
      .split(",")
      .map(v => v.trim())
      .filter(v => v !== "" && v !== null)
      .map(v => arrayObj.push(v));
    // fillup missing
    this.groupedMaterialsAndItems.map(mp => {
      this.menuOption.items = this.menuOption.items || [];
      this.placements.map(placement =>
        this.amounts.map(amount =>
          this.sizes.map(size => {
            mp.pricing[placement] = mp.pricing[placement] || {};
            mp.pricing[placement][amount] = mp.pricing[placement][amount] || {};
            mp.pricing[placement][amount][size] =
              mp.pricing[placement][amount][size] || 0;
          })
        )
      );
    });
  }

  groupedMaterialsAndItems = []; // {materials: a,b,c, pricing: {'left,extra,small': 12}]}

  add() {
    // making sure we ALWAYS have default placement, size, and amount
    if (this.placements.length === 0) {
      this.placements.push("whole");
    }
    if (this.sizes.length === 0) {
      this.sizes.push("regular");
    }
    if (this.amounts.length === 0) {
      this.amounts.push("regular");
    }

    const pricing = {};
    this.placements.map(placement => {
      pricing[placement] = {};
      this.amounts.map(amount => {
        pricing[placement][amount] = {};
        this.sizes.map(size => (pricing[placement][amount][size] = 0));
      });
    });

    this.groupedMaterialsAndItems.push({
      materials: [],
      pricing: pricing
    });
  }

  removeRow(row) {
    this.groupedMaterialsAndItems = this.groupedMaterialsAndItems.filter(
      r => r !== row
    );
  }

  convertGroupedToItems(groupedMaterialsAndItems) {
    const items = [];
    groupedMaterialsAndItems.map(gmi => {
      gmi.materials.map(material => {
        const pricing = gmi.pricing;
        Object.keys(pricing).map(placement => {
          Object.keys(pricing[placement]).map(amount => {
            Object.keys(pricing[placement][amount]).map(size => {
              let item = new Item();
              item.name = material;
              item.placement = placement;
              item.amount = amount;
              item.forSize = size;
              item.price = pricing[placement][amount][size];
              items.push(item);
            });
          });
        });
      });
    });

    if (items.length > 0) {
      // let's remove redundant fields if ALL same
      ["forSize", "amount", "placement"].map(field => {
        const value = items[0][field];
        if (items.every(i => i[field] === value)) {
          items.map(i => delete i[field]);
        }
      });
    }

    return items;
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
        (typeof o1 === "object" &&
          typeof o1 === typeof o2 &&
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

  isValid() {
    return (
      this.menuOption &&
      this.menuOption.name &&
      this.menuOption.items &&
      this.selectorMaxQuantity &&
      this.selectorMinQuantity &&
      this.selectorMaxQuantity.selectedValues.length > 0 &&
      (this.selectorMaxQuantity.selectedValues[0] === "Any" ||
        +this.selectorMaxQuantity.selectedValues[0] >=
          +this.selectorMinQuantity.selectedValues[0])
    );
  }

  formSubmit(event) {
    // convert
    this.menuOption.minSelection =
      +this.selectorMinQuantity.selectedValues[0] || 0;
    this.menuOption.maxSelection =
      +this.selectorMaxQuantity.selectedValues[0] || -1;

    this.menuOption.items = this.convertGroupedToItems(
      this.groupedMaterialsAndItems
    );
    // force convert price to number
    this.menuOption.items.map(i => (i.price = isNaN(+i.price) ? 0 : +i.price));
    this.submit.emit(this.menuOption);
  }

  formCancel(event) {
    this.cancel.emit(this.menuOption);
  }

  formRemove(event) {
    this.remove.emit(event);
  }
}
