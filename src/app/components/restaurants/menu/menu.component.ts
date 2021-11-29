import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Item, Mc, Menu, Mi, Restaurant} from '@qmenu/ui';
import {Helper} from '../../../classes/helper';
import {ModalComponent} from '@qmenu/ui/bundles/qmenu-ui.umd';
import {MenuCategoryEditorComponent} from '../menu-category-editor/menu-category-editor.component';
import {MenuItemEditorComponent} from '../menu-item-editor/menu-item-editor.component';
import {MenuItemsEditorComponent} from '../menu-items-editor/menu-items-editor.component';

import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {AlertType} from '../../../classes/alert-type';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  @Output() onEdit = new EventEmitter();
  @Output() onVisitMenuOptions = new EventEmitter();
  @Input() menu: Menu;
  @Input() restaurant: Restaurant;
  @Input() isShowMenuItemStats = false; // control whether show menu items' stats

  @ViewChild('mcModal') mcModal: ModalComponent;
  @ViewChild('miModal') miModal: ModalComponent;
  @ViewChild('mcSortingModal') mcSortingModal: ModalComponent;
  @ViewChild('miSortingModal') miSortingModal: ModalComponent;

  @ViewChild('beverageSectionModal') beverageSectionModal: ModalComponent;

  @ViewChild('mcEditor') mcEditor: MenuCategoryEditorComponent;
  @ViewChild('miEditor') miEditor: MenuItemEditorComponent;

  @ViewChild('misEditor') misEditor: MenuItemsEditorComponent;

  editingMis = false;
  mcOfSortingMis;
  sortMcItems; // it's a mcs which waiting for reordering.
  targetWording = {
    'ONLINE_ONLY': 'Online only', // also a default when there is no target customer specified
    'DINE_IN_ONLY': 'Dine-in only',
    'ALL': 'Both online and dine-in',
  };

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
  }

  // add a new menu category named beverages to menu,which is of dine-in only or both online and dine in .
  addBeverageCategory() {
    let BeverageMenuCategory = new Mc();

    BeverageMenuCategory.name = 'Beverages';
    BeverageMenuCategory.disabled = false;
    BeverageMenuCategory.images = [];
    BeverageMenuCategory.mis = [];
    let sampleMi = new Mi();
    sampleMi.id = new Date().valueOf() + '';
    sampleMi.name = 'Water';
    sampleMi.inventory = null;
    sampleMi.nonCustomizable = true;
    sampleMi.imageObjs = [
      {
        'originalUrl': 'https://chopst.s3.amazonaws.com/menuImage/1618362512081.jpeg',
        'thumbnailUrl': 'https://s3.amazonaws.com/chopstresized/128_menuImage/1618362512081.jpeg',
        'normalUrl': 'https://s3.amazonaws.com/chopstresized/768_menuImage/1618362512081.jpeg',
        'origin': 'CSR'
      }
    ];
    sampleMi.cachedMinCost = 0;
    sampleMi.cachedMaxCost = -1;
    let item1 = new Item();
    item1.name = 'With Ice';
    item1.price = 0;
    let item2 = new Item();
    item2.name = 'No Ice';
    item2.price = 0;
    sampleMi.sizeOptions = [item1, item2];
    BeverageMenuCategory.mis = [sampleMi];
    this.mcDone(BeverageMenuCategory);

  }

    // reorder beverage category of menu.
    async doBeverageSectionReorder(menu) {
      // get index and only update that menu
      const index = this.restaurant.menus.indexOf(menu);
      let beverageMcs = menu.mcs.filter(mc => mc.name.trim().toLowerCase() === 'beverages');
      beverageMcs.forEach(beverageMc => {
        let beverageMcIndex = menu.mcs.indexOf(beverageMc);
        if (beverageMcIndex !== -1) {
          menu.mcs.splice(beverageMcIndex, 1);
        }
      });
      // It's a problem to put unshift and splice together.
      beverageMcs.forEach(beverageMc => menu.mcs.unshift(beverageMc));

      try {
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: {
            _id: this.restaurant['_id']
          }, new: {
            _id: this.restaurant['_id'],
            [`menus.${index}.mcs`]: menu.mcs,
          }
        }]).toPromise();
        this.restaurant.menus[index].mcs = menu.mcs;
        console.log(JSON.stringify(menu.mcs));
        this._global.publishAlert(AlertType.Success, 'Resort Success!');
        this.beverageSectionModal.hide();
      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, 'Failed!');
        this.beverageSectionModal.hide();
      }
    }

  // only restaurants in the type of  DINE_IN_ONLY and all
  isShowBeverageButton(menu) {
    return menu.targetCustomer && (menu.targetCustomer === 'DINE_IN_ONLY' || menu.targetCustomer === 'ALL');
  }

  showMiSortingModal(mc) {
    this.mcOfSortingMis = mc;
    this.miSortingModal.show();
  }

  hideMiSortingModal() {
    this.miSortingModal.hide();
  }

  async sortMis(sortedMis) {
    // get index and only update that menu
    const index = this.restaurant.menus.indexOf(this.menu);
    const mcIndex = this.menu.mcs.indexOf(this.mcOfSortingMis);
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          [`menus.${index}.mcs.${mcIndex}.mis`]: sortedMis,
        }
      }]).toPromise();
      this.restaurant.menus[index].mcs[mcIndex].mis = sortedMis;
      this._global.publishAlert(AlertType.Success, 'Success!');
      this.hideMiSortingModal();
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
    }
  }

  showMcSortingModal(mcs) {
    this.sortMcItems = mcs;
    this.mcSortingModal.show();
  }

  hideMcSortingModal() {
    this.mcSortingModal.hide();
  }

  async sortMcs(sortedMcs) {
    // get index and only update that menu
    const index = this.restaurant.menus.indexOf(this.menu);
    console.log(index);
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          [`menus.${index}.mcs`]: sortedMcs,
        }
      }]).toPromise();
      this.restaurant.menus[index].mcs = sortedMcs;
      this._global.publishAlert(AlertType.Success, 'Success!');
      this.hideMcSortingModal();
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
    }
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
    } else {
      mcCopy = new Mc(mc);
    }
    console.log('this.restaurant ', this.restaurant);
    this.mcEditor.setMc(mcCopy, this.restaurant.menuOptions);
    this.mcModal.show();
  }

  editAllItems(mc) {
    this.misEditor.setMc(mc, this.restaurant.menuOptions);
    this.editingMis = true;
  }

  mcDone(mc: Mc) {
    // id == update, no id === new
    let action = mc.id ? 'UPDATE' : 'CREATE';
    const oldMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    // we do not need everything! ==>means that we just push the new category into the tail of queue.

    const newMenus = JSON.parse(JSON.stringify(oldMenus));


    if (!mc.id) {
      let repeated = false;
      // new Mc, just insert!
      newMenus.forEach(menu => {
        if (menu.id === this.menu.id) {
          menu.mcs = menu.mcs || [];
           // check if mc name exist already
          if ((menu.mcs && menu.mcs.length > 0 && menu.mcs.some(x => x.name && x.name.trim().toLowerCase() === mc.name.trim().toLowerCase())) && mc.name.trim().toLowerCase() === 'beverages') {
            repeated = true;
            this.mcModal.hide();
            this.beverageSectionModal.show();
            return;
          }
          if (menu.mcs && menu.mcs.length > 0 && menu.mcs.some(x => x.name === mc.name.trim())) {
            repeated = true;
            this._global.publishAlert(AlertType.Danger, `Menu category ${mc.name} already exist!`);
            return;
          }
          // must set id after check
          mc.id = new Date().valueOf() + '';
          mc.mis.forEach(mi => mi.category = mc.id);
          if (mc.name === 'Beverages') {
            menu.mcs.unshift(mc);
          } else {
            menu.mcs.push(mc);
          }
        }
      });
      if (repeated) {
        return;
      }
    } else {
      // old Mc, replace everything


      // old Mi, replace everything
      newMenus.map(menu => menu.mcs.map(category => {
          if (category.id === mc.id) {
            for (const prop of Object.keys(category)) {
              delete category[prop];
            }
            Object.assign(category, mc);
          }
        }
      ));
    }

    this._api
      .patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
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

          // either update or insert new, carefully check because socket might add it before this!
          this.menu.mcs = this.menu.mcs || [];
          if (action === 'CREATE') {
            if (!this.menu.mcs.some(m => m.id === mc.id)) {
              // unshift() is a function from API that could be put an element in the top of the array.
              this.menu.mcs.length > 0 && mc.name === 'Beverages' ? this.menu.mcs.unshift(mc) : this.menu.mcs.push(mc);
            }
          } else {
            // let's update original, assuming everything successful
            this.menu.mcs.map(category => {
              if (category.id === mc.id) {
                for (const prop of Object.keys(category)) {
                  delete category[prop];
                }
                Object.assign(category, mc);
              }
            });

          }

          this._global.publishAlert(
            AlertType.Success,
            'Updated successfully'
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error updating to DB(Maybe it caused by beverages section has already existed,please check it again).System error message:' + error.message);
        }
      );

    this.mcModal.hide();
  }

  mcCancel(mc: Mc) {
    this.mcModal.hide();
  }

  mcDelete(mc: Mc) {
    const newMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    newMenus.forEach(eachMenu => {
      if (this.menu.id === eachMenu.id) {
        eachMenu.mcs = eachMenu.mcs.filter(category => category.id !== mc.id);
      }
    });

    this._api
      .patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
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
            'Updated successfully'
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
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

  cleanMiCopy(mi: Mi) {
    const miCopy = new Mi(mi);
    for (let i = miCopy.sizeOptions.length - 1; i >= 0; i--) {
      if (!miCopy.sizeOptions[i].name) {
        miCopy.sizeOptions.splice(i, 1);
      }
    }
    return miCopy;
  }

  miDone(mi: Mi) {
    // id == update, no id === new
    let action = mi.id ? 'UPDATE' : 'CREATE';
    const newMenus = JSON.parse(JSON.stringify(this.restaurant.menus));

    // in case there is category, we search for it
    if (!mi.category) {
      this.menu.mcs.map(mc => {
        if (mc.mis && mc.mis.some(mii => mii.id === mi.id)) {
          mi.category = mc.id;
        }
      });
    }

    if (!mi.id) { // new mi
      mi.id = new Date().valueOf() + '';
      // push it to it's mc!
      newMenus.map(eachMenu => {
        eachMenu.mcs.map(mc => {
          if (mc.id === mi.category) {
            mc.mis = mc.mis || [];
            mc.mis.push(mi);
          }
        });
      });

    } else {
      // old Mi, replace everything
      newMenus.map(menu => menu.mcs.map(category =>
        category.mis.map(mii => {
          if (mii.id === mi.id) {
            for (const prop of Object.keys(mii)) {
              delete mii[prop];
            }
            Object.assign(mii, mi);
          }
        })));
    }

    // bug: mi's sizeOptions tied to optionsEditor, which will cause side effects of adding one extra item automatically
    // temp fix to use cleanMiCopy
    const cleanMiCopy = this.cleanMiCopy(mi);
    this._api
      .patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        // Just just new menus to overwrite
        old: {
          _id: this.restaurant['_id'],
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus
        }
      }])
      .subscribe(
        result => {
          // insert the new mi
          if (action === 'CREATE') {
            if (this.menu.mcs.some(mc => mc.id === cleanMiCopy.category)) {
              this.menu.mcs.map(eachMc => {
                if (eachMc.id === cleanMiCopy.category) {
                  eachMc.mis.push(cleanMiCopy);
                }
              });
            }
          } else {
            // replace with the updated version
            this.menu.mcs.map(eachMc => {
              eachMc.mis.forEach(m => {
                if (m.id === mi.id) {
                  for (const prop of Object.keys(m)) {
                    delete m[prop];
                  }
                  Object.assign(m, cleanMiCopy);
                }
              });
            });

            this._global.publishAlert(
              AlertType.Success,
              'Updated successfully'
            );
          }
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
        }
      );

    this.miModal.hide();
  }

  miCancel(mi: Mi) {
    this.miModal.hide();
  }


  miDelete(mi: Mi) {
    const newMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    newMenus.forEach(eachMenu => {
      if (this.menu.id === eachMenu.id) {
        eachMenu.mcs.map(mc => mc.mis = mc.mis.filter(item => item.id !== mi.id));
      }
    });


    this._api
      .patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id'],
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
            'Updated successfully'
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
        }
      );

    this.miModal.hide();
  }

  misDone({ mc, updatedTranslations }) {
    this.editingMis = false;
    // menus -> menu -> mc
    const oldMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    // menus -> menu -> mc. We don't need to keep everything, just id is enough
    // oldMenus.map(menu => menu.mcs = menu.mcs.map(category => ({
    //   id: category.id,
    //   mis: category.mis.map(item => item.id)
    // })));


    const newMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    let { translations } = this.restaurant;
    translations = translations || [];
    updatedTranslations.forEach(translation => {
      let { EN, ZH } = translation;
      let tmp = translations.find(x => x.EN === EN);
      if (tmp) {
        tmp.ZH = ZH;
      } else if (ZH) {
        translations.push({EN, ZH});
      }
    })

    this._api
      .patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus,
          translations
        }
      }])
      .subscribe(
        result => {
          // let's update original, assuming everything successful
          this.menu.mcs.map(category => {
            if (category.id === mc.id) {
              // Object.keys(mc).map(key => key !== 'mis' && (category[key] = mc[key]));
              category.mis = mc.mis;
            }
          });
          this._global.publishAlert(
            AlertType.Success,
            'Updated successfully'
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
        }
      );
  }

  misCancel(mc) {
    this.editingMis = false;
  }

  visitMenuOptions() {
    this.miModal.hide();
    this.mcModal.hide();
    this.onVisitMenuOptions.emit();
  }
}
