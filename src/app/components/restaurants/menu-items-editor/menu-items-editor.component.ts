import { Component, ViewChild, OnInit, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Mc, Item, Mi, MenuOption } from '@qmenu/ui';
import { OptionsEditorComponent, SelectorComponent } from '../options-editor/options-editor.component';
import { Router, NavigationStart } from '@angular/router';

declare var $: any;

@Component({
  selector: 'app-menu-items-editor',
  templateUrl: './menu-items-editor.component.html',
  styleUrls: ['./menu-items-editor.component.css']
})
export class MenuItemsEditorComponent implements OnInit {

  @Input() mc: Mc;
  @Input() menuOptions: MenuOption[] = [];

  @Output() onDone = new EventEmitter();
  @Output() onCancel = new EventEmitter();

  constructor() { }

  setMc(mc: Mc, menuOptions: MenuOption[]) {

    let mcCopy: Mc;
    mcCopy = new Mc(mc);
    this.mc = mcCopy;
    this.menuOptions = (menuOptions || []).filter(mo => !(mc.menuOptionIds || []).some(id => mo.id === id));

    // attach 2 more size options for existing ones

    this.mc.mis.map(mi => {
      [0, 1].map(i => {
        const item = new Item();
        mi.sizeOptions.push(item);
      });
    });

    let baseId = new Date().valueOf() + '';
    // add 10 extra empty items
    for (let i = 0; i < 10; i++) {
      const mi = new Mi();
      mi.category = mc.id;
      mi.id = baseId + i.toString();
      mi.sizeOptions = [];

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

  ok() {
    //
    // should do validation first
    //let's remove empty menuOptionIds
    if (this.mc.menuOptionIds && this.mc.menuOptionIds.length === 0) {
      delete this.mc.menuOptionIds;
    }

    // remove empty sizeOptions!
    this.mc.mis.map(mi => {
      mi.sizeOptions = mi.sizeOptions.filter(i => i.name && i.price);
    });

    // remove empty mis
    this.mc.mis = this.mc.mis.filter(mi => mi.sizeOptions.length > 0 && mi.name
    );

    console.log(this.mc);

    this.onDone.emit(this.mc);
  }

  cancel() {
    this.onCancel.emit(this.mc);
  }


}




