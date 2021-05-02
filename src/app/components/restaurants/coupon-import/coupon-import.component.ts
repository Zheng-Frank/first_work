import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {environment} from '../../../../environments/environment';
import {AlertType} from '../../../classes/alert-type';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';

@Component({
  selector: 'app-coupon-import',
  templateUrl: './coupon-import.component.html',
  styleUrls: ['./coupon-import.component.css']
})
export class CouponImportComponent implements OnInit {

  constructor(private _api: ApiService, private _global: GlobalService) {
  }

  @ViewChild('importModal') importModal;
  @Input() visible = false;
  loading = false;
  @Output() close = new EventEmitter();

  providers = [
    {name: 'Beyond Menu'},
    {name: 'Chinese Menu Online'}
  ];
  providerUrl = '';
  coupons = [
    {
      'id': 1619691518355,
      'name': '10% Off w Purchase of $5 or More',
      'freeItemList': [],
      'excludedOrderTypes': ['Delivery'],
      'excludedPlatforms': [],
      'orderMinimum': 5
    },
    {
      'id': 1619691517920,
      'name': 'Free Egg Roll w Purchase of $20 or More',
      'freeItemList': ['Egg Roll'],
      'excludedOrderTypes': [],
      'excludedPlatforms': [],
      'orderMinimum': 20
    },
    {
      'id': 1619691517989,
      'name': 'Free Cream Cheese Puff w Purchase of $20 or More',
      'freeItemList': ['Cream Cheese Puff'],
      'excludedOrderTypes': [],
      'excludedPlatforms': [],
      'orderMinimum': 20
    }
  ];

  ngOnInit() {
  }

  doImport() {
    console.log('do import...');
  }


  async populateProviders() {
    // this.loading = true;
  }

  async crawl(synchronously = false) {

    this.importModal.show();
    return;

    this.loading = true;
    try {
      this._global.publishAlert(AlertType.Info, 'crawling...');
      if (synchronously) {
        this.coupons = await this._api.post(environment.appApiUrl + 'utils/coupon', {
          name: 'crawl',
          payload: {
            url: this.providerUrl,
          }
        }).toPromise();
      }
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving menus');
    }
    this.loading = false;

  }

  async update() {

  }

}
