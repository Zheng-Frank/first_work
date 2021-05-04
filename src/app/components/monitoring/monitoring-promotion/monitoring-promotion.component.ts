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
  gmbWebsiteOwner = '';
  gmbOwnerAndCounts = [];
  filtered: Restaurant[] = [];

  ngOnInit() {
    this.query();
  }


  filter() {
    switch (this.gmbWebsiteOwner) {
      case '':
        this.filtered = this.rts;
        break;
      case 'not-qmenu':
        this.filtered = this.rts.filter(rt => rt.googleListing.gmbOwner !== 'qmenu');
        break;
      default:
        this.filtered = this.rts.filter(rt => rt.googleListing.gmbOwner === this.gmbWebsiteOwner);
        break;
    }
  }

  async query() {
    this.rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        'promotions.0': {$exists: false},
        $or: [{disabled: false}, {disabled: {$exists: false}}]
      },
      projection: {'googleListing.gmbOwner': 1, name: 1, _id: 1},
    }, 3000);

    const gmbOwnerCountMap = {};

    this.rts.forEach(rt => {
      if (rt.googleListing && rt.googleListing.gmbOwner) {
        gmbOwnerCountMap[rt.googleListing.gmbOwner] = (gmbOwnerCountMap[rt.googleListing.gmbOwner] || 0) + 1;
      }
    });

    this.gmbOwnerAndCounts = Object.keys(gmbOwnerCountMap).map(k => ({
      owner: k,
      count: gmbOwnerCountMap[k]
    })).sort((oc1, oc2) => oc1.owner > oc2.owner ? 1 : -1);

    this.gmbWebsiteOwner = '';
    this.filter();
  }

}
