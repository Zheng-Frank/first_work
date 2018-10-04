import {
  Component,
  ViewChild,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges
} from "@angular/core";
import { OrderItem, Order, MenuOption } from "@qmenu/ui";

@Component({
  selector: "app-order-items",
  templateUrl: "./order-items.component.html",
  styleUrls: ["./order-items.component.css"]
})
export class OrderItemsComponent implements OnInit, OnChanges {
  @Input() order: Order;

  constructor() {}

  ngOnInit() {}
  ngOnChanges(changes: SimpleChanges) {}

  getSelectedMenuOptions(oi: OrderItem) {
    return []
      .concat(oi.miSelectedMenuOptions || [])
      .concat(oi.mcSelectedMenuOptions || []);
  }

  getPlacementGroupedItems(mo: MenuOption) {
    // name : items
    const placementSet = new Set();

    const dict = {}; // placement: items
    mo.items.map(i => {
      const placement = i.placement || "whole";
      placementSet.add(placement);

      dict[placement] = dict[placement] || [];
      if (i.selected) {
        dict[placement].push(i);
      }
    });

    // sort items by name
    Object.keys(dict).map(key => {
      dict[key].sort((i1, i2) => {
        if (i1.name > i2.name) {
          return 1;
        } else if (i1.name < i2.name) {
          return -1;
        }
        return 0;
      });
    });

    const sequence = ["left", "whole", "right"];
    return {
      placements: Array.from(placementSet).sort(
        (p1, p2) =>
          sequence.indexOf(p1.toLowerCase()) -
          sequence.indexOf(p2.toLowerCase())
      ),
      dict: dict
    };
  }

  getPlacementClass(placement) {
    switch (placement.toLowerCase()) {
      case "left":
        return "fa fa-adjust fa-rotate-180";
      case "right":
        return "fa fa-adjust";
      default:
        return "fa fa-circle";
    }
  }
}
