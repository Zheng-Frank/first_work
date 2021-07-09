import {Input, ViewChild} from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import {AlertType} from '../../../classes/alert-type';
import {ApiService} from '../../../services/api.service';
import {GlobalService} from '../../../services/global.service';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-restaurant-seo-tracking',
  templateUrl: './restaurant-seo-tracking.component.html',
  styleUrls: ['./restaurant-seo-tracking.component.css']
})
export class RestaurantSeoTrackingComponent implements OnInit {

  @Input() restaurant: Restaurant;
  @ViewChild('scrapeModal') scrapeModal;
  specificColumnDescriptors = [
    {
      label: 'Provider'
    },
    {
      label: 'Old Ranking',
    },
    {
      label: 'New Ranking',
    }
  ];
  specificRankingRows = [];
  filterSpecificRankingRows = [];
  ranks = [];

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  async scrape() {
    try {
      this._global.publishAlert(AlertType.Info, 'Scraping...');
      const ranks = await this._api.post(environment.appApiUrl + 'utils/menu', {
        name: 'google-rank',
        payload: {
          restaurantId: this.restaurant._id,
        }
      }).toPromise();
      this.ranks = ranks;
      this.scrapeModal.show();
      this._global.publishAlert(AlertType.Success, 'Google ranks scraped!');
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error on retrieving promotions');
    }
  }
}
