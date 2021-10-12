import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

import { Menu, Restaurant } from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { MenuEditorComponent } from '../menu-editor/menu-editor.component';
import { Helper } from '../../../classes/helper';

import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from '../../../../environments/environment';
import { AlertType } from '../../../classes/alert-type';
import { MenuCleanupComponent } from '../menu-cleanup/menu-cleanup.component';
import { ImageItem } from 'src/app/classes/image-item';


@Component({
  selector: 'app-menus',
  templateUrl: './menus.component.html',
  styleUrls: ['./menus.component.css']
})
export class MenusComponent implements OnInit {

  @ViewChild('menuEditingModal') menuEditingModal: ModalComponent;
  @ViewChild('menuEditor') menuEditor: MenuEditorComponent;
  @ViewChild('menuCleanModal') menuCleanModal: ModalComponent;
  @ViewChild('cleanupComponent') cleanupComponent: MenuCleanupComponent;

  @Input() restaurant: Restaurant;
  @Output() onVisitMenuOptions = new EventEmitter();
  @Output() menusChanged = new EventEmitter();

  importMenu = false;
  keepExistingMenusForProvider = false;
  keepExistingMenusForUrl = false;
  importJson = false;
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
  menuCleanHandleIDsOnly = true;
  menuJson = '';
  isShowMenuItemStats = false;

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  async republishToAWS() {
    try {
      // --- Re publish changes
      const domain = Helper.getTopDomain(this.restaurant.web.qmenuWebsite);
      const templateName = this.restaurant.web.templateName;
      const restaurantId = this.restaurant._id;

      if (!templateName || !domain) {
        return this._global.publishAlert(AlertType.Danger, 'Missing template name or website');
      }

      if (domain.indexOf('qmenu.us') >= 0) {
        return this._global.publishAlert(AlertType.Danger, 'Failed. Can not inject qmenu');
      }

      await this._api.post(environment.qmenuApiUrl + 'utils/publish-website-s3', {
        domain,
        templateName,
        restaurantId
      }).toPromise();

      // --- Invalidate domain
      const result = await this._api.post(environment.appApiUrl + 'events',
        [{ queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`, event: { name: 'invalidate-domain', params: { domain: domain } } }]
      ).toPromise();

      console.log('republishToAWS() nvalidation result:', result);

      this._global.publishAlert(AlertType.Success, 'Republishing to AWS was successful');
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, 'Error republishing to AWS');
      console.error(error);
    }
  }

  ngOnInit() {
    this.disableNotesFlag = (this.restaurant.menus || []).some(m => m.mcs.some(mc => mc.mis.some(mi => mi.nonCustomizable)));
  }

  async confirmImportJson() {
    try {
      const menus = JSON.parse(this.menuJson);

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus: menus
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      this.restaurant.menus = menus.map(menu => new Menu(menu));
      this._global.publishAlert(AlertType.Success, "Done");
      this.importJson = false;
    } catch (error) {
      this._global.publishAlert(AlertType.Danger, "Failed");
    }
  }

  isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }

  getProviders() {
    // only show supported providers: menufy,Red Passion, CMO (Chinese Menu Online), Beyond Menu, Grubhub, Slicelife
    let supported = ['menufy', 'redpassion', 'chinesemenuonline', 'chinesemenuonline', 'beyondmenu', 'grubhub', 'slicelife'];
    return (this.restaurant.providers || this.providers).filter(x => supported.includes(x.name));
  }

  /*
    a public logic we should extract it.
  */
  removeSpace(str) {
    return (str || '').trim().replace(/\s+/g, ' ');
  }
  /*
    remove space of the property's value of mi if it suit for the rules.
  */
  async doRemoveUnnessarySpace() {
    const newMenus = JSON.parse(JSON.stringify(this.restaurant.menus));
    newMenus.forEach(menu => {
      menu.name = this.removeSpace(menu.name);
      (menu.mcs || []).forEach(mc => {
        mc.name = this.removeSpace(mc.name);
        (mc.mis || []).forEach(mi => {
          mi.name = this.removeSpace(mi.name);
          (mi.sizeOptions || []).forEach(so => {
            so.name = this.removeSpace(so.name);
          });
        });
      });
    });
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus: newMenus
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      this.restaurant.menus = newMenus.map(menu => new Menu(menu));
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Failed!');
    }
  }

  hasMenuHoursMissing() {
    return (this.restaurant.menus || []).some(menu => (menu.hours || []).length === 0);
  }

  hideAdditionalFunction() {
    this.showAdditionalFunctions = false;
    this.copyMenu = false;
    this.importMenu = false;
    this.keepExistingMenusForUrl = false;
    this.keepExistingMenusForProvider = false;
    this.importCoupon = false;
    this.adjustingAllPrices = false;
    this.adjustingMenuOrders = false;
    this.isShowMenuItemStats = false;
  }

  importMenus() {
    this.importMenu = true;
    this.keepExistingMenusForUrl = false;
    this.keepExistingMenusForProvider = false;
  }

  async populateProviders() {
    this.apiRequesting = true;
    try {
      const providers = await this._api.post(environment.appApiUrl + 'utils/menu', {
        name: 'get-service-providers',
        payload: {
          restaurantId: this.restaurant._id
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

  trimName(menusOrOptions) {
    (menusOrOptions || []).forEach(x => {
      x.name = Helper.shrink(x.name);
      (x.mcs || []).forEach(mc => {
        mc.name = Helper.shrink(mc.name);
        (mc.mis || []).forEach(mi => {
          mi.name = Helper.shrink(mi.name);
          (mi.sizeOptions || []).forEach(so => {
            so.name = Helper.shrink(so.name);
          });
        });
      });
      // handle menuOptions
      (x.items || []).forEach(item => {
        item.name = Helper.shrink(item.name);
      });
    });
    return menusOrOptions;
  }

  async crawl(keepExistingMenus, synchronously = false) {
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
        let menus = this.trimName(crawledRestaurant.menus);
        let menuOptions = this.trimName(crawledRestaurant.menuOptions);
        if (keepExistingMenus) {
          const importedTime = new Date().toLocaleString('en-US', {
            timeZone: this.restaurant.googleAddress.timezone, ...Helper.FULL_DATETIME_LOCALE_OPTS
          });
          const timestamp = new Date().valueOf();
          menus = [
            ...(this.restaurant.menus || []),
            ...(menus.map(m => ({ ...m, id: m.id + timestamp, disabled: true, name: m.name + ` (imported ${importedTime})` })))
          ];
          menuOptions = [
            ...(this.restaurant.menuOptions || []),
            ...(menuOptions.map(m => ({ ...m, id: m.id + timestamp, disabled: true, name: m.name + ` (imported ${importedTime})` })))
          ];
        }
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: {
            _id: this.restaurant._id
          }, new: {
            _id: this.restaurant._id,
            menus, menuOptions
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
            event: {
              name: 'populate-menus',
              params: {
                restaurantId: this.restaurant._id,
                url: this.providerUrl,
                keepExistingMenus
              }
            }
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

  async cleanup() {
    this.menuCleanHandleIDsOnly = true;
    this.menuCleanModal.show();
    setTimeout(() => {
      this.cleanupComponent.collect();
    }, 0);
  }

  cleanupCancel() {
    this.menuCleanHandleIDsOnly = true;
    this.menuCleanModal.hide();
  }

  async cleanupSave({ menus, translations }: any) {
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus,
          translations
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      // @ts-ignore
      this.restaurant.menus = menus.map(m => new Menu(m));
      this.restaurant.translations = translations;
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
    this.menuEditor.selectedOption = 'New Menu';
    this.menuEditor.setMenu(new Menu());
    this.menuEditingModal.show();
  }

  // judge menu missing menu hours
  isMissingHoursMenu(menu) {
    return !menu.hours || (menu.hours && menu.hours.length === 0);
  }

  edit(menu) {
    this.menuEditor.setMenu(new Menu(menu));
    this.menuEditor.viewMenuLink = environment.customerPWAUrl + this.restaurant.alias + '/menu/' + menu.id;
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
    let totalMatched = 0;
    const images: ImageItem[] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'image',
      limit: 3000000
    }).toPromise();

    const oldMenus = this.restaurant.menus || [];
    const newMenus = JSON.parse(JSON.stringify(oldMenus));
    newMenus.map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => {
      /* the following is obsolete: 
          Image origin: "CSR", "RESTAURANT", "IMAGE-PICKER"
          only inject image when no existing image with origin as "CSR", "RESTAURANT", or overwrite images with origin as "IMAGE-PICKER"
      */
      try {
        // only inject if there is NO image
        if (mi && !mi.SkipImageInjection && (!mi.imageObjs || mi.imageObjs.length === 0)) {// !(mi.imageObjs.some(each => each.origin === 'CSR' || each.origin === 'RESTAURANT'))) {
          // 9/29/2021 use newer algorithm
          const matchingAlias = images.find(i => i.images && i.images.length > 0 && i.aliases.some(a => ImageItem.areAliasesSame(a, mi.name)));
          if (matchingAlias) {
            totalMatched++;
            mi.imageObjs = matchingAlias.images.map(each => ({
              originalUrl: each.url,
              thumbnailUrl: each.url192,
              normalUrl: each.url768,
              origin: 'IMAGE-PICKER'
            }));
          }
        }
      } catch (e) {
        console.log('mi', JSON.stringify(mi));
      }
    })));

    if (totalMatched > 0) {
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
        this._global.publishAlert(AlertType.Success, `${totalMatched} matched!`);
      } catch (error) {
        console.log(error);
        this._global.publishAlert(AlertType.Danger, 'Failed!');
      }
    } else {
      this._global.publishAlert(AlertType.Info, `No update because ${totalMatched} matched!`);
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
