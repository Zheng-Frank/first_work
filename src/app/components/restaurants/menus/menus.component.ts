import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';

import {Menu, MenuOption, Restaurant} from '@qmenu/ui';
import {ModalComponent} from '@qmenu/ui/bundles/qmenu-ui.umd';
import {MenuEditorComponent} from '../menu-editor/menu-editor.component';
import {Helper} from '../../../classes/helper';

import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {AlertType} from '../../../classes/alert-type';


@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrls: ['./menus.component.css']
})
export class MenusComponent implements OnInit {

  @ViewChild('menuEditingModal') menuEditingModal: ModalComponent;
  @ViewChild('menuEditor') menuEditor: MenuEditorComponent;
  @ViewChild('menuCleanModal') menuCleanModal: ModalComponent;

  @Input() restaurant: Restaurant;
  @Output() onVisitMenuOptions = new EventEmitter();
  @Output() menusChanged = new EventEmitter();

  importMenu = false;
  importCoupon = false;
  apiRequesting = false;
  providerUrl;
  providers = [];
  activeId = undefined;
  cmoUrl;
  bmUrl;
  disableNotesFlag;

  adjustingAllPrices = false;
  adjustingMenuOrders = false;
  adjustPricesFactorPercent;
  adjustPricesFactorAmount;
  copyMenu = false;
  copyMenuToRestaurantId;

  showAdditionalFunctions = false;
  showPromotions = false;

  menusToClean = [];
  menusIncludeCleaned = {};


  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  ngOnInit() {
    this.disableNotesFlag = (this.restaurant.menus || []).some(m => m.mcs.some(mc => mc.mis.some(mi => mi.nonCustomizable)));
  }

  hasMenuHoursMissing() {
    return (this.restaurant.menus || []).some(menu => (menu.hours || []).length === 0);
  }

  hideAdditionalFunction() {
    this.showAdditionalFunctions = false;
    this.copyMenu = false;
    this.importMenu = false;
    this.importCoupon = false;
    this.adjustingAllPrices = false;
    this.adjustingMenuOrders = false;
  }


  async populateProviders() {
    this.apiRequesting = true;
    try {
      const providers = await this._api.post(environment.appApiUrl + 'utils/menu', {
        name: 'get-service-providers',
        payload: {
          ludocid: (this.restaurant.googleListing || {}).cid
        }
      }).toPromise();
      this.providers = providers.map(p => ({
        name: p.name || 'unknown',
        url: (p.menuUrl && p.menuUrl !== 'unknown') ? p.menuUrl : p.url
      }));
      if (this.providers.length === 0) {
        alert('no known providers found');
      }
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving providers');
      alert('timeout');
    }
    this.apiRequesting = false;
  }

  async crawl(synchronously) {
    console.log(this.restaurant.googleAddress);
    this.apiRequesting = true;
    try {
      this._global.publishAlert(AlertType.Info, 'crawling...');
      if (synchronously) {
        const crawledRestaurant = await this._api.post(environment.appApiUrl + 'utils/menu', {
          name: 'crawl',
          payload: {
            url: this.providerUrl,
            timezone: this.restaurant.googleAddress.timezone
          }
        }).toPromise();
        this._global.publishAlert(AlertType.Info, 'updating...');
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: {
            _id: this.restaurant._id
          }, new: {
            _id: this.restaurant._id,
            menus: crawledRestaurant.menus,
            menuOptions: crawledRestaurant.menuOptions
          }
        }]).toPromise();

