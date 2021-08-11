import {Component, OnInit, ViewChild} from '@angular/core';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';
import {Promotion, Restaurant} from '@qmenu/ui';
import {AlertType} from '../../../classes/alert-type';

@Component({
  selector: 'app-monitoring-promotion',
  templateUrl: './monitoring-promotion.component.html',
  styleUrls: ['./monitoring-promotion.component.css']
})
export class MonitoringPromotionComponent implements OnInit {


  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  @ViewChild('importModal') importModal;
  @ViewChild('validateModal') validateModal;
  rts: Restaurant[] = [];
  restaurant: Restaurant = null;
  gmbWebsiteOwner = '';
  generalGmbOwners = [];
  majorCompetitorGmbOwners = [];
  minorCompetitorGmbOwners = [];
  filtered: Restaurant[] = [];
  coupons = [];
  checkedCoupons = [];
  failedTypes = [];
  scrapedOnly = false;
  competitorSites = [];

  ngOnInit() {
    this.query();
  }

  getFreeItem(item) {
    return [item.menu.name, item.mc.name, item.mi.name].join('>');
  }

  async crawl(rt) {
    try {
      this._global.publishAlert(AlertType.Info, 'Crawling...');
      const {coupons, error, failedTypes} = await this._api.post(environment.appApiUrl + 'utils/menu', {
        name: 'crawl-coupon',
        payload: {
          restaurantId: rt._id,
          providerName: 'beyondmenu',
        }
      }).toPromise();
      if (error) {
        this._global.publishAlert(AlertType.Danger, error);
        return;
      }
      this.restaurant = rt;
      this.coupons = coupons;
      this.failedTypes = failedTypes;
      this.importModal.show();
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving promotions');
    }
  }

  checkCoupon(e) {
    let {target: {value}} = e;
    if (value === 'all') {
      if (this.checkedCoupons.length === this.coupons.length) {
        // already checked all, uncheck all
        this.checkedCoupons = [];
      } else {
        this.checkedCoupons = this.coupons.map(x => x.id);
      }
    } else {
      value = Number(value);
      const index = this.checkedCoupons.indexOf(value);
      if (index >= 0) {
        this.checkedCoupons.splice(index, 1);
      } else {
        this.checkedCoupons.push(value);
      }
    }
    // @ts-ignore
    document.getElementById('check-all-coupons').indeterminate = this.checkedCoupons.length
      && this.checkedCoupons.length < this.coupons.length;
  }

  async update() {

    try {
      this._global.publishAlert(AlertType.Info, 'Update promotions...');

      let {promotions} = this.restaurant;
      promotions = promotions || [];
      const newPromotions = [...promotions, ...this.coupons.filter(x => this.checkedCoupons.includes(x.id))];

      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {_id: this.restaurant['_id'], promotions},
        new: {_id: this.restaurant['_id'], promotions: newPromotions}
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Promotions updated success!');
      this.importModal.hide();
      this.checkedCoupons = [];
      // @ts-ignore
      document.getElementById('check-all-coupons').indeterminate = false;
      this.restaurant.promotions = newPromotions.map(x => new Promotion(x));
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving menus');
    }

  }

  validate(rt) {
    this.restaurant = rt;
    this.refreshCompetitorSites(rt);
    this.validateModal.show();
  }

  sortedPromotions(promotions) {
    return promotions.sort((x, y) => {
      return x.name > y.name ? 1 : (x.name < y.name ? -1 : 0);
    });
  }

  refreshCompetitorSites(rt) {
    if (!rt) {
      this.competitorSites = [];
      return;
    }
    let competitors = {};
    const Providers = {BeyondMenu: 'beyondmenu', CMO: 'chinesemenuonline'};
    rt.promotions.forEach(p => {
      if (p.source && !competitors[p.source]) {
        let provider = rt.providers.find(x => x.name === Providers[p.source]);
        if (provider) {
          competitors[p.source] = provider.url;
        }
      }
    });
    this.competitorSites = Object.entries(competitors).map(([k, v]) => ({name: k, url: v}));
  }

  closeModal(modal) {
    modal.hide();
    this.restaurant = null;
    this.coupons = [];
    this.checkedCoupons = [];
    this.failedTypes = [];
  }

  async updatePromotion(old) {
    try {
      this._global.publishAlert(AlertType.Info, 'Update promotion...');
      const {_id, promotions} = this.restaurant;
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
        old: {_id, old}, new: {_id, promotions}
      }]).toPromise();
      this._global.publishAlert(AlertType.Success, 'Promotions updated success!');
      this.stat(this.rts);
    } catch (error) {
      // if error, restore promotions
      this.restaurant.promotions = old;
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving menus');
    }
  }

  async approve(promotion) {
    let {promotions} = this.restaurant;
    promotions = JSON.parse(JSON.stringify(promotions));
    promotion.source = undefined;
    promotion.expiry = undefined;
    await this.updatePromotion(promotions);
  }

  async reject(promotion: Promotion) {
    let {promotions} = this.restaurant;
    promotions = JSON.parse(JSON.stringify(promotions));
    const index = promotions.findIndex(x => x.id === promotion.id);
    this.restaurant.promotions.splice(index, 1);
    await this.updatePromotion(promotions);
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
    if (this.scrapedOnly) {
      // @ts-ignore
      this.filtered = this.filtered.filter(x => x.promotions && x.promotions.some(p => !!p.source));
    }
  }

  stat(rts) {
    this.rts = rts.filter(rt => {
      return !rt.promotions || !rt.promotions.length
        || rt.promotions.some(x => !!x.source)
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

    const competitors = Object.keys(specificCountMap).map(k => ({
      owner: k,
      count: specificCountMap[k]
    })).sort((oc1, oc2) => oc2.count - oc1.count);

    this.majorCompetitorGmbOwners = competitors.filter(x => x.count > 100).sort((x, y) => y.count - x.count);
    this.minorCompetitorGmbOwners = competitors.filter(x => x.count <= 100).sort((x, y) => x.owner > y.owner ? 1 : -1);

    this.gmbWebsiteOwner = '';
    this.filter();
  }

  async query() {
    const rts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        $or: [{disabled: false}, {disabled: {$exists: false}}]
      },
      projection: {'googleListing.gmbOwner': 1, name: 1, _id: 1, promotions: 1, providers: 1},
    }, 3000);

    this.stat(rts);
  }

}
