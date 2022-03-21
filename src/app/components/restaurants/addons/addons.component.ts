import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Item, Restaurant} from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
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
  editing: Item;
  editingIndex = -1;

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
    let addons = [...(this.restaurant.addons || [])].splice(this.editingIndex, 1);
    return name && price && price > 0 && !addons.some(a => this.trim(a.name) === this.trim(name));
  }

  editAddon(addon: Item) {
    // we use a copy of mo:
    let copy: Item;
    let { addons } = this.restaurant;
    if (!addon) {
      copy = new Item();
      this.editingIndex = (addons || []).length;
    } else {
      copy = new Item(addon);
      this.editingIndex = addons.indexOf(addon)
    }
    this.editing = copy;
    this.addonEditModal.show();
  }

  save() {
    const addons = (this.restaurant.addons || []).slice(0);
    this.editing.name = this.trim(this.editing.name);
    addons[this.editingIndex] = this.editing;

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
