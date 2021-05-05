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
  generalGmbOwners = [];
  specificGmbOwners = [];
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
        this.filtered = this.rts.filter(rt => !rt.googleListing || rt.googleListing.gmbOwner !== 'qmenu');
        break;
      case 'empty':
        this.filtered = this.rts.filter(rt => !rt.googleListing || !rt.googleListing.gmbOwner);
        break;
      default:
        this.filtered = this.rts.filter(rt => rt.googleListing && rt.googleListing.gmbOwner === this.gmbWebsiteOwner);
        break;
    }
  }

  async query() {
    const rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        $or: [{disabled: false}, {disabled: {$exists: false}}]
      },
      projection: {'googleListing.gmbOwner': 1, name: 1, _id: 1, 'promotions.expiry': 1},
    }, 3000);

    this.rts = rts.filter(rt => {
      return !rt.promotions || !rt.promotions.length
        || (rt.promotions.every(p => p.expiry && new Date(p.expiry).valueOf() < Date.now()));
    });

    const generalCountMap = {empty: 0, qmenu: 0, unknown: 0};
    const specificCountMap = {};

    this.rts.forEach(rt => {
      if (rt.googleListing && rt.googleListing.gmbOwner) {
        const {gmbOwner} = rt.googleListing;
        if (generalCountMap.hasOwnProperty(gmbOwner)) {
          generalCountMap[gmbOwner]++;
        } else {
          specificCountMap[gmbOwner] = (specificCountMap[gmbOwner] || 0) + 1;
        }
      } else {
        generalCountMap.empty += 1;
      }
    });

    this.generalGmbOwners = [
      {owner: 'qmenu', count: generalCountMap.qmenu},
      {owner: 'not-qmenu', count: this.rts.length - generalCountMap.qmenu},
      {owner: 'unknown', count: generalCountMap.unknown},
      {owner: 'empty', count: generalCountMap.empty}
    ];

    this.specificGmbOwners = Object.keys(specificCountMap).map(k => ({
      owner: k,
      count: specificCountMap[k]
    })).sort((oc1, oc2) => oc2.count - oc1.count);

    this.gmbWebsiteOwner = '';
    this.filter();
  }

}
