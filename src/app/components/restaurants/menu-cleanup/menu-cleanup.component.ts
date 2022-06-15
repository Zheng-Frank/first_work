import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import { MenuCleaner } from 'src/app/classes/menu-cleaner';

declare var $;
@Component({
  selector: 'app-menu-cleanup',
  templateUrl: './menu-cleanup.component.html',
  styleUrls: ['./menu-cleanup.component.css']
})
export class MenuCleanupComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  @Input() allMenus = [];
  @Input() translations;
  @Output() cancel = new EventEmitter();
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
    let numMatched = MenuCleaner.parsePrefixNum(name);
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

      let extracted = MenuCleaner.extractMenuItemNames(name);
      if (extracted) {
        let { zh, en } = extracted;
        // en maybe empty, and if user does not input the en and save, the EN will alse be empty;
        let trans = (this.translations || []).find(x => (en && x.EN === en) || (!en && zh && x.ZH === zh));

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

  autoClean(menus) {
    let changed = false;
    menus.forEach(menu => {
      menu.mcs.forEach(mc => {
        changed = changed || (!!MenuCleaner.extractMenuItemNumber(mc));
      });
    });
    return changed;
  }

  cleanFields(menus) {
    menus.forEach(menu => {
      delete menu.editName;
      delete menu.cleanedName;
      delete menu.editNumber;
      (menu.mcs || []).forEach(mc => {
        delete mc.editName;
        delete mc.cleanedName;
        delete mc.editNumber;
        (mc.mis || []).forEach(mi => {
          delete mi.editName;
          delete mi.cleanedName;
          delete mi.editNumber;
          (mi.sizeOptions || []).forEach(so => {
            delete so.editName;
            delete so.cleanedName;
            delete so.editNumber;
          })
        })
      })
    })
    return menus;
  }

  collect() {
    $('.modal .cleanup-menus').animate({ scrollTop: 0 }, 'slow');
    this.copied = [];
    this.flattened = [];
    if (this.allMenus) {
      this.copied = JSON.parse(JSON.stringify(this.allMenus));
      // run auto clean first
      let autoChanged = this.autoClean(this.copied);

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
      // if (!this.flattened.length && autoChanged) {
      //   this.save.emit({menus: this.cleanFields(this.copied), translations: this.translations});
      // }
      console.log('auto...', autoChanged)
      console.log('flatten...', this.flattened)
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
      // check by en, then prev_en, if en is empty, we should check zh
      let translation = translations.find(x => (en && x.EN === en) || (prev_en && x.EN === prev_en) || (!en && zh && x.ZH === zh));
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
    await this.save.emit({menus: this.cleanFields(copied), translations});
  }

}
