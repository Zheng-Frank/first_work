import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
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

  @Input() visible = false;
  @Input() timezone;
  loading = false;
  @Output() close = new EventEmitter();

  providers = [];
  providerUrl = '';
  coupons = [];

  ngOnInit() {
  }


  async populateProviders() {
    // this.loading = true;
  }

  async crawl(synchronously = false) {

    this.loading = true;
    try {
      this._global.publishAlert(AlertType.Info, 'crawling...');
      if (synchronously) {
        const crawledRestaurant = await this._api.post(environment.appApiUrl + 'utils/coupon', {
          name: 'crawl',
          payload: {
            url: this.providerUrl,
            timezone: this.timezone
          }
        }).toPromise();
        this._global.publishAlert(AlertType.Info, 'updating...');
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: {
            _id: this.restaurant._id
          }, new: {
            _id: this.restaurant._id,
            menus: crawledRestaurant.menus,
            menuOptions: crawledRestaurant.menuOptions
          }
        }]).toPromise();

        this._global.publishAlert(AlertType.Info, 'injecting images...');
        await this._api.post(environment.appApiUrl + 'utils/menu', {
          name: 'inject-images',
          payload: {
            restaurantId: this.restaurant._id,
          }
        }).toPromise();
        this._global.publishAlert(AlertType.Info, 'All done!');
        this.menusChanged.emit();
      } else {
        await this._api.post(environment.appApiUrl + 'events',
          [{
            queueUrl: `https://sqs.us-east-1.amazonaws.com/449043523134/events-v3`,
            event: {name: 'populate-menus', params: {restaurantId: this.restaurant._id, url: this.providerUrl}}
          }]
        ).toPromise();
        alert('Started in background. Refresh in about 1 minute or come back later to check if menus are crawled successfully.');
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
