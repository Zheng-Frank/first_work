import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Item, Restaurant} from '@qmenu/ui';
import { ModalComponent, SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import {ApiService} from '../../../services/api.service';
import {environment} from '../../../../environments/environment';
import {AlertType} from '../../../classes/alert-type';
import {GlobalService} from '../../../services/global.service';

@Component({
  selector: 'app-addons',
  templateUrl: './addons.component.html',
  styleUrls: ['./addons.component.css']
})
export class AddonsComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @ViewChild('addonEditModal') addonEditModal: ModalComponent;
  editing: any;
  editingIndex = -1;
  @ViewChild("selectorMinQuantity") selectorMinQuantity: SelectorComponent;
  @ViewChild("selectorMaxQuantity") selectorMaxQuantity: SelectorComponent;

  maxQuantities = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Any"];
  minQuantities = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  getAddOns() {
    if (this.restaurant && this.restaurant.addons) {
      return [...this.restaurant.addons].sort((i1, i2) => i1.name.localeCompare(i2.name));
    }
    return [];
  }

  trim(str) {
    return str.replace(/\s+/g, ' ').trim();
  }

  isValid() {
    let { name, price } = this.editing;
    let addons = [...(this.restaurant.addons || [])];
    addons.splice(this.editingIndex, 1);
    return name && price && price > 0 && !addons.some(a => this.trim(a.name) === this.trim(name));
  }

  editAddon(addon: any) {
    let { addons } = this.restaurant;
    let copy;
    if (!addon) {
      copy = {}
      this.editingIndex = (addons || []).length;
    } else {
      copy = {...addon}
      this.editingIndex = addons.indexOf(addon)
    }
    this.editing = copy;
    setTimeout(() => {
      this.selectorMinQuantity.selectedValues.length = 0;
      this.selectorMaxQuantity.selectedValues.length = 0;
      if (copy.minQuantity) {
        this.selectorMinQuantity.selectedValues.push(
          copy.minQuantity < 0 ? "Any" : copy.minQuantity + ""
        );
      }
      if (copy.maxQuantity) {
        this.selectorMaxQuantity.selectedValues.push(
          copy.maxQuantity < 0 ? "Any" : copy.maxQuantity + ""
        );
      }
    }, 0)
    this.addonEditModal.show();
  }

  save() {
    const addons = (this.restaurant.addons || []).slice(0);
    this.editing.name = this.trim(this.editing.name);
    addons[this.editingIndex] = {
      ...this.editing,
      minQuantity: Number(this.selectorMinQuantity.selectedValues[0] || 0),
      maxQuantity: Number(this.selectorMaxQuantity.selectedValues[0] || -1)
    }

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {_id: this.restaurant['_id']},
        new: {_id: this.restaurant['_id'], addons}
      }]).subscribe(
      result => {
        this.restaurant.addons = addons;
        this._global.publishAlert(AlertType.Success, "Updated successfully");
      },
      error => {
        this._global.publishAlert(AlertType.Danger, "Error updating to DB");
      }
    );
    this.addonEditModal.hide();
  }

  cancel() {
    this.addonEditModal.hide();
    this.editing = undefined;
    this.editingIndex = -1;
  }

  remove() {
    let { addons } = this.restaurant;
    let newAddons = JSON.parse(JSON.stringify(addons));
    newAddons.splice(this.editingIndex, 1);
    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
      old: {_id: this.restaurant['_id'], menuOptions: addons},
      new: {_id: this.restaurant['_id'], menuOptions: newAddons}
    }]).subscribe(
        result => {
          this.restaurant.addons = newAddons;
          this._global.publishAlert(AlertType.Success, "Updated successfully");
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
    this.addonEditModal.hide();
  }
}
