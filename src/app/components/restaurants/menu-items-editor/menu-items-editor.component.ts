import { Component, ViewChild, OnInit, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import {Mc, Item, Mi, MenuOption, IMenuTranslation, Helper as QMenuUIHelper} from '@qmenu/ui';

declare var $: any;

@Component({
  selector: 'app-menu-items-editor',
  templateUrl: './menu-items-editor.component.html',
  styleUrls: ['./menu-items-editor.component.css']
})
export class MenuItemsEditorComponent implements OnInit {

  @Input() mc: Mc;
  @Input() menuOptions: MenuOption[] = [];
  @Input() translations = [];
  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  hideTranslations = true;

  constructor() { }

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
    mi.flavors['Spicy'] = (this.isSpicy(mi) ? undefined: 1);
  }

  ok() {
    //
    // should do validation first
    // let's remove empty menuOptionIds
    if (this.mc.menuOptionIds && this.mc.menuOptionIds.length === 0) {
      delete this.mc.menuOptionIds;
    }

    // remove empty sizeOptions!
    this.mc.mis.map(mi => {
      mi.sizeOptions = mi.sizeOptions.filter(i => i.name && i.price);
    });

    // remove empty mis
    this.mc.mis = this.mc.mis.filter(mi => mi.sizeOptions.length > 0 && mi.name);

    this.onDone.emit(this.mc);
  }

  cancel() {
    // remove temporarily added property
    // @ts-ignore
    this.mc.mis.forEach(mi => delete mi.translation);
    this.onCancel.emit(this.mc);
  }


}




