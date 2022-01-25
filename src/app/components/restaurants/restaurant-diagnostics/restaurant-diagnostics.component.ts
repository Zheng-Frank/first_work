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
  users;
  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) { }

  async ngOnInit() {
    this.users = await this._global.getCachedUserList();
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
    let firstRT = restaurants.map(rt => rt.diagnostics)[0]; // first restaurant's first diagnostics
    this.diagnostics = firstRT ? firstRT[0] : {};
    // don't show diagnostics about rate schedules, if rt has fee schedules settings
    if (this.restaurant.feeSchedules) {
      this.diagnostics.result = (this.diagnostics.result || []).filter(r => r.name !== 'rate-schedules');
    }
    // and show add a diagnostic about sales person independently
    if (this.hasNotSalesAgent(this.restaurant.rateSchedules)) {
      (this.diagnostics.result || []).push({
        name: 'sales-agent',
        errors: [`hasn't sales agent`]
      });
    }
  }
  // judge rt whether has a suitable salesperson
  hasNotSalesAgent(rateSchedules) {
    return !rateSchedules.some(rateSchedule => this.users.some(u => u.username === rateSchedule.agent && !u.disabled));
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
