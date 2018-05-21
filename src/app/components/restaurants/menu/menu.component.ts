import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Menu, Hour, Mc, Mi, Item, Restaurant } from '@qmenu/ui';
import { Helper } from '../../../classes/helper';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { MenuCategoryEditorComponent } from '../menu-category-editor/menu-category-editor.component';
import { MenuItemEditorComponent } from '../menu-item-editor/menu-item-editor.component';

import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  @Output() onEdit = new EventEmitter();
  @Input() menu: Menu;
  @Input() offsetToEST = 0;
  @Input() restaurant: Restaurant;

  @ViewChild('mcModal') mcModal: ModalComponent;
  @ViewChild('miModal') miModal: ModalComponent;

  @ViewChild('mcEditor') mcEditor: MenuCategoryEditorComponent;
  @ViewChild('miEditor') miEditor: MenuItemEditorComponent;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  getMenuImageUrl() {
    if (this.menu && this.menu.backgroundImageUrl) {
      return Helper.getNormalResUrl(this.menu.backgroundImageUrl);
    }
    return '';
  }

  edit() {
    this.onEdit.emit(this.menu);
  }

  // -------------Mc section------------
  editMc(mc: Mc) {
    // we use a copy of mc:
    let mcCopy: Mc;
    if (!mc) {
      mcCopy = new Mc();
      // preset the sorting order?
      mcCopy.sortOrder = this.menu.mcs.length + 1;
    } else {
      mcCopy = new Mc(mc);
    }
    this.mcEditor.setMc(mcCopy, this.restaurant.menuOptions);
    this.mcModal.show();
  }

  mcDone(mc: Mc) {
    // id == update, no id === new
    const oldMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    // we do not need everything!
    oldMenus.map(menu => menu.mcs = menu.mcs.map(category => ({
      id: category.id,
      name: category.name
    })));

    const newMenus = JSON.parse(JSON.stringify(oldMenus));


    if (!mc.id) {
      // new Mc, just insert!
      mc.id = new Date().valueOf() + '';
      newMenus.map(menu => {
        if (menu.id === this.menu.id) {
          menu.mcs = menu.mcs || [];
          menu.mcs.push(new Mc(mc));
        }
      });
    } else {
      // old Mc, replace everything
      newMenus.map(menu => menu.mcs.map(category => {
        if (category.id === mc.id) {
          Object.keys(mc).map(key => key !== "mis" && (category[key] = mc[key]));
        }
      }));
    }

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.restaurant['_id'],
          menus: oldMenus
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus
        }
      }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.menu.mcs.map(category => {
            if (category.id === mc.id) {
              Object.keys(mc).map(key => key !== 'mis' && (category[key] = mc[key]));
            }
          });
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );

          this.menu.sortMcsAndMis();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

    this.mcModal.hide();
  }

  mcCancel(mc: Mc) {
    this.mcModal.hide();
  }

  mcDelete(mc: Mc) {
    // menus -> menu -> mc
    const oldMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    // menus -> menu -> mc. We don't need to keep everything, just id is enough
    oldMenus.map(menu => menu.mcs = menu.mcs.map(category => category.id));

    const newMenus = oldMenus.map(menu => menu.mcs = menu.mcs.filter(category => category.id !== mc.id));

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.restaurant['_id'],
          menus: oldMenus
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus
        }
      }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.menu.mcs = this.menu.mcs.filter(m => m.id !== mc.id);
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

    this.mcModal.hide();
  }

  // -----------------Mi section--------------
  editMi(params) {
    let menu = this.menu;
    let miCopy: Mi;
    if (!params.mi) {
      miCopy = new Mi();
      miCopy.sortOrder = params.mc.mis ? params.mc.mis.length + 1 : 0;
      miCopy.category = params.mc.id;

      // create default size (regular) options
      miCopy.sizeOptions = [];
      let regularSizeOption = new Item();
      regularSizeOption.name = 'regular';
      miCopy.sizeOptions.push(regularSizeOption);

      // let's also feed existingMis to it for copying purpose if user chooses to at start of the mi-editor
      let mis = [];
      this.restaurant.menus.map(
        m => m.mcs && m.mcs.map(
          mc => mc && mc.mis.map(mi => mis.push(mi))
        ));
      mis = mis.sort((a, b) => a.name.localeCompare(b.name));
      this.miEditor.setExistingMis(mis);
    } else {
      miCopy = new Mi(params.mi);
    }
    this.miEditor.setMi(miCopy, this.restaurant.menuOptions, params.mc.menuOptionIds);
    this.miModal.show();
  }

  miDone(mi: Mi) {
    // id == update, no id === new
    const oldMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    // we do not need everything!
    oldMenus.map(menu => menu.mcs = menu.mcs.map(category => ({
      id: category.id,
      name: category.name,
      mis: category.mis.map(mi => ({
        id: mi.id,
        category: mi.category
      }))
    })));

    const newMenus = JSON.parse(JSON.stringify(oldMenus));

    // in case there is category, we search for it
    if (!mi.category) {
      this.menu.mcs.map(mc => {
        if (mc.mis && mc.mis.some(mii => mii.id === mi.id)) {
          mi.category = mc.id;
        }
      });
    }

    if (!mi.id) {
      mi.id = new Date().valueOf() + '';
      // push it to it's mc!
      newMenus.mcs.map(mc => {
        if (mc.id === mi.category) {
          mc.mis = mc.mis || [];
          mc.mis.push(mi);
        }
      });
    } else {
      // old Mi, replace everything
      newMenus.map(menu => menu.mcs.map(category =>
        category.mis.map(mii => {
          if (mii.id === mi.id) {
            Object.keys(mii).map(key => mii[key] = mi[key]);
          }
        })));
    }

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.restaurant['_id'],
          menus: oldMenus
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus
        }
      }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.menu.mcs.map(category => category.mis.map(mii => {
            if (mii.id === mi.id) {
              Object.keys(mii).map(key => mii[key] = mi[key]);
            }
          }));

          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );

          this.menu.sortMcsAndMis();
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

    this.miModal.hide();
  }

  miCancel(mi: Mi) {
    this.miModal.hide();
  }

  miDelete(mi: Mi) {

    // menus -> menu -> mc
    const oldMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    // menus -> menu -> mc. We don't need to keep everything, just id is enough
    oldMenus.map(menu => menu.mcs = menu.mcs.map(category => ({
      id: category.id,
      mis: category.mis.map(item => item.id)
    })));

    const newMenus = oldMenus.map(menu => menu.mcs.map(mc => mc.mis = mc.mis.filter(item => item.id !== mi.id)));

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.restaurant['_id'],
          menus: oldMenus
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus
        }
      }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.menu.mcs.map(mc => mc.mis = mc.mis.filter(item => item.id !== mi.id));
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

    this.miModal.hide();
  }

}
