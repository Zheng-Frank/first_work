import {Component, OnInit} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {Restaurant} from '@qmenu/ui';

@Component({
  selector: 'app-monitoring-promotion',
  templateUrl: './monitoring-promotion.component.html',
  styleUrls: ['./monitoring-promotion.component.css']
})
export class MonitoringPromotionComponent implements OnInit {


  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  rts: Restaurant[] = [];

  ngOnInit() {
    this.findRTsWithoutPromotions();
  }

  async findRTsWithoutPromotions() {
    this.rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        'promotions.1': {$exists: false},
        disabled: false
      },
      projection: {promotions: 1, name: 1, _id: 1},
    }, 3000);
  }

}
