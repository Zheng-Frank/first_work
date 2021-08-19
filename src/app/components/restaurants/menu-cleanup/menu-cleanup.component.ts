import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
declare var $;
@Component({
  selector: 'app-menu-cleanup',
  templateUrl: './menu-cleanup.component.html',
  styleUrls: ['./menu-cleanup.component.css']
})
export class MenuCleanupComponent implements OnInit, OnChanges {

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

  ngOnChanges(changes: SimpleChanges) {
    if (changes.handleIDsOnly && changes.handleIDsOnly.currentValue !== changes.handleIDsOnly.previousValue) {
      this.collect();
    }
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
    if (!name || !!item.number) {
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
    let numbers = [];
    if (!mc.mis) {
      return;
    }
    mc.mis.forEach((mi) => {
      // if mi has no name or has a number, skip
      if (!mi.name || mi.number) {
        numbers.push(null);
        return false;
      }
      let num = mi.name.split('.')[0];
      numbers.push(num.trim());
    });
    // if numbers less than 5, or have empty number item,
    // or have number includes 3+ continuous letter,
    // or have number includes non-english characters, skip
    if (numbers.length < 5 || numbers.some(n => !n || /[a-z]{3,}/i.test(n) || /[^\x00-\xff]/.test(n))) {
      return;
    }
    let base = numbers.shift();
    if (!base) {
      return;
    }


    let baseLastCharCode = base.charCodeAt(base.length - 1);
    let flag = numbers.every((n, i) => {
      // make sure the extracted number is increasing
      // check the last character
      return baseLastCharCode + (i + 1) === n.charCodeAt(n.length - 1);
    });
    if (flag) {
      // make update
      numbers.unshift(base);
      let mis = mc.mis.map((mi, index) => {
        let num = numbers[index];
        let names = mi.name.split('.');
        names.shift();
        // remove pure name's prefix ) or .
        return {...mi, name: names.join('.').replace(/^\s*[).]\s*/, '').trim(), number: num};
      });
      // if the updated name is empty, we should skip, eg: comb1, comb2, comb3, etc... -> empty name
      if (mis.some(x => !x.name)) {
        return;
      }
      mc.mis = mis;
    }
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
