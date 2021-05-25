import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {environment} from '../../../../environments/environment';
import {AlertType} from '../../../classes/alert-type';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {Promotion, Restaurant} from '@qmenu/ui';

@Component({
  selector: 'app-coupon-import',
  templateUrl: './coupon-import.component.html',
  styleUrls: ['./coupon-import.component.css']
})
export class CouponImportComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  @Input() restaurant: Restaurant;
  @ViewChild('importModal') importModal;
  @Input() visible = false;
  loading = false;
  @Output() close = new EventEmitter();
  checkedCoupons = [];
  providers = [{label: 'Beyond Menu', name: 'beyondmenu'}];
  provider = '';
  coupons = [];
  failedTypes = ['Pickup', 'Delivery'];

  ngOnInit() {
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

  getProviderName() {
    const p = this.providers.find(x => x.name === this.provider);
    return p ? p.label : '';
  }

  getFreeItem(item) {
    return [item.menu.name, item.mc.name, item.mi.name].join('>');
  }

  async crawl() {
    if (!this.provider) {
      this._global.publishAlert(AlertType.Danger, 'Please select a provider first!');
      return;
    }

    try {
      this._global.publishAlert(AlertType.Info, 'Crawling...');
      const {coupons, error, failedTypes} = await this._api.post(environment.appApiUrl + 'utils/menu', {
        name: 'crawl-coupon',
        payload: {
          restaurantId: this.restaurant._id,
          providerName: this.provider,
        }
      }).toPromise();
      if (error) {
        this._global.publishAlert(AlertType.Danger, error);
        return;
      }
      this.coupons = coupons;
      this.failedTypes = failedTypes;
      this.importModal.show();
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving promotions');
    }
    this.loading = false;

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
    this.loading = false;

  }

}
