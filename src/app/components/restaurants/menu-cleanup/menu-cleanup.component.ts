import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Restaurant} from '@qmenu/ui';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';

@Component({
  selector: 'app-menu-cleanup',
  templateUrl: './menu-cleanup.component.html',
  styleUrls: ['./menu-cleanup.component.css']
})
export class MenuCleanupComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) {
  }


  @Input() restaurant: Restaurant;
  @Input() menus = [];
  @Output() cancel = new EventEmitter();
  @Output() save = new EventEmitter();


  displaySettings = [
    {value: 'en', text: 'Eng'},
    {value: 'zh', text: '中文'},
    {value: 'en-zh', text: 'Eng - 中文'},
    {value: 'zh-en', text: '中文 - Eng'}
  ];

  ngOnInit() {
  }


  change(item, prop, e) {
    item[prop] = e.target.value;
  }

  async ok() {
    const clean = item => {
      item.name = item.cleanedName;
      delete item.cleanedName;
    };
    this.menus.forEach(menu => {
      clean(menu);
      // menuOptions
      (menu.items || []).forEach(moi => {
        clean(moi.name);
      });
      // menus
      (menu.mcs || []).forEach(mc => {
        clean(mc);
        (mc.mis || []).forEach(mi => {
          clean(mi);
          (mi.sizeOptions || []).forEach(so => {
            clean(so);
          });
        });
      });
    });

    this.save.emit(this.menus);
  }

}
