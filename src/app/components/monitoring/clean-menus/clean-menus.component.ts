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
  restaurants: Restaurant[] = [];
  restaurant: Restaurant;

  ngOnInit() {
    this.getRTs();
  }

  async getRTs() {
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {disabled: {$ne: true}},
      projection: {name: 1, menus: 1, translations: 1},
      limit: 20000
    }, 50);
  }

  parsePrefixNum(name) {
    // 1) A1. XXX; A12. XXX; A1 XXX; A12 XXX; AB1 XXX; AB12 XXX; AB12. XXX; AB1. XXX;
    let regex1 = /^(?<to_rm>(?<num>([a-z]{0,2}\d+))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    // 2) 1A XXX; 12A XXX; 11B. XXX; 1B. XXX;
    let regex2 = /^(?<to_rm>(?<num>(\d+[a-z]{0,2}))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    // 3) No. 1 XXX; NO. 12 XXX;
    let regex3 = /^(?<to_rm>(?<num>(No\.\s?\d+))\s+)(?<word>\S+)\s*/i;
    return [regex1, regex2, regex3].reduce((a, c) => a || name.match(c), null);
  }

  get filteredRTs() {
    return this.restaurants.filter(rt => this.needClean(rt));
  }

  needClean(restaurant) {
    let { menus, translations } = restaurant;

    for (let i = 0; i < (menus || []).length; i++) {
      if (this.detect(menus[i], translations)) {
        return true;
      }
      for (let j = 0; j < (menus[i].mcs || []).length; j++) {
        if (this.detect(menus[i].mcs[j], translations)) {
          return true;
        }
        for (let k = 0; k < (menus[i].mcs[j].mis || []).length; k++) {
          if (this.detect(menus[i].mcs[j].mis[k], translations)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  detect(item, translations) {
    let { name } = item;
    if (!name) {
      return false;
    }

    name = name.trim();
    // extract the possible number info from menu's name
    let numMatched = this.parsePrefixNum(name);
    // if name itself has a number, like 3 cups chicken, 4 pcs XXX etc. these will extract the measure word to judge
    let measureWords = [
      'piece', 'pieces', 'pc', 'pcs', 'pc.', 'pcs.', 'cups', 'cup',
      'liter', 'liters', 'oz', 'oz.', 'ounces', 'slice', 'lb.', 'item',
      'items', 'ingredients', 'topping', 'toppings', 'flavor', 'flavors'
    ];
    let number, hasMeasure = false;
    if (numMatched) {
      let { to_rm, num, dot, word } = numMatched.groups;
      // if dot after number, definite number, otherwise we check if a measure word after number or not
      hasMeasure = measureWords.includes((word || '').toLowerCase());
      if (!!dot || !hasMeasure) {
        // remove leading number chars
        name = name.replace(to_rm, '');
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

      let trans = (translations || []).find(x => x.EN === en);
      return !(trans && trans.ZH === zh && !number);
    }
    return number || hasMeasure;
  }

  validate(rt) {
    this.restaurant = rt;
    this.validateModal.show();
    setTimeout(() => {
      this.cleanupComponent.collect();
    }, 0);
  }


  cleanupCancel() {
    this.validateModal.hide();
  }

  async cleanupSave({menus, translations}) {
    try {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {
          _id: this.restaurant['_id']
        }, new: {
          _id: this.restaurant['_id'],
          menus, translations
        }
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Success!');
      // @ts-ignore
      this.restaurant.menus = menus.map(m => new Menu(m));
      this.cleanupCancel();
    } catch (error) {
      console.log('error...', error);
      this._global.publishAlert(AlertType.Danger, 'Menus update failed.');
    }
  }
}
