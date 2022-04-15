import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Item, Mc, Menu, Mi, Restaurant} from '@qmenu/ui';
import { ModalComponent, SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import {ApiService} from '../../../services/api.service';
import {environment} from '../../../../environments/environment';
import {AlertType} from '../../../classes/alert-type';
import {GlobalService} from '../../../services/global.service';

interface Addon {
  id: string,
  name: string,
  price: number
}

@Component({
  selector: 'app-addons',
  templateUrl: './addons.component.html',
  styleUrls: ['./addons.component.css']
})
export class AddonsComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @ViewChild('addonEditModal') addonEditModal: ModalComponent;
  editing: Addon;
  editingIndex = -1;
  @ViewChild("selectorMinQuantity") selectorMinQuantity: SelectorComponent;
  @ViewChild("selectorMaxQuantity") selectorMaxQuantity: SelectorComponent;

  addonMenu: Menu;
  addons: Addon[] = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.init();
  }

  init() {
    this.addonMenu = [...(this.restaurant.menus || [])].find(m => m.type === 'ADDON');
    if (this.addonMenu) {
      this.addons = this.addonMenu.mcs[0].mis.map(({id, name, sizeOptions}) => ({id, name, price: sizeOptions[0].price}));
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
    return name && price >= 0 && !addons.some(a => this.trim(a.name) === this.trim(name));
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
    addons[this.editingIndex] = {...this.editing};
    this.patch(addons);
  }

  cancel() {
    this.addonEditModal.hide();
    this.editing = undefined;
    this.editingIndex = -1;
  }

  remove() {
    let addons = [...this.addons];
    addons.splice(this.editingIndex, 1);
    this.patch(addons);
  }

  patch(addons) {
    let { menus } = this.restaurant, index;
    let newMenus = JSON.parse(JSON.stringify(menus)).map(m => new Menu(m));
    if (this.addonMenu) {
      index = menus.indexOf(this.addonMenu);
    } else {
      this.addonMenu = this.genNewAddonMenu();
      index = menus.length;
    }

    let mcId = this.addonMenu.mcs[0].id, ts = new Date().valueOf();
    this.addonMenu.mcs[0].mis = addons.map(({id, name, price}) => ({id: id || (ts + Math.round(Math.random() * 10000)),  name, category: mcId, nonCustomizable: true, sizeOptions: [{name: "regular", price}]} as Mi));
    newMenus[index] = this.addonMenu;
    this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
      old: {_id: this.restaurant['_id']},
      new: {_id: this.restaurant['_id'], menus: newMenus}
    }]).subscribe(
      result => {
        this.restaurant.menus = newMenus;
        this.init();
        this._global.publishAlert(AlertType.Success, "Updated successfully");
      },
      error => {
        this._global.publishAlert(AlertType.Danger, "Error updating to DB");
      }
    );
    this.addonEditModal.hide();
  }

}
