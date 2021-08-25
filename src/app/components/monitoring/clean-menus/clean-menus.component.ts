import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {Menu, Restaurant} from '@qmenu/ui';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import {AlertType} from '../../../classes/alert-type';
import {MenuCleanupComponent} from '../../restaurants/menu-cleanup/menu-cleanup.component';

@Component({
  selector: 'app-clean-menus',
  templateUrl: './clean-menus.component.html',
  styleUrls: ['./clean-menus.component.css']
})
export class CleanMenusComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  @ViewChild('validateModal') validateModal: ModalComponent;
  @ViewChild('cleanupComponent') cleanupComponent: MenuCleanupComponent;
  @ViewChild('previewAutoModal') previewAutoModal: ModalComponent;
  restaurants: Restaurant[] = [];
  restaurant: Restaurant;
  handleIDsOnly = true;
  extractedMcs = [];

  async ngOnInit() {
    await this.getRTs();
  }

  async getRTs() {
    let rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {disabled: {$ne: true}, menuCleaned: {$ne: true}},
      projection: {name: 1},
      limit: 20000
    }, 10000);
    let needCleanMenus = new Set(require('./rts-need-clean-menu.json'));
    this.restaurants = rts.filter(rt => needCleanMenus.has(rt._id));
  }
  previewClose() {
    this.restaurant = null;
    this.extractedMcs = [];
    this.previewAutoModal.hide();
  }
  async previewAuto(rt) {
    let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {_id: {$oid: rt._id}},
      projection: {name: 1, menus: 1, translations: 1},
      limit: 1
    }).toPromise();
    this.restaurant = restaurant;
    this.extractedMcs = [];
    this.restaurant.menus.forEach(menu => {
      menu.mcs.forEach(mc => {
        // @ts-ignore
        let {numbers, confidence} = this.automaticExtractNumber(mc) || {};
        if (numbers) {
          this.extractedMcs.push({menu: menu.name, ...mc, numbers, confidence});
        }
      });
    });
    this.previewAutoModal.show();
  }

  automaticExtractNumber(mc) {
    if (!mc.mis) {
      return false;
    }
    let numbers = [], names = [], len = mc.mis.length, repeatNums = [];
    for (let i = 0; i < len; i++) {
      let mi = mc.mis[i];
      if (!mi.name || mi.number) {
        return false;
      }
      let [num, ...rest] = mi.name.split('.');
      // remove pure name's prefix ) or . or -
      let name = rest.join('.').replace(/^\s*[-).]\s*/, '').trim();
      num = num.trim();
      // cases to skip:
      // 1. num or name is empty; eg. Soda, B-A, B-B, Combo 1, Combo 2 etc.
      if (!num || !name) {
        continue;
      }
      // 2. name repeat; eg. 2 Wings, 3 Wings, 4 Wings, etc.
      if (names.some(n => n.toLowerCase() === name.toLowerCase())) {
        continue;
      }
      // 3. num includes 3+ continuous letter eg. Especial 1. Camarofongo, Especial 2. Camarofongo etc.
      if (/[a-z]{3,}/i.test(num)) {
        continue;
      }
      // 4. num contains non-english characters eg. 蛋花汤 S1. Egg Drop Soup, 云吞汤 S2. Wonton Soup etc.
      if (/[^\x00-\xff]/.test(num)) {
        continue;
      }
      // 5. num contains parentheses aka (), as we don't know if the () thing is related to the menu name
      if (/\(.*\)/.test(num)) {
        continue;
      }
      // 6. original name startsWith 805 B.B.+ etc
      if (/^(\d+\s+)*([a-zA-Z]+\.){2,}/.test(mi.name)) {
        continue;
      }
      // 7. original name startsWith 12 oz. etc
      if (/^(\d+\.?)+\s+[a-zA-Z]{2,}\./.test(mi.name)) {
        continue;
      }
      names[i] = name;
      // if or num repeat, we save the repeat num and index for later use
      if (numbers.some(n => n.toLowerCase() === num.toLowerCase())) {
        repeatNums[i] = num;
        continue;
      }
      // if num has (), we should extract the () and set to name
      let [remark] = num.match(/\(.*\)/) || [""];
      if (remark) {
        names[i] = remark + names[i];
      }
      numbers[i] = num;
    }
    // only handle mcs with at least 5 mis
    if (numbers.length < 5) {
      return false;
    }
    let confidence = numbers.filter(n => !!n).length / len;
    console.log(mc.name, confidence, numbers, repeatNums);
    // calculate exception ratio , skip lower then 0.79 (4 of 5)
    if (Math.ceil(confidence * 100) < 80) {
      return false;
    }
    return {numbers: mc.mis.map((x, i) => numbers[i] || repeatNums[i]), confidence};
  }

  async clean(rt) {
    let [restaurant] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {_id: {$oid: rt._id}},
      projection: {name: 1, menus: 1, translations: 1},
      limit: 1
    }).toPromise();
    this.restaurant = restaurant;
    this.handleIDsOnly = true;
    this.validateModal.show();
    setTimeout(() => {
      this.cleanupComponent.collect();
    }, 0);
  }


  cleanupCancel() {
    // @ts-ignore
    this.restaurants = this.restaurants.filter(rt => !rt.menuCleaned);
    this.restaurant = null;
    this.validateModal.hide();
    this.handleIDsOnly = true;
  }

  async cleanupSkip() {
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'], menuCleaned: true
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      let rt = this.restaurants.find(x => x._id === this.restaurant._id);
      if (rt) {
        // @ts-ignore
        rt.menuCleaned = true;
      }
      this.cleanupCancel();
    } catch (error) {
      console.log('error...', error);
      this._global.publishAlert(AlertType.Danger, 'Menus update failed.');
    }
  }

  async cleanupSave({menus, translations}: any) {
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus, translations, menuCleaned: true
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      // @ts-ignore
      this.restaurant.menus = menus.map(m => new Menu(m));
      let rt = this.restaurants.find(x => x._id === this.restaurant._id);
      if (rt) {
        // @ts-ignore
        rt.menuCleaned = true;
      }
      this.cleanupCancel();
    } catch (error) {
      console.log('error...', error);
      this._global.publishAlert(AlertType.Danger, 'Menus update failed.');
    }
  }
}