        this._global.publishAlert(AlertType.Info, 'injecting images...');
        await this._api.post(environment.appApiUrl + 'utils/menu', {
          name: 'inject-images',
          payload: {
            restaurantId: this.restaurant._id,
          }
        }).toPromise();
        this._global.publishAlert(AlertType.Info, 'All done!');
        this.menusChanged.emit();
      } else {
        await this._api.post(environment.appApiUrl + 'events',
          [{
            queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`,
            event: {name: 'populate-menus', params: {restaurantId: this.restaurant._id, url: this.providerUrl}}
          }]
        ).toPromise();
        alert('Started in background. Refresh in about 1 minute or come back later to check if menus are crawled successfully.');
      }
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving menus');
    }
    this.apiRequesting = false;
  }

  match(item) {
    let {name, translation} = item;
    if (!name) {
      return;
    }

    name = name.trim();
    let withNumRegex = /^(([a-zA-Z]{0,2}\d+)(\.?)\s)(\S+)\s*/i;
    let numMatched = name.match(withNumRegex);
    let measureWords = [
      'piece', 'pieces', 'pc', 'pcs', 'pc.', 'pcs.', 'cups', 'cup',
      'liter', 'liters', 'oz', 'oz.', 'ounces', 'slice', 'lb.', 'item',
      'items', 'ingredients', 'topping', 'toppings', 'flavor', 'flavors'
    ];
    let number, hasMeasure = false;
    if (numMatched) {
      let [, toRemove, num, dot, firstName] = numMatched;
      // if dot after number, definite number, otherwise we check if a measure word after number or not
      hasMeasure = measureWords.includes((firstName || '').toLowerCase());
      if (!!dot || !hasMeasure) {
        // remove leading number chars
        name = name.replace(toRemove, '');
        item.cleanedName = name;
      }
      if (!hasMeasure) {
        number = item.number || num;
      }

    }

    // if we meet 【回锅 肉】，we should be able to keep "回锅" and "肉" together with space as zh
    let regex = /[\s\-(\[]?(\s*([^\x00-\xff]+)(\s+[^\x00-\xff]+)*\s*)[\s)\]]?/;
    let re = name.match(regex);
    if (re) {
      let zh = re[1].trim(), en = name.replace(regex, '').trim().replace(/\s*-$/, '');
      // remove brackets around name
      en = en.replace(/^\((.+)\)$/, '$1').replace(/^\[(.+)]$/, '$1');
      zh = zh.replace(/^（(.+)）$/, '$1').replace(/^【(.+)】$/, '$1');
      item.translation = {zh, en};
      item.number = number;

      let trans = (this.restaurant.translations || []).find(x => x.EN === en);
      if (translation && translation.en === en && trans && trans.ZH === zh) {
        return;
      }
      this.menusToClean.push(item);
    } else {
      if (number || hasMeasure) {
        item.translation = {en: name};
        item.number = number || item.number;
        this.menusToClean.push(item);
      }
    }

  }

  async cleanup() {
    this.menusToClean = [];
    this.menusIncludeCleaned = {};
    let {menus, menuOptions} = this.restaurant;
    let tempMenus = JSON.parse(JSON.stringify(menus)).map(x => new Menu(x)),
      tempMenuOptions = JSON.parse(JSON.stringify(menuOptions)).map(x => new MenuOption(x));
    tempMenus.forEach(menu => {
      this.match(menu);
      menu.mcs.forEach(mc => {
        this.match(mc);
        mc.mis.forEach(mi => {
          this.match(mi);
          mi.sizeOptions.forEach(so => {
            this.match(so);
          });
        });
      });
    });

    (tempMenuOptions || []).forEach(mo => {
      this.match(mo.name);
      (mo.items || []).forEach(moi => {
        this.match(moi.name);
      });
    });

    if (this.menusToClean.length > 0) {
      this.menusIncludeCleaned = {menus: tempMenus, menuOptions: tempMenuOptions};
    }
    this.menuCleanModal.show();
  }

  cleanupCancel() {
    this.menusIncludeCleaned = {};
    this.menusToClean = [];
    this.menuCleanModal.hide();
  }

  saveTranslation(item, translations) {
    if (item.translation) {
      let { zh, en, prev_en } = item.translation;
      let translation = translations.find(x => x.EN === en || x.EN === prev_en);
      if (!translation) {
        translation = {EN: en, ZH: zh};
        translations.push(translation);
      } else {
        translation.EN = en;
        translation.ZH = zh;
      }
      ['zh', 'prev_en', 'prev_zh'].forEach(p => delete item.translation[p]);
    }
  }

  async cleanupSave() {
    try {
      // @ts-ignore
      let { translations = [] } = this.restaurant;
      this.menusToClean.forEach(menu => {
        this.saveTranslation(menu, translations);
        (menu.mcs || []).forEach(mc => {
          this.saveTranslation(mc, translations);
          mc.mis.forEach(mi => {
            this.saveTranslation(mi, translations);
            mi.sizeOptions.forEach(so => {
              this.saveTranslation(so, translations);
            });
          });
        });
        (menu.items || []).forEach(moi => {
          this.saveTranslation(moi, translations);
        });
      });

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          ...this.menusIncludeCleaned,
          translations
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      // @ts-ignore
      this.restaurant.menus = this.menusIncludeCleaned.menus.map(m => new Menu(m));
      // @ts-ignore
      this.restaurant.menuOptions = this.menusIncludeCleaned.menuOptions.map(mo => new MenuOption(mo));
      this.cleanupCancel();
    } catch (error) {
      console.log('error...', error);
      this._global.publishAlert(AlertType.Danger, 'Menus update failed.');
    }
  }

  async sortMenus(sortedMenus) {
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus: sortedMenus,
        }
      }]).toPromise();
      this.restaurant.menus = sortedMenus;
      this._global.publishAlert(AlertType.Success, 'Success!');
      this.adjustingMenuOrders = false;
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
    }
  }

  async createTestMenu() {
    const timestamp = new Date().valueOf().toString();
    const testMenu = {
      id: timestamp + '0',
      name: 'Test Menu（测试菜单）',
      description: 'Temporary for testing',
      hours: [],
      mcs: [{
        id: timestamp + '1',
        name: 'Test Category',
        images: [],
        mis: [
          {
            id: timestamp + '2',
            category: timestamp + '1',
            name: 'Sesame Chicken（芝麻鸡）',
            sizeOptions: [{
              name: 'regular',
              price: 10.99
            }],
            imageObjs: [{
              'originalUrl': 'https://chopst.s3.amazonaws.com/menuImage/1558463472991.jpeg',
              'thumbnailUrl': 'https://s3.amazonaws.com/chopstresized/192_menuImage/1558463472991.jpeg',
              'normalUrl': 'https://s3.amazonaws.com/chopstresized/768_menuImage/1558463472991.jpeg',
              'origin': 'IMAGE-PICKER'
            }]
          }
        ]
      }]
    };

    // api update here...
    const myOldMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    const myNewMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    // we'd like to remove all mcs to reduce comparison!
    myOldMenus.map(m => delete m.mcs);
    myNewMenus.map(m => delete m.mcs);
    myNewMenus.push(new Menu(testMenu as any));
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id'],
          menus: myOldMenus
        }, new: {
          _id: this.restaurant['_id'],
          menus: myNewMenus
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      this.restaurant.menus.push(new Menu(testMenu as any));

    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
    }
    // set the latest as active tab
    this.setActiveId(testMenu.id);

  }

  async copyMenuToRT() {
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
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
      this._global.publishAlert(AlertType.Success, 'Success!');
      this.adjustingAllPrices = false;
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
      this.adjustingAllPrices = false;
    }
  }

  async disableNotes() {
    const oldMenus = this.restaurant.menus || [];
    const newMenus = JSON.parse(JSON.stringify(oldMenus));

    this.disableNotesFlag = !this.disableNotesFlag;
    newMenus.forEach(eachMenu => {
      eachMenu.mcs.forEach(eachMc => {
        eachMc.mis.forEach(mi => {
          mi.nonCustomizable = this.disableNotesFlag;
        });
      });
    });
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id'],
          menus: oldMenus
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus
        }
      }]).toPromise();
      this.restaurant.menus = newMenus.map(each => new Menu(each));
      this._global.publishAlert(AlertType.Success, 'Success!');
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
    }

  }

  async adjustPrices() {
    const factor = +this.adjustPricesFactorAmount || +this.adjustPricesFactorPercent;
    if (factor) {
      const oldMenus = this.restaurant.menus || [];

      const newMenus = JSON.parse(JSON.stringify(oldMenus));
      newMenus.map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => (mi.sizeOptions || []).map(item => {
        if (!item) {
          console.log(mi, mc);
        }
        if (+item.price) {
          if (this.adjustPricesFactorAmount) {
            item.price = +((+item.price) + factor).toFixed(2);
          } else if (this.adjustPricesFactorPercent) {
            item.price = +((+item.price) * (1 + factor)).toFixed(2);
          } else {
            this._global.publishAlert(AlertType.Danger, 'Missing data!');
          }
        }
      }))));

      // keep menu hours
      newMenus.map((menu, index) => menu.hours = oldMenus[index].hours);
      // now let's patch!
      try {
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: {
            _id: this.restaurant['_id'],
            // menus: oldMenus 8/6/2020 just replace total to avoid dirty data problem causing 5f2c21e5e706a44974ce515a to fail
          }, new: {
            _id: this.restaurant['_id'],
            menus: newMenus
          }
        }]).toPromise();
        this.restaurant.menus = newMenus.map(menu => new Menu(menu));
        this._global.publishAlert(AlertType.Success, 'Success!');
        this.adjustingAllPrices = false;
      } catch (error) {
        location.reload();
        console.log(error);
        this._global.publishAlert(AlertType.Danger, 'Failed!');
        this.adjustingAllPrices = false;
      }
    } else {
      this._global.publishAlert(AlertType.Danger, 'Missing data!');
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
    const newMenus = this.restaurant.menus.filter(m => m.id !== menu.id);
    this.patchDiff(newMenus);
    this.menuEditingModal.hide();
  }

  patchDiff(newMenus) {
    if (Helper.areObjectsEqual(this.restaurant.menus, newMenus)) {
      this._global.publishAlert(
        AlertType.Info,
        'Not changed'
      );
    } else {
      // api update here...
      const myOldMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
      const myNewMenus = JSON.parse(JSON.stringify(newMenus));

      if (myNewMenus.length !== myOldMenus.length) {
        /* Different lengths means a new menu has been added. We don't want to delete any categories on the new menu,
        because it could be a copy of an existing one. The new menu will always be in the last index position of myNewMenus*/
        const newMenu = myNewMenus[myNewMenus.length - 1];
        myNewMenus.map(m => {
          if (m.id !== newMenu.id) {
            delete m.mcs;
          }
        });
      } else {
        // patch operation only cares about changes, so we delete unchanged menu categories.
        myNewMenus.map(m => delete m.mcs);
      }
      myOldMenus.map(m => delete m.mcs);

      this._api
        .patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
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
              'Updated successfully'
            );
          },
          error => {
            this._global.publishAlert(AlertType.Danger, 'Error updating to DB');
          }
        );
    }
  }

  visitMenuOptions() {
    this.onVisitMenuOptions.emit();
  }

  async injectImages() {
    const images = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 3000
    }).toPromise();

    const oldMenus = this.restaurant.menus || [];
    const newMenus = JSON.parse(JSON.stringify(oldMenus));
    let needUpdate = false;
    newMenus.map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => {
      /* Image origin: "CSR", "RESTAURANT", "IMAGE-PICKER"
          only inject image when no existing image with origin as "CSR", "RESTAURANT", or overwrite images with origin as "IMAGE-PICKER"
      */
      try {

        if (mi && mi.imageObjs && !(mi.imageObjs.some(each => each.origin === 'CSR' || each.origin === 'RESTAURANT'))) {
          const match = function (aliases, name) {
            const sanitizedName = Helper.sanitizedName(name);
            return (aliases || []).some(alias => alias.toLowerCase().trim() === sanitizedName);
          };
          // only use the first matched alias
          let matchingAlias = images.filter(image => match(image.aliases, mi.name) || match(image.aliases, mi.description))[0];
          if (matchingAlias && matchingAlias.images && matchingAlias.images.length > 0) {
            // reset the imageObj
            mi.imageObjs = [];
            (matchingAlias.images || []).map(each => {
              (mi.imageObjs).push({
                originalUrl: each.url,
                thumbnailUrl: each.url192,
                normalUrl: each.url768,
                origin: 'IMAGE-PICKER'
              });
            });
            needUpdate = true;
          }
        }
      } catch (e) {
        console.log('mi', JSON.stringify(mi));
      }
    })));

    if (needUpdate) {
      try {
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: {
            _id: this.restaurant['_id'],
            menus: oldMenus,
          }, new: {
            _id: this.restaurant['_id'],
            menus: newMenus,
          }
        }]).toPromise();
        const menus = JSON.parse(JSON.stringify(newMenus));
        this.restaurant.menus = menus.map(x => new Menu(x));
        this._global.publishAlert(AlertType.Success, 'Success!');
      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, 'Failed!');
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

      for (let i = indexArray.length - 1; i >= 0; i--) {
        mi.imageObjs.splice(indexArray[i], 1);
      }

    })));

    // now let's patch!
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus,
        }
      }]).toPromise();
      this.restaurant.menus = newMenus.map(each => new Menu(each));
      this._global.publishAlert(AlertType.Success, 'Success!');
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
    }

  }


}
