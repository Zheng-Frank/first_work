import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
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


  @Input() menus = [];
  @Output() cancel = new EventEmitter();
  @Output() save = new EventEmitter();

  ngOnInit() {
  }


  change(item, prop, e) {
    item[`prev_${prop}`] = item[`prev_${prop}`] || item[prop];
    item[prop] = e.target.value;
  }

  async ok() {
    const clean = item => {
      if (item.cleanedName) {
        item.name = item.cleanedName;
        delete item.cleanedName;
      }
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
