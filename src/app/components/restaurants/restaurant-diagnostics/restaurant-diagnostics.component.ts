import { Component, OnInit, Input, SimpleChanges } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from '../../../services/api.service';
import { GlobalService } from '../../../services/global.service';
import { environment } from "../../../../environments/environment";
import { AlertType } from '../../../classes/alert-type';
import { Gmb3Service } from 'src/app/services/gmb3.service';
@Component({
  selector: 'app-restaurant-diagnostics',
  templateUrl: './restaurant-diagnostics.component.html',
  styleUrls: ['./restaurant-diagnostics.component.css']
})
export class RestaurantDiagnosticsComponent implements OnInit {

  @Input() restaurant: Restaurant;

  apiRequesting = false;
  now = new Date();

  diagnostics;

  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) { }

  ngOnInit() {
  }

  async ngOnChanges(changes: SimpleChanges) {
    this.populate();
  }

  async populate() {
    if (!this.restaurant) {
      return;
    }

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: { $oid: this.restaurant.id || this.restaurant['_id'] }
      },
      projection: {
        diagnostics: 1
      },
      limit: 1
    }).toPromise();
    this.diagnostics = restaurants.map(rt => rt.diagnostics)[0][0]; // first restaurant's first diagnostics
  }

  async diagnose() {
    try {
      await this._api.post(environment.appApiUrl + 'utils/diagnose-restaurant', { _id: this.restaurant._id }).toPromise();
      this.populate();
    } catch (error) {
      console.log(error);
      this._global.publishAlert(AlertType.Danger, 'Error');
    }
  }

}
