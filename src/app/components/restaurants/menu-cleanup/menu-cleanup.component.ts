import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
declare var $;
@Component({
  selector: 'app-menu-cleanup',
  templateUrl: './menu-cleanup.component.html',
  styleUrls: ['./menu-cleanup.component.css']
})
export class MenuCleanupComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  @Input() hasSkip = false;
  @Input() allMenus = [];
  @Input() translations;
  @Output() cancel = new EventEmitter();
  @Output() skip = new EventEmitter();
  @Output() save = new EventEmitter();
  @Input() handleIDsOnly = false;

  flattened = [];
  copied = [];

  ngOnInit() {
  }

  restore(item, index) {
    item.editName = item.name;
    item.translation = {};
    item.editNumber = item.number || '';
    this.flattened.splice(index, 1, item);
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


  detect(item, indices) {
    let { name } = item;
    if (!name) {
      return;
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
        item.cleanedName = name;
      }

      // if no measure word, or have dot, or num is not pure digits
      // we think we have matched a number
      if (!hasMeasure || !!dot || /[^\d]/.test(num)) {
        number = item.number || num;
        // if no dot, no measure word, just digits, we should warn that the digits maybe is not number
        if (!dot && /^\d+$/.test(num)) {
          // if item already have a number prop under this condition
          // we should think the extracted num is just part of name
          if (item.number) {
            number = undefined;
          } else {
            // otherwise, we should mark this item warning
            item.warning = true;
          }
        }
      }
    }


    item.editName = name;
    // we capture 中文， 中文 带空格，(括号内中文)，'引号内中文"
    let regex = /\s*[('"]?[^\x00-\xff](\s*([^\x00-\xff]|\d|\(|\)|'|")+)*\s*/;
    let re = name.match(regex);
    if (re) {
      let zh = re[0].trim(), en = name.replace(regex, '').trim().replace(/\s*-$/, '');
      // strip ()[]''"" pairs around name
      const strip = str => str.replace(/^\((.+)\)$/, '$1').replace(/^\[(.+)]$/, '$1')
          .replace(/^'(.+)'$/, '$1').replace(/^"(.+)"$/, '$1');
      en = strip(en);
      zh = strip(zh);

      let trans = (this.translations || []).find(x => x.EN === en);

      if (trans && trans.ZH === zh && !number) {
        return;
      }

      item.translation = { zh, en };
      item.editNumber = item.number || number;
      // indices is used to locate the item in whole menus array
      // cause we need to clone the finished data and lose the reference
      item.indices = indices;
      this.flattened.push(item);
    } else {
      if (number) {
        item.translation = { en: name };
        item.editNumber = item.number || number;
        item.indices = indices;
        this.flattened.push(item);
      }
    }

  }

  collect() {
    $('.modal .cleanup-menus').animate({ scrollTop: 0 }, 'slow');
    this.copied = [];
    this.flattened = [];
    if (this.allMenus) {
      this.copied = JSON.parse(JSON.stringify(this.allMenus));
      this.copied.forEach((menu, i) => {
        this.detect(menu, [i]);
        menu.mcs.forEach((mc, j) => {
          this.detect(mc, [i, j]);
          mc.mis.forEach((mi, k) => {
            this.detect(mi, [i, j, k]);
          });
        });
      });
      // sort, first by warning (warning rows first), then on number field by numeric order if has digit Number, otherwise by alphabet order
      let warnings = this.flattened.filter(x => x.warning);
      let normals = this.flattened.filter(x => !x.warning);
      this.flattened = this.flattened.sort((a, b) => Number(a.warning) - Number(b.warning));
    }
  }

  change(item, prop, e, prev?) {
    if (prev) {
      item[prev] = item[prev] || item[prop];
    }
    item[prop] = e.target.value;
  }

  saveTranslation(item, translations) {
    if (item.translation) {
      let { zh, en, prev_en } = item.translation;
      let translation = translations.find(x => x.EN === en || x.EN === prev_en);
      if (!translation) {
        translation = { EN: en, ZH: zh };
        translations.push(translation);
      } else {
        translation.EN = en;
        translation.ZH = zh;
      }
      delete item.translation;
    }
  }

  extractTranslations(copied, flattened) {
    let translations = JSON.parse(JSON.stringify(this.translations || []));
    flattened.forEach(item => {
      if (item.cleanedName) {
        item.name = item.cleanedName;
        delete item.cleanedName;
      }
      if (item.editName) {
        item.name = item.editName;
        delete item.editName;
      }
      item.number = item.editNumber;
      delete item.editNumber;
      if (!this.handleIDsOnly) {
        this.saveTranslation(item, translations);
      } else {
        delete item.translation;
      }
      let [i, j, k] = item.indices;
      delete item.indices;
      if (Number.isInteger(k)) {
        copied[i].mcs[j].mis[k] = item;
      } else if (Number.isInteger(j)) {
        copied[i].mcs[j] = item;
      } else {
        copied[i] = item;
      }
    });
    return translations;
  }

  async ok() {
    let flattened = JSON.parse(JSON.stringify(this.flattened));
    let copied = JSON.parse(JSON.stringify(this.copied));
    let translations = this.extractTranslations(copied, flattened);
    await this.save.emit({menus: copied, translations});
  }

}
