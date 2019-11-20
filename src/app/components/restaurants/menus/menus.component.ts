import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';

import { Menu, Restaurant } from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { MenuEditorComponent } from '../menu-editor/menu-editor.component';
import { Helper } from '../../../classes/helper';

import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';

@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrls: ['./menus.component.css']
})
export class MenusComponent implements OnInit {

  @ViewChild('menuEditingModal') menuEditingModal: ModalComponent;
  @ViewChild('menuEditor') menuEditor: MenuEditorComponent;

  @Input() restaurant: Restaurant;
  @Output() onVisitMenuOptions = new EventEmitter();

  activeId = undefined;

  adjustingAllPrices = false;
  adjustPricesFactorPercent;
  adjustPricesFactorAmount;
  copyMenu = false;
  copyMenuToRestaurantId;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  async copyMenuToRT() {
    try {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.copyMenuToRestaurantId,
          menus: [],
          menuOptions: []
        }, new: {
          _id: this.copyMenuToRestaurantId,
          menus: this.restaurant.menus,
          menuOptions: this.restaurant.menuOptions
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, "Success!");
      this.adjustingAllPrices = false;
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, "Failed!");
      this.adjustingAllPrices = false;
    }
  }

  async adjustPrices() {
    const factor = +this.adjustPricesFactorAmount || +this.adjustPricesFactorPercent;
    if (factor) {
      const oldMenus = this.restaurant.menus || [];
      const oldMenuOptions = this.restaurant.menuOptions || [];

      const newMenus = JSON.parse(JSON.stringify(oldMenus));
      newMenus.map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => (mi.sizeOptions || []).map(item => {
        if (+item.price) {
          if (this.adjustPricesFactorAmount) {
            item.price = +((+item.price) + factor).toFixed(2);
          } else if (this.adjustPricesFactorPercent) {
            item.price = +((+item.price) * (1 + factor)).toFixed(2);
          } else {
            this._global.publishAlert(AlertType.Danger, "Missing data!");
          }
        }
      }))));

      // keep menu hours
      newMenus.map((menu, index) => menu.hours = oldMenus[index].hours);

      const newMenuOptions = JSON.parse(JSON.stringify(oldMenuOptions));
      newMenuOptions.map(mo => (mo.items || []).map(item => {
        if (+item.price) {
          item.price = +((+item.price) * (1 + factor)).toFixed(2);
        }
      }));
      // now let's patch!
      try {
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            menus: oldMenus,
            menuOptions: oldMenuOptions
          }, new: {
            _id: this.restaurant['_id'],
            menus: newMenus,
            menuOptions: newMenuOptions
          }
        }]).toPromise();
        this.restaurant.menus = newMenus;
        this.restaurant.menuOptions = newMenuOptions;
        this._global.publishAlert(AlertType.Success, "Success!");
        this.adjustingAllPrices = false;
      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, "Failed!");
        this.adjustingAllPrices = false;
      }
    }
    else {
      this._global.publishAlert(AlertType.Danger, "Missing data!");
    }
  }

  getMenus() {
    if (this.restaurant) {
      return this.restaurant.menus;
    }
    return [];
  }

  getActiveId() {
    if (this.activeId) {
      return this.activeId;
    }
    if (this.getMenus().length > 0) {
      return this.getMenus()[0].id;
    }
    return undefined;
  }

  setActiveId(id) {
    this.activeId = id;
    // let's do s smooth scroll to make it to center???
  }


  getMenuImageUrl(menu) {
    if (menu && menu.backgroundImageUrl) {
      return Helper.getNormalResUrl(menu.backgroundImageUrl);
    }
    return '';
  }

  clickNew() {
    this.menuEditor.setMenu(new Menu());
    this.menuEditingModal.show();
  }

  edit(menu) {
    this.menuEditor.setMenu(new Menu(menu));
    this.menuEditingModal.show();
  }

  onDoneEditing(menu: Menu) {
    const newMenus = (this.restaurant.menus || []).slice(0);
    if (menu.id) {
      for (let i = newMenus.length - 1; i >= 0; i--) {
        if (menu.id === newMenus[i].id) {
          newMenus[i] = menu;
        }
      }
    } else {
      menu.id = menu.id || new Date().valueOf() + '';
      newMenus.push(menu);
    }


    // patch?
    this.patchDiff(newMenus);

    this.menuEditingModal.hide();
    // set the latest as active tab
    this.setActiveId(menu.id);

  }

  onDelete(menu: Menu) {
    // determining next active id:
    let index = +this.restaurant.menus.findIndex(m => m.id === menu.id);
    if (index < this.restaurant.menus.length - 1) {
      // fall to next menu
      this.setActiveId(this.restaurant.menus[index + 1].id);
    } else if (index > 0) {
      // fall to previous one
      this.setActiveId(this.restaurant.menus[index - 1].id);
    } else {
      // nothing to fall:
      this.setActiveId(undefined);
    }

    // get a shallow copy
    const newMenus = this.restaurant.menus.filter(m => m.id != menu.id);
    this.patchDiff(newMenus);
    this.menuEditingModal.hide();
  }

  patchDiff(newMenus) {
    if (Helper.areObjectsEqual(this.restaurant.menus, newMenus)) {
      this._global.publishAlert(
        AlertType.Info,
        "Not changed"
      );
    } else {
      // api update here...
      const myOldMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
      const myNewMenus = JSON.parse(JSON.stringify(newMenus));

      // we'd like to remove mcs first!
      myOldMenus.map(m => delete m.mcs);
      myNewMenus.map(m => delete m.mcs);

      this._api
        .patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            menus: myOldMenus
          }, new: {
            _id: this.restaurant['_id'],
            menus: myNewMenus
          }
        }])
        .subscribe(
          result => {
            // let's update original, assuming everything successful
            this.restaurant.menus = newMenus;
            this._global.publishAlert(
              AlertType.Success,
              "Updated successfully"
            );
          },
          error => {
            this._global.publishAlert(AlertType.Danger, "Error updating to DB");
          }
        );
    }
  }

  visitMenuOptions() {
    this.onVisitMenuOptions.emit();
  }

  async injectImages() {
    const images = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "image",
      limit: 3000
    }).toPromise();

    const oldMenus = this.restaurant.menus || [];
    const newMenus = JSON.parse(JSON.stringify(oldMenus));
    let needUpdate = false;
    newMenus.map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => {
      /* Image origin: "CSR", "RESTAURANT", "IMAGE-PICKER"
          only inject image when no existing image with origin as "CSR", "RESTAURANT", or overwrite images with origin as "IMAGE-PICKER"
      */
     try{

       if (mi && mi.imageObjs && !(mi.imageObjs.some(each => each.origin === 'CSR' || each.origin === 'RESTAURANT'))) {
         const match = function (aliases, name) {
           const sanitizedName = Helper.sanitizedName(name);
           return (aliases || []).some(alias => alias.toLowerCase().trim() === sanitizedName);
         }
         //only use the first matched alias
         let matchingAlias = images.filter(image => match(image.aliases, mi.name) || match(image.aliases, mi.description))[0];
         if (matchingAlias && matchingAlias.images && matchingAlias.images.length > 0) {
           //reset the imageObj
           mi.imageObjs = [];
           (matchingAlias.images || []).map(each => {
             (mi.imageObjs).push({
               originalUrl: each.url,
               thumbnailUrl: each.url192,
               normalUrl: each.url768,
               origin: 'IMAGE-PICKER'
             });
           })
           needUpdate = true;
         }
       }
     }catch (e){
       console.log ('mi', JSON.stringify(mi));
     }
    })));

    if (needUpdate) {
      try {
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
          old: {
            _id: this.restaurant['_id'],
            menus: oldMenus,
          }, new: {
            _id: this.restaurant['_id'],
            menus: newMenus,
          }
        }]).toPromise();
        this.restaurant.menus = JSON.parse(JSON.stringify(newMenus));;
        this._global.publishAlert(AlertType.Success, "Success!");
      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, "Failed!");
      }

    }

  }

  async deleteImages() {
    const oldMenus = this.restaurant.menus || [];
    const newMenus = JSON.parse(JSON.stringify(oldMenus));
    newMenus.map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => {
      let indexArray = [];
      for (let i = 0; i < mi.imageObjs.length; i++) {
        if (mi.imageObjs[i]) {
          if (mi.imageObjs[i].origin === 'IMAGE-PICKER') {
            indexArray.push(i);
          }
        }
      }

      for (var i = indexArray.length - 1; i >= 0; i--) {
        mi.imageObjs.splice(indexArray[i], 1);
      }

    })));

    // now let's patch!
    try {
      await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus,
        }
      }]).toPromise();
      this.restaurant.menus = newMenus.map(each => new Menu(each));
      this._global.publishAlert(AlertType.Success, "Success!");
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, "Failed!");
    }

  }


}
