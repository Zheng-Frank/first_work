import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { GmbBiz } from '../../../classes/gmb/gmb-biz';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
@Component({
  selector: 'app-restaurant-gmb',
  templateUrl: './restaurant-gmb.component.html',
  styleUrls: ['./restaurant-gmb.component.css']
})
export class RestaurantGmbComponent implements OnInit {

  @Input() restaurant: Restaurant;
  gmbs = [];

  apiRequesting = false;

  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (this.restaurant) {
      this.gmbs = await this._api.get(environment.adminApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          qmenuId: this.restaurant['_id'] || this.restaurant.id
        }
      }).toPromise();

    }
  }

  async matchOrCreateGmb() {
    this.apiRequesting = true;
    let crawledResult;
    try {
      crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", { q: [this.restaurant.name, this.restaurant.googleAddress.formatted_address].join(" ") }).toPromise();
    }
    catch (error) {
      // try to use only city state and zip code!
      // "#4, 6201 Whittier Boulevard, Los Angeles, CA 90022" -->  Los Angeles, CA 90022
      const addressTokens = this.restaurant.googleAddress.formatted_address.split(", ");
      const q = this.restaurant.name + ' ' + addressTokens[addressTokens.length - 2] + ', ' + addressTokens[addressTokens.length - 1];
      try {
        crawledResult = await this._api.get(environment.adminApiUrl + "utils/scan-gmb", { q: q }).toPromise();
      } catch (error) { }
    }

    this.apiRequesting = false;

    // see if such GMB's already existed!
    if (!crawledResult) {
      return this._global.publishAlert(AlertType.Danger, 'Failed to find a google listing of the restaurant!');
    }

    this.apiRequesting = true;
    const existingGmbs = await this._api.get(environment.adminApiUrl + 'generic', {
      resource: 'gmbBiz',
      query: {
        "$or": [
          {
            qmenuId: this.restaurant['_id'] || this.restaurant.id
          }, {
            place_id: crawledResult.place_id
          }
        ]
      }
    }).toPromise();
    this.apiRequesting = false;
    if (existingGmbs.length > 0) {
      return this._global.publishAlert(AlertType.Success, 'Matched existing GMB!');
    }

    console.log(crawledResult);

  }

  getLastOwnership(gmbBiz: GmbBiz) {
    return (gmbBiz.gmbOwnerships || []).slice(-1)[0] || {};
  }


}
