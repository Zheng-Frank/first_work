import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
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
  @Input() handleIDsOnly = true;

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

  parsePrefixNum (name) {
    // 1) A. XXX; A1. XXX; A 1. XXX A12. XXX; A1 XXX; A12 XXX; AB1 XXX; AB12 XXX; AB12. XXX; AB1. XXX;
    let regex1 = /^(?<to_rm>(?<num>([a-z]{0,2}\s?\d*))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    // 2) 1. XXX; #1. XXX; 1A XXX; 12A XXX; 11B. XXX; 1B. XXX;
    let regex2 = /^(?<to_rm>(?<num>(#?\d+[a-z]{0,2}))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    // 3) No. 1 XXX; NO. 12 XXX;
    let regex3 = /^(?<to_rm>(?<num>(No\.\s?\d+))\s+)(?<word>\S+)\s*/i;
    // 4) 中文 A1. XXX
    let regex4 = /^(?<zh>[^\x00-\xff]+\s*)(?<to_rm>(?<num>([a-z]{1,2}\s?\d+))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    // 5) (XL) A1. XXX
    let regex5 = /^(?<mark>\(\w+\)\s*)(?<to_rm>(?<num>([a-z]{1,2}\s?\d+))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    return [regex1, regex2, regex3, regex4, regex5].reduce((a, c) => a || name.match(c), null);
  }


  detect(item, indices) {
    let { name } = item;
    // if name is empty or item has number already, skip
    if (!name) {
      return;
    }
    name = name.trim();

    // skip continuous letter+dot, eg. 805 B.B.Q  etc
    if (/^(\d+\s+)*([a-zA-Z]+\.){2,}/.test(name)) {
      return;
    }

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
      if (num && /\D+$/.test(num)) {
        let [suffix] = num.match(/\D+$/);
        // for 20oz XXX case
        hasMeasure = measureWords.includes((suffix || '').toLowerCase());
        if (hasMeasure) {
          num = num.replace(/\D+$/, '');
        }
      }

      if (!!dot) {
        number = num;
      } else {
        // if has measure word, we check if num has non-digits character
        if (hasMeasure) {
          if (/\D+/.test(num)) {
            number = num;
          }
        } else {
          // if no measure word, no dot and pure digits or digits with L/l
          // we check the item's number property
          if (/^\d+L?$/i.test(num)) {
            number = num;
            if (item.number) {
              number = undefined;
            } else {
              item.warning = true;
            }
          } else {
            // no dot and measure word, not pure digits, we check if num has digits
            if (/\d/.test(num)) {
              number = num;
            }
          }
        }
      }
      if (number) {
        // remove leading number chars
        name = name.replace(to_rm, '');
        item.cleanedName = name;
      }
    }

    item.editName = name;
    if (this.handleIDsOnly) {
      if (number) {
        item.translation = { en: name };
        item.editNumber = item.number || number;
        item.indices = indices;
        this.flattened.push(item);
      }
    } else {

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

  }

  automaticExtractNumber(mc) {
    if (!mc.mis) {
      return;
    }
    let numbers = [], names = [], len = mc.mis.length, repeatNums = [];
    for (let i = 0; i < len; i++) {
      let mi = mc.mis[i];
      if (!mi.name || mi.number) {
        return;
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
      return;
    }
    let confidence = numbers.filter(n => !!n).length / len;
    // calculate exception ratio , skip lower then 0.79 (4 of 5)
    if (Math.ceil(confidence * 100) < 80) {
      return false;
    }
    mc.mis.forEach((mi, i) => {
      if (numbers[i] || repeatNums[i]) {
        mi.number = numbers[i] || repeatNums[i];
        mi.name = names[i];
      }
    });
  }

  autoClean(menus) {
    menus.forEach(menu => {
      menu.mcs.forEach(mc => {
        this.automaticExtractNumber(mc);
      });
    });
  }

  collect() {
    $('.modal .cleanup-menus').animate({ scrollTop: 0 }, 'slow');
    this.copied = [];
    this.flattened = [];
    if (this.allMenus) {
      this.copied = JSON.parse(JSON.stringify(this.allMenus));
      // run auto clean first
      this.autoClean(this.copied);

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
      const sortNumber = (a, b) => {
        // compare digit part with math
        // compare letter part with alphabet order
        let regex = /^(\D*)(\d*|\d+\.\d+)(\D*)$/;
        let [, prefixA, digitsA, suffixA] = (a.editNumber || '').replace(/\s+/g, '').match(regex);
        let [, prefixB, digitsB, suffixB] = (b.editNumber || '').replace(/\s+/g, '').match(regex);
        if ((prefixA || prefixB) && prefixA !== prefixB) {
          return prefixA > prefixB ? 1 : -1;
        }
        if (digitsA || digitsB) {
          return (Number(digitsA) || Number.POSITIVE_INFINITY) - (Number(digitsB) || Number.POSITIVE_INFINITY);
        }
        return suffixA > suffixB ? 1 : (suffixA < suffixB ? -1 : 0);
      };
      this.flattened = [...(warnings.sort(sortNumber)), ...(normals.sort(sortNumber))];
      // if the auto clean is enough for all menus
      // just save the cleaned menus
      console.log(JSON.stringify(this.flattened));
      if (!this.flattened.length) {
        this.save.emit({menus: this.copied, translations: this.translations});
      }
    }
  }

  change(item, prop, e, prev?) {
    if (prev) {
      item[prev] = item[prev] || item[prop];
    }
    item[prop] = e.target.value;
  }

  getPath(indices) {
    let [i, j, k] = indices;
    let names = [];

    if (Number.isInteger(i)) {
      names.push(this.copied[i].name);
      if (Number.isInteger(j)) {
        names.push(this.copied[i].mcs[j].name);
        if (Number.isInteger(k)) {
          names.push(this.copied[i].mcs[j].mis[k].name);
        }
      }
    }
    names.pop();
    return names.join(' -> ');
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
