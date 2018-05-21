import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { MenuOption, Restaurant, Menu } from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';

import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-menu-options',
  templateUrl: './menu-options.component.html',
  styleUrls: ['./menu-options.component.css']
})
export class MenuOptionsComponent implements OnInit {
  @Input() restaurant: Restaurant;
  @ViewChild('menuOptionEditingModal') menuOptionEditingModal: ModalComponent;

  editingTitle: string = null;

  menuOptionInEditing = new MenuOption();

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  getMenuOptions() {
    if (this.restaurant) {
      return this.restaurant.menuOptions;
    }
    return [];
    // let mock = [];
    // mock.push({
    //   id: '123',
    //   name: 'Select rice',
    //   items: [{ name: 'streamed', price: '0' }, { name: 'fried', price: '1.0' }, { name: 'thai', price: '2.0' }],
    //   minSelection: 1,
    //   maxSelection: 1
    // });
    // mock.push({
    //   id: '234',
    //   name: 'Select rice',
    //   items: [{ name: 'streamed', price: '0' }, { name: 'fried', price: '1.0' }, { name: 'thai', price: '2.0' }],
    //   minSelection: 0,
    //   maxSelection: -1
    // });
    // return mock;
  }

  editMenuOption(mo: MenuOption) {
    // we use a copy of mo:
    let moCopy: MenuOption;
    if (!mo) {
      moCopy = new MenuOption();
    } else {
      moCopy = new MenuOption(mo);
    }

    moCopy.items = moCopy.items || [];

    this.menuOptionInEditing = moCopy;
    this.editingTitle = moCopy.id ? 'Edit Menu Options' : 'Add New Menu Options';

    // this.menuOptionEditor.setMenuOption(moCopy);
    this.menuOptionEditingModal.show();
  }

  moDone(mo: MenuOption) {
    // id == update, no id === new
    // get a shallow copy
    const newMenuOptions = this.restaurant.menuOptions.slice(0);

    if (!mo.id) {
      // assign a pseudo id
      mo.id = new Date().valueOf() + '';
      newMenuOptions.push(new MenuOption(mo));
    } else {
      for (let i = 0; i < newMenuOptions.length; i++) {
        if (newMenuOptions[i].id === mo.id) {
          newMenuOptions[i] = new MenuOption(mo);
        }
      }
    }

    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.restaurant['_id'],
          menuOptions: this.restaurant.menuOptions
        }, new: {
          _id: this.restaurant['_id'],
          menuOptions: newMenuOptions
        }
      }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          for (let i = 0; i < this.restaurant.menuOptions.length; i++) {
            if (this.restaurant.menuOptions[i].id === mo.id) {
              this.restaurant.menuOptions[i] = new MenuOption(mo);
            }
          }
          
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );

    this.menuOptionEditingModal.hide();
  }

  moCancel(mo: MenuOption) {
    this.menuOptionEditingModal.hide();
  }

  moDelete(menuOption: MenuOption) {
    const oldMenuOptions = JSON.parse(JSON.stringify(this.restaurant.menuOptions)).map(mo => ({
      id: mo.id,
      name: mo.name
    }));
    const newMenuOptions = oldMenuOptions.filter(mo => mo.id !== menuOption.id);
    this._api
      .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.restaurant['_id'],
          menuOptions: oldMenuOptions
        }, new: {
          _id: this.restaurant['_id'],
          menuOptions: newMenuOptions
        }
      }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.restaurant.menuOptions = this.restaurant.menuOptions.filter(mo => mo.id !== menuOption.id);
          this._global.publishAlert(
            AlertType.Success,
            "Updated successfully"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
    this.menuOptionEditingModal.hide();
  }

}
