import { GlobalService } from '../../../services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {Mc, Item, Mi, MenuOption, IMenuTranslation, Helper as QMenuUIHelper} from '@qmenu/ui';

declare var $: any;

@Component({
  selector: 'app-menu-items-editor',
  templateUrl: './menu-items-editor.component.html',
  styleUrls: ['./menu-items-editor.component.css']
})
export class MenuItemsEditorComponent implements OnInit {

  @Input() mc;
  @Input() menuOptions: MenuOption[] = [];
  @Input() translations = [];
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  editingTranslations = [];
  formatNumber = '';
  checkedItems = [];
  checkedAll = false;
  showExplanation = false; // to control the icon show explanations or not.
  hideTranslations = true;
  showMoreFunction = false; // a flag to decide whether show adjustment number tools
  constructor(private _global: GlobalService) { }

  // this function is to check all items quickly.
  checkAllItems() {
    if (this.checkedAll) {
      this.checkedItems = this.mc.mis.map(x => x.id);
    } else {
      this.checkedItems = [];
    }
  }

  toggleMoreFunctions() {
    this.showMoreFunction = !this.showMoreFunction;
    this.formatNumber = '';
    this.checkedItems = [];
    this.hideTranslations = true;
  }

  // When the checkbox is be checked it should have a temp value to decide
  setMiChecked(mi) {
    if (this.checkedItems.includes(mi.id)) {
      this.checkedItems = this.checkedItems.filter(x => x !== mi.id);
    } else {
      this.checkedItems.push(mi.id);
    }
  }
  adjustMenuItemsNumber() {
    let len = this.checkedItems.length;
    if (!len) {
      return this._global.publishAlert(AlertType.Danger, 'Please check one item at least.');
    }
    if (!(this.formatNumber || '').trim()) {
      return this._global.publishAlert(AlertType.Danger, 'Please input a number.');
    }
    this.formatNumber = this.formatNumber.trim();

    let regex1 = /^([a-z]{0,2})(\d+)$/i;
    let regex2 = /^(\d+)([a-z]{0,2})$/i;
    let regex3 = /^(No\.\s?)(\d+)$/i;

    let matched = [regex1, regex2, regex3].reduce((a, c) => a || this.formatNumber.match(c), null);
    if (!matched) {
      return this._global.publishAlert(AlertType.Danger, 'Input format number error.');
    }

    let [, prefix, num] = matched;

    if (/\d/.test(num)) {
      let base = Number.parseInt(num, 10);
      this.mc.mis.forEach(mi => {
        if (this.checkedItems.includes(mi.id)) {
          mi.number = `${prefix}${base}`;
          base++;
        }
      });
    } else {
      // input number is end with letters, we should calculate the increment letters
      // A: 65, Z: 90, a: 97, z: 122
      let [head, tail] = num.split('').map(l => l.charCodeAt(0));
      const getCapacity = charCode => charCode < 97 ? 90 - charCode : 122 - charCode;
      let capacity = getCapacity(head);
      if (tail) {
        capacity += getCapacity(tail);
      }

      if (capacity < len) {
        return this._global.publishAlert(AlertType.Danger, 'Invalid input.');
      }

      this.mc.mis.forEach(mi => {
        if (this.checkedItems.includes(mi.id)) {
          let headLetter = String.fromCharCode(head),
            tailLetter = tail ? String.fromCharCode(tail) : '';
          mi.number = `${prefix}${headLetter}${tailLetter}`;
          if (tailLetter) {
            if (tailLetter.toLowerCase() === 'z') {
              head++;
              tail -= 25;
            } else {
              tail++;
            }
          } else {
            head++;
          }
        }
      });
    }

  }

  setMc(mc: Mc, menuOptions: MenuOption[]) {

    this.editingTranslations = [];
    let mcCopy: Mc;
    mcCopy = new Mc(mc);
    this.mc = mcCopy;
    this.menuOptions = (menuOptions || []).filter(mo => !(mc.menuOptionIds || []).some(id => mo.id === id));

    this.mc.mis.forEach((mi, i) => {
      let translation = QMenuUIHelper.extractNameTranslation(mi.name) || {en: ''};
      // temporarily add translation to mi for convenient use;
      let { en, zh } = translation;
      this.editingTranslations[i] = (this.translations || []).find(x => x.EN === en) || {EN: en, ZH: zh};
      // attach 2 more size options for existing ones
      [0, 1].forEach(() => {
        const item = new Item();
        mi.sizeOptions.push(item);
      });
    });
    let baseId = new Date().valueOf() + '';
    // add 20 extra empty items
    for (let i = 0; i < 20; i++) {
      const mi = new Mi();
      mi.category = mc.id;
      mi.id = baseId + i.toString();
      mi.sizeOptions = [];
      this.editingTranslations.push({EN: ''});

      ['regular', 'small', 'large'].forEach(
        size => {
          const item = new Item();
          item.name = size;
          mi.sizeOptions.push(item);
        }
      );
      this.mc.mis.push(mi);
    }
  }

  ngOnInit() {
  }

  isSpicy(mi) {
    return mi.flavors && mi.flavors['Spicy'];
  }

  setSpicy(mi) {
    mi.flavors = mi.flavors || {};
    mi.flavors['Spicy'] = (this.isSpicy(mi) ? undefined : 1);
  }

  ok() {
    // should do validation first
    // let's remove empty menuOptionIds
    if (this.mc.menuOptionIds && this.mc.menuOptionIds.length === 0) {
      delete this.mc.menuOptionIds;
    }

    // remove empty sizeOptions!
    this.mc.mis.map(mi => {
      mi.sizeOptions && (mi.sizeOptions = mi.sizeOptions.filter(i => i.name && i.price));
    });

    // remove empty mis
    this.mc.mis = this.mc.mis.filter(mi => mi.sizeOptions && mi.sizeOptions.length > 0 && mi.name);
    this.onDone.emit({ mc: this.mc, updatedTranslations: this.editingTranslations });
    // restore format number and checked items
    this.formatNumber = '';
    this.checkedAll = false;
    this.showMoreFunction = false;
    this.checkedItems = [];
  }

  cancel() {
    // restore initial state
    this.formatNumber = '';
    this.checkedItems = [];
    this.hideTranslations = true;
    this.showMoreFunction = false;
    this.onCancel.emit(this.mc);
  }


}




