import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Item, Mc, Menu, Restaurant} from '@qmenu/ui';
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
  addonMenu: Menu;
  addons = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.addonMenu = [...(this.restaurant.menus || [])].find(m => m.type === 'ADDON');
    if (this.addonMenu) {
      this.addons = this.addonMenu.mcs.reduce((a, c) => [...a, ...c.mis], []);
    } else {
      this.addons = [];
    }
  }

  trim(str) {
    return str.replace(/\s+/g, ' ').trim();
  }

  isValid() {
    let { name, price } = this.editing;
    let addons = [...this.addons];
    addons.splice(this.editingIndex, 1);
    return name && price && price > 0 && !addons.some(a => this.trim(a.name) === this.trim(name));
  }

  editAddon(addon: any) {
    let copy;
    if (!addon) {
      copy = {}
      this.editingIndex = this.addons.length;
    } else {
      copy = {...addon}
      this.editingIndex = this.addons.indexOf(addon)
    }
    this.editing = copy;
    setTimeout(() => {
      this.selectorMaxQuantity.selectedValues.length = 0;
      if (copy.maxQuantity) {
        this.selectorMaxQuantity.selectedValues.push(
          copy.maxQuantity < 0 ? "Any" : copy.maxQuantity + ""
        );
      }
    }, 0)
    this.addonEditModal.show();
  }

  genNewAddonMenu() {
    let mc = new Mc(), timestamp = new Date().valueOf().toString();
    mc.name = 'Addon Mc';
    mc.id = timestamp + Math.round(Math.random() * 1000);
    mc.mis = [];
    mc.restaurant = this.restaurant._id;
    return {id: timestamp, name: 'Addon Menu', type: 'ADDON', mcs: [mc]} as Menu
  }

  save() {
    const addons = this.addons.slice(0);
    this.editing.name = this.trim(this.editing.name);
    addons[this.editingIndex] = {
      ...this.editing,
      maxQuantity: Number(this.selectorMaxQuantity.selectedValues[0] || -1)
    }
    let menus = this.restaurant.menus, index = menus.length;
    if (this.addonMenu) {
      index = menus.indexOf(this.addonMenu);
    } else {
      this.addonMenu = this.genNewAddonMenu();
    }
    this.addonMenu.mcs[0].mis = this.addons;
    menus[index] = this.addonMenu;
    let oldMenus = JSON.parse(JSON.stringify(menus));
    let newMenus = JSON.parse(JSON.stringify(menus));

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {_id: this.restaurant['_id'], oldMenus},
        new: {_id: this.restaurant['_id'], newMenus}
      }]).subscribe(
      result => {
        this.restaurant.menus = menus;
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
    let { menus } = this.restaurant;
    this.addons.splice(this.editingIndex, 1);
    this.addonMenu.mcs[0].mis = this.addons;
    let index = menus.indexOf(this.addonMenu);
    let newMenus = JSON.parse(JSON.stringify(menus));
    newMenus[index] = this.addonMenu;
    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
      old: {_id: this.restaurant['_id'], menus},
      new: {_id: this.restaurant['_id'], newMenus}
    }]).subscribe(
        result => {
          this.restaurant.menus = newMenus;
          this._global.publishAlert(AlertType.Success, "Updated successfully");
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
    this.addonEditModal.hide();
  }
}
