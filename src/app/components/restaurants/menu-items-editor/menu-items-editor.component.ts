import { filter } from 'rxjs/operators';
import { GlobalService } from './../../../services/global.service';
import { AlertType } from 'src/app/classes/alert-type';
import { Component, ViewChild, OnInit, Input, Output, EventEmitter, OnChanges } from '@angular/core';
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

  formatNumber = '';
  checkedAll = false;
  showExplanation = false; // to control the icon show explanations or not.
  hideTranslations = true;
  showMoreFunction = false; // a flag to decide whether show adjustment number tools
  constructor(private _global: GlobalService) { }

  // this function is to check all items quickly.
  checkAllItems() {
    if (this.checkedAll) {
      this.mc.mis.forEach(mi => mi && mi.name && (mi.beChecked = true));
    } else {
      this.mc.mis.forEach(mi => mi && mi.name && (mi.beChecked = false));
    }
  }

  // When the checkbox is be checked it should have a temp value to decide 
  setMiChecked(mi) {
    mi.beChecked = !mi.beChecked;
  }
  getCheckItemNumber() {
    return this.mc.mis.filter(item => item.beChecked).length;
  }
  adjustMenuItemsNumber() {
    if (this.getCheckItemNumber() === 0) {
      return this._global.publishAlert(AlertType.Danger, 'Please check one item at least.');
    }
    if (!(this.formatNumber || '').trim()) {
      return this._global.publishAlert(AlertType.Danger, 'Please input a number.');
    }
    // 0-9
    // A1
    // 1A
    // let regxp = /^(\d+)|([a-zA-Z]\d+)|(\d+[a-zA-Z])$/;
    let regxp = /^((\d{0,2})|(([a-z])(\d{0,2}))|((\d{0,2})([a-z])))$/i;
    // the format number must contains a number
    let temp = this.formatNumber.match(regxp);
    if (!temp) { // if it don't match any case,the temp consoled is null.
      return this._global.publishAlert(AlertType.Danger, 'Input format number error.');
    }

    let wordBeforeNumber = true;
    let onlyNumber = false;
    let number;
    let word = '';

    if (/[0-9]/.test(temp[7])) { // the case of 1A
      wordBeforeNumber = false;
      number = Number(temp[7]);
      word = temp[8];
    } else if(/[0-9]/.test(temp[5])){ // the case of A1
      number = Number(temp[5]);
      word = temp[4];
    }else if(/[0-9]/.test(temp[2])){ // the case of 1
      onlyNumber = true;
      number = Number(temp[2]);
    }
    let filterItems = this.mc.mis.filter(item => item.beChecked);
    // A1 1
    //let number = Number(this.formatNumber.replace(/[a-z]/i, '')); // /i is ignore.
    //let word = this.formatNumber.replace(/[0-9]/g, ''); // /g is global.

    filterItems.forEach(item => {
      if(onlyNumber){
        item.number = number;
        number++;
      }else{
        if (wordBeforeNumber) {
          item.number = word + number;
          number++;
        } else {
          item.number = number + word;
          number++;
        }
      }
    });

    this.mc.mis = this.mc.mis.filter(item => !item.beChecked);
    this.mc.mis = [...filterItems, ...this.mc.mis];
     // clean up format number input and change check all to default.
    this.formatNumber = '';
    this.checkedAll = false;
    this.ok();
  }

  setMc(mc: Mc, menuOptions: MenuOption[]) {

    let mcCopy: Mc;
    mcCopy = new Mc(mc);
    this.mc = mcCopy;
    this.menuOptions = (menuOptions || []).filter(mo => !(mc.menuOptionIds || []).some(id => mo.id === id));

    this.mc.mis.forEach(mi => {
      let translation = QMenuUIHelper.extractNameTranslation(mi.name) || {en: ''};
      // temporarily add translation to mi for convenient use;
      let { en, zh } = translation;
      // @ts-ignore
      mi.translation = (this.translations || []).find(x => x.EN === en) || {EN: en, ZH: zh};
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
      // @ts-ignore
      mi.translation = {en: ''} as IMenuTranslation;

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
    // remove checked property.
    this.mc.mis.forEach(mi => delete mi.beChecked);
    //
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

    this.onDone.emit(this.mc);
  }

  cancel() {
    // remove temporarily added property
    // @ts-ignore
    this.mc.mis.forEach(mi => delete mi.translation);
    this.onCancel.emit(this.mc);
  }


}




